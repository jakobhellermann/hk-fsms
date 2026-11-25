import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { decompilerAssets } from './src/lib/source/vite';

export default defineConfig({
	define: {
		'import.meta.env.ENABLE_COLLIDERS': JSON.stringify(process.env.ENABLE_COLLIDERS === '1')
	},
	plugins: [
		decompilerAssets(),
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// SPA mode: detail pages are loaded client-side, so a fallback is served for
			// any route that isn't prerendered. `base` lets the site live in a GH Pages subdir.
			adapter: adapter({ fallback: '404.html' }),
			paths: {
				base: process.argv.includes('dev')
					? ''
					: ((process.env.BASE_PATH ?? '') as '' | `/${string}`),
				// absolute (base-prefixed) asset URLs, not relative — the SPA fallback and the
				// generated favorite OG stubs (scripts/gen-og-pages.mjs) live at varying depths and
				// must load /_app from the site root regardless of their path depth.
				relative: false
			}
		})
	]
});
