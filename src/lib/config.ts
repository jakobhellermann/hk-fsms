/** Single source of truth for game identity in the frontend. */
import { hkFavorites } from './favorites/hk';
import { ssFavorites } from './favorites/ss';

export type Game = 'hk' | 'ss';

/**
 * A curated quick-link to a specific FSM, shown above the scene list on the main page (e.g. named
 * bosses). Identified by the same identity fields as an `IndexEntry` (minus the hash) so it survives
 * re-indexing; the page resolves it against the loaded index to build the URL.
 */
export type Favorite = {
	/** display name, e.g. the boss's in-game name */
	name: string;
	/** the scene/bundle file (the `[scene]` URL segment) */
	file: string;
	/** GameObject hierarchy path of the FSM component; omit (with `fsm`) to link to the scene tree */
	game_object?: string;
	/** FSM (PlayMakerFSM) name; omit to link to the scene/bundle tree instead of a single FSM */
	fsm?: string;
	/** optional view mode (`?mode=`), e.g. 'graph' */
	mode?: string;
};

export type GameDef = { id: Game; label: string; favorites?: Favorite[] };

export const GAMES: GameDef[] = [
	{ id: 'hk', label: 'Hollow Knight', favorites: hkFavorites },
	{ id: 'ss', label: 'Silksong', favorites: ssFavorites }
];

export const DEFAULT_GAME: Game = 'ss';

const GAME_IDS = new Set(GAMES.map((g) => g.id));

export function isGame(s: string | null): s is Game {
	return s !== null && GAME_IDS.has(s as Game);
}

/** curated favorites for a game (empty if none) */
export function favoritesFor(game: Game): Favorite[] {
	return GAMES.find((g) => g.id === game)?.favorites ?? [];
}
