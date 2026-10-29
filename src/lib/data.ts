import { base } from '$app/paths';
import { expandIndex, type CompactIndex, type FsmModel, type IndexEntry } from './model';
export {
	type Game,
	type Favorite,
	GAMES,
	DEFAULT_GAME,
	isGame,
	favoritesFor,
	versionsFor
} from './config';
import { type Game, DEFAULT_GAME, isGame, versionsFor } from './config';
import type { Tooltips } from './tooltips';
export type { Tooltips, ActionTip } from './tooltips';

// scene-name display/grouping helpers live in `scenes.ts` (kept free of `$app` so they're unit-testable)
export { sceneLabel, sceneSegment, sceneFile } from './scenes';
import { sceneSegment, sceneFile } from './scenes';

/** leaf name of a `/`-separated GameObject hierarchy path */
export function goLeaf(path: string): string {
	return path === '' ? '(scene root)' : (path.split('/').pop() ?? path);
}

/**
 * Encode a value for a URL while keeping `/` as a real path separator. A scene/bundle file may
 * itself contain `/` (e.g. `scenes_scenes_scenes/foo.bundle`); we deliberately DON'T escape it to
 * `%2F` — GitHub Pages decodes `%2F` back to `/` anyway, and `resolveScenePath` reconstructs the
 * file from the segments — so linking with literal slashes keeps link, stub path and reload URL all
 * identical (no `%2F`, no decode/redirect surprises).
 */
export function encodePath(p: string): string {
	return p.split('/').map(encodeURIComponent).join('/');
}

/** A game at one of its indexed versions; `version: null` is the latest. */
export type GameRef = { game: Game; version: string | null };

/** Parse the `[game]` route segment: `hk` (latest version) or `hk-1.4.3.2`. */
export function parseGameRef(segment: string | undefined): GameRef {
	const s = segment ?? '';
	const dash = s.indexOf('-');
	const id = dash < 0 ? s : s.slice(0, dash);
	if (!isGame(id)) return { game: DEFAULT_GAME, version: null };
	return { game: id, version: dash < 0 ? null : s.slice(dash + 1) };
}

export function gameSegment(ref: GameRef): string {
	return ref.version === null ? ref.game : `${ref.game}-${ref.version}`;
}

/** data directory of a concrete version (resolving `null` to the latest) */
function versionDir(ref: GameRef): string {
	const versions = versionsFor(ref.game);
	const version = ref.version ?? versions.at(-1);
	if (version === undefined || !versions.includes(version))
		throw new Error(`unknown version ${gameSegment(ref)}`);
	return `${base}/data/${ref.game}/${version}`;
}

export async function fetchIndex(ref: GameRef): Promise<IndexEntry[]> {
	const r = await fetch(`${versionDir(ref)}/index.json`);
	if (!r.ok) throw new Error(`index ${gameSegment(ref)}: ${r.status}`);
	return expandIndex((await r.json()) as CompactIndex);
}

// scene name per file (levelN → "Cliffs_03", bundle → "Dust_01"). Files without a scene
// (sharedassets, resources.assets, non-scene bundles) simply have no entry.
export async function fetchSceneNames(ref: GameRef): Promise<Map<string, string>> {
	const r = await fetch(`${versionDir(ref)}/scenes.json`);
	if (!r.ok) throw new Error(`scene names ${gameSegment(ref)}: ${r.status}`);
	const j = (await r.json()) as Record<string, string>;
	return new Map(Object.entries(j));
}

// per-action `[Tooltip]` help text (class description + per-param). A game without an extracted
// tooltips.json (e.g. an IL2CPP build) simply yields an empty map, so the UI shows no tooltips.
export async function fetchTooltips(ref: GameRef): Promise<Tooltips> {
	const r = await fetch(`${versionDir(ref)}/tooltips.json`);
	if (!r.ok) return {};
	return (await r.json()) as Tooltips;
}

// FSMs are addressed by their tree path — `[scene, ...gameObject, name]` — and resolved to a content
// hash here, so the internal hash never appears in the URL. The rare case of several FSM components
// on one GameObject sharing a name is disambiguated with a `:n` ordinal on the name (first one bare).

const fsmKey = (e: IndexEntry) => `${e.file}\0${e.game_object}\0${e.name}`;

/** path segments after the game for an entry: `[scene, ...gameObject parts, name(+":n" on collision)]` */
export function fsmSegments(
	entries: IndexEntry[],
	sceneNames: Map<string, string>,
	e: IndexEntry
): string[] {
	const group = entries.filter((x) => fsmKey(x) === fsmKey(e));
	const ord = group.indexOf(e);
	const name = ord > 0 ? `${e.name}:${ord}` : e.name;
	const go = e.game_object ? e.game_object.split('/') : [];
	return [sceneSegment(sceneNames, e.file), ...go, name];
}

/** resolve a tree path (`rest` = `[...gameObject parts, name]`) within a scene back to its entry */
export function resolveFsm(
	entries: IndexEntry[],
	scene: string,
	rest: string[]
): IndexEntry | undefined {
	if (!rest.length) return undefined;
	const go = rest.slice(0, -1).join('/');
	const last = rest[rest.length - 1];
	// exact name first — covers the common (unique) case and FSM names that themselves contain ":n"
	const exact = entries.filter((e) => e.file === scene && e.game_object === go && e.name === last);
	if (exact.length) return exact[0];
	// otherwise the last segment carries a disambiguating ordinal
	const m = last.match(/^(.+):(\d+)$/);
	if (!m) return undefined;
	const group = entries.filter((e) => e.file === scene && e.game_object === go && e.name === m[1]);
	return group[Number(m[2])];
}

/**
 * Recover `[scene file, ...rest]` from route params. Old links use file labels, which may contain `/`
 * and so span several segments (e.g. Silksong `scenes_scenes_scenes/foo.bundle`).
 */
export function resolveScenePath(
	entries: IndexEntry[],
	sceneNames: Map<string, string>,
	sceneParam: string,
	restParam: string
): { scene: string; rest: string[] } {
	// filter empties: a trailing slash (GitHub Pages redirects `…/Control` → `…/Control/` for the
	// stub directory) would otherwise add an empty final segment, making resolveFsm look for name ""
	const restSegs = restParam ? restParam.split('/').filter(Boolean) : [];
	if (!sceneParam) return { scene: sceneParam, rest: restSegs };
	const named = sceneFile(sceneNames, sceneParam);
	if (named !== sceneParam) return { scene: named, rest: restSegs };
	const segs = [sceneParam, ...restSegs];
	const files = new Set(entries.map((e) => e.file));
	for (let i = 1; i <= segs.length; i++) {
		const candidate = segs.slice(0, i).join('/');
		if (files.has(candidate)) return { scene: candidate, rest: segs.slice(i) };
	}
	return { scene: sceneParam, rest: restSegs };
}

export async function fetchModel(game: Game, hash: string): Promise<FsmModel> {
	const r = await fetch(`${base}/data/${game}/content/${hash}.json`);
	if (!r.ok) throw new Error(`model ${hash}: ${r.status}`);
	return r.json();
}
