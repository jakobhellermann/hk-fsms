import { parseGameRef } from '$lib/data';
import { source } from '$lib/source/source.svelte';
import type { PageLoad } from './$types';

// dynamic param route: served via the SPA fallback, not prerendered
export const prerender = false;

export const load: PageLoad = async ({ params, depends }) => {
	depends('source:build');
	const { game } = parseGameRef(params.game);
	return { game, source: await source.open(game, params.cls) };
};
