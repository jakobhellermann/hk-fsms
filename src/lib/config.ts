/** Single source of truth for game identity in the frontend. */
import { hkFavorites } from './favorites/hk';
import { ssFavorites } from './favorites/ss';
import indexerConfig from '../../indexer/config.json';

export type Game = 'hk' | 'ss';

/**
 * A curated quick-link to a specific FSM, shown above the scene list on the main page (e.g. named
 * bosses). Identified by the same identity fields as an `IndexEntry` (minus the hash) so it survives
 * re-indexing; the page resolves it against the loaded index to build the URL.
 */
export type Favorite = {
	/** display name, e.g. the boss's in-game name */
	name: string;
	/** the `[scene]` URL segment: a scene name (stable across versions), or the file label of a file without one */
	scene: string;
	/** GameObject hierarchy path of the FSM component; omit (with `fsm`) to link to the scene tree */
	game_object?: string;
	/** FSM (PlayMakerFSM) name; omit to link to the scene/bundle tree instead of a single FSM */
	fsm?: string;
	/** optional view mode (`?mode=`), e.g. 'graph' */
	mode?: string;
	/** per game version: where the FSM lives in versions that place it elsewhere */
	overrides?: Record<string, Pick<Favorite, 'scene' | 'game_object'>>;
};

export type GameDef = { id: Game; label: string; short: string; favorites?: Favorite[] };

export const GAMES: GameDef[] = [
	{ id: 'hk', label: 'Hollow Knight', short: 'HK', favorites: hkFavorites },
	{ id: 'ss', label: 'Silksong', short: 'SS', favorites: ssFavorites }
];

export const DEFAULT_GAME: Game = 'ss';

const GAME_IDS = new Set(GAMES.map((g) => g.id));

export function isGame(s: string | null): s is Game {
	return s !== null && GAME_IDS.has(s as Game);
}

/** indexed versions of a game, oldest first */
export function versionsFor(game: Game): string[] {
	const g = indexerConfig.games.find((g) => g.slug === game);
	if (!g) throw new Error(`${game} is missing from indexer/config.json`);
	return g.versions.map((v) => v.version);
}

/** curated favorites for a game at a version (empty if none), with that version's overrides applied */
export function favoritesFor(game: Game, version: string): Favorite[] {
	const favorites = GAMES.find((g) => g.id === game)?.favorites ?? [];
	return favorites.map((f) => ({ ...f, ...f.overrides?.[version] }));
}
