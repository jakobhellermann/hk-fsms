import { base } from '$app/paths';
import { expandIndex, type CompactIndex, type FsmModel, type IndexEntry } from './model';
export { type Game, type Favorite, GAMES, DEFAULT_GAME, isGame, favoritesFor } from './config';
import { type Game } from './config';

// scene-name display/grouping helpers live in `scenes.ts` (kept free of `$app` so they're unit-testable)
export { sceneLabel } from './scenes';

/** leaf name of a `/`-separated GameObject hierarchy path */
export function goLeaf(path: string): string {
	return path === '' ? '(scene root)' : (path.split('/').pop() ?? path);
}

export async function fetchIndex(game: Game): Promise<IndexEntry[]> {
	const r = await fetch(`${base}/data/${game}/index.json`);
	if (!r.ok) throw new Error(`index ${game}: ${r.status}`);
	return expandIndex((await r.json()) as CompactIndex);
}

// scene name per file (levelN → "Cliffs_03", bundle → "Dust_01"). Files without a scene
// (sharedassets, resources.assets, non-scene bundles) simply have no entry.
export async function fetchSceneNames(game: Game): Promise<Map<string, string>> {
	const r = await fetch(`${base}/data/${game}/scenes.json`);
	if (!r.ok) throw new Error(`scene names ${game}: ${r.status}`);
	const j = (await r.json()) as Record<string, string>;
	return new Map(Object.entries(j));
}

// FSMs are addressed by their tree path — `[scene, ...gameObject, name]` — and resolved to a content
// hash here, so the internal hash never appears in the URL. The rare case of several FSM components
// on one GameObject sharing a name is disambiguated with a `:n` ordinal on the name (first one bare).

const fsmKey = (e: IndexEntry) => `${e.file}\0${e.game_object}\0${e.name}`;

/** path segments after the game for an entry: `[scene, ...gameObject parts, name(+":n" on collision)]` */
export function fsmSegments(entries: IndexEntry[], e: IndexEntry): string[] {
	const group = entries.filter((x) => fsmKey(x) === fsmKey(e));
	const ord = group.indexOf(e);
	const name = ord > 0 ? `${e.name}:${ord}` : e.name;
	const go = e.game_object ? e.game_object.split('/') : [];
	return [e.file, ...go, name];
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

export async function fetchModel(game: Game, hash: string): Promise<FsmModel> {
	const r = await fetch(`${base}/data/${game}/content/${hash}.json`);
	if (!r.ok) throw new Error(`model ${hash}: ${r.status}`);
	return r.json();
}
