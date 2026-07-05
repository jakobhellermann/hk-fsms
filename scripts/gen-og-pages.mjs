// Post-build step: emit a real `build/<game>/<scene>/<...>/index.html` for each curated favorite,
// with FSM-specific OpenGraph/description meta baked into the head. Non-favorite FSM URLs keep using
// the SPA 404 fallback (generic card). Crawlers don't run JS, so per-FSM link previews only work if
// the tags are already in the served HTML — hence these static stubs. Humans still get the normal
// SPA shell (it boots and client-routes to the FSM exactly like the fallback).
//
// Run automatically after `vite build` (see package.json "build"). Favorites are loaded from the TS
// source via Vite's ssrLoadModule so this stays the single source of truth.

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { createServer } from 'vite';

const SITE = 'https://jakobhellermann.github.io/hk-fsms';
const BUILD = 'build';
const DATA = 'static/data';

// --- load curated favorites from the TS source (Vite resolves TS + extensionless imports) ---
const server = await createServer({
	configFile: false,
	logLevel: 'error',
	appType: 'custom',
	server: { middlewareMode: true },
	optimizeDeps: { noDiscovery: true }
});
let GAMES;
try {
	({ GAMES } = await server.ssrLoadModule(path.resolve('src/lib/config.ts')));
} finally {
	await server.close();
}

// --- mirror of data.ts/model.ts (kept in sync by hand; both are tiny and pure) ---
const fsmKey = (e) => `${e.file}\0${e.game_object}\0${e.name}`;
function fsmSegments(entries, e) {
	const group = entries.filter((x) => fsmKey(x) === fsmKey(e));
	const ord = group.indexOf(e);
	const name = ord > 0 ? `${e.name}:${ord}` : e.name;
	const go = e.game_object ? e.game_object.split('/') : [];
	return [e.file, ...go, name];
}
const expandIndex = (raw) =>
	raw.e.map(([fi, name, game_object, hash], id) => ({ id, file: raw.f[fi], name, game_object, hash }));

const esc = (s) =>
	s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// replace a meta tag's content in the shell (matches the generic tags app.html already emits), or
// append it before </head> if absent. `\s+` tolerates app.html's multi-line/pretty-printed tags.
function setMeta(html, attr, key, value) {
	const re = new RegExp(`(<meta\\s+${attr}="${key}"\\s+content=")[^"]*(")`);
	if (re.test(html)) return html.replace(re, `$1${esc(value)}$2`);
	return html.replace('</head>', `\t\t<meta ${attr}="${key}" content="${esc(value)}" />\n\t</head>`);
}
// drop a meta tag entirely (single- or multi-line form)
function removeMeta(html, attr, key) {
	return html.replace(new RegExp(`\\s*<meta\\s+${attr}="${key}"[\\s\\S]*?/>`), '');
}
function setTitle(html, value) {
	if (/<title>[^<]*<\/title>/.test(html)) return html.replace(/<title>[^<]*<\/title>/, `<title>${esc(value)}</title>`);
	return html.replace('</head>', `\t\t<title>${esc(value)}</title>\n\t</head>`);
}

const shellPath = path.join(BUILD, 'index.html');
if (!existsSync(shellPath)) {
	console.error(`gen-og-pages: ${shellPath} missing — run \`vite build\` first. Skipping.`);
	process.exit(0);
}
const shell = await readFile(shellPath, 'utf8');

let generated = 0;
const skipped = [];
for (const g of GAMES) {
	const favorites = g.favorites ?? [];
	if (!favorites.length) continue;
	const indexPath = path.join(DATA, g.id, 'index.json');
	if (!existsSync(indexPath)) {
		console.warn(`gen-og-pages: ${indexPath} missing (data not unpacked?) — skipping ${g.id}`);
		continue;
	}
	const entries = expandIndex(JSON.parse(await readFile(indexPath, 'utf8')));
	// (scene display names not needed — favorite cards show just the name)
	
	for (const f of favorites) {
		let segments;
		let fsmHash = null;
		if (f.fsm) {
			const e = entries.find(
				(x) => x.file === f.file && x.game_object === (f.game_object ?? '') && x.name === f.fsm
			);
			if (!e) {
				skipped.push(`${g.id}/${f.name} (fsm not found)`);
				continue;
			}
			segments = fsmSegments(entries, e);
				fsmHash = e.hash;
		} else {
			if (!entries.some((x) => x.file === f.file)) {
				skipped.push(`${g.id}/${f.name} (scene empty)`);
				continue;
			}
			segments = [f.file];
		}

		const route = [g.id, ...segments]; // decoded segments = on-disk dir names GH Pages resolves to
		const urlPath = route.map(encodeURIComponent).join('/');
		const url = `${SITE}/${urlPath}${f.mode ? `?mode=${f.mode}` : ''}`;

		// the card is just the boss/FSM name — the surrounding site name + graph image carry the rest;
		// a description only duplicates it (esp. when the link is posted in a themed Discord), so drop it
		let html = shell;
		html = setTitle(html, f.name);
		html = setMeta(html, 'property', 'og:title', f.name);
		html = setMeta(html, 'property', 'og:url', url);
		html = removeMeta(html, 'name', 'description');
		html = removeMeta(html, 'property', 'og:description');
		// a favorite that resolves to a single FSM points its og:image at the pre-rendered state graph
		// (1200×630, from gen-og-graphs.mjs); scene-only favorites keep the square summary icon
		const graphPng = fsmHash ? path.join('static', 'og', `graph-${fsmHash}.png`) : null;
		if (graphPng && existsSync(graphPng)) {
			html = setMeta(html, 'property', 'og:image', `${SITE}/og/graph-${fsmHash}.png`);
			html = setMeta(html, 'property', 'og:image:width', '1200');
			html = setMeta(html, 'property', 'og:image:height', '630');
			html = setMeta(html, 'name', 'twitter:card', 'summary_large_image');
		}

		const dir = path.join(BUILD, ...route);
		await mkdir(dir, { recursive: true });
		await writeFile(path.join(dir, 'index.html'), html);
		generated++;
	}
}

console.log(`gen-og-pages: wrote ${generated} favorite OG page(s)` + (skipped.length ? `, skipped ${skipped.length}: ${skipped.join(', ')}` : ''));
