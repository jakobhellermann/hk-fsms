/** Single source of truth for game identity in the frontend. */

export type Game = 'hk' | 'ss';

export const GAMES: { id: Game; label: string }[] = [
	{ id: 'hk', label: 'Hollow Knight' },
	{ id: 'ss', label: 'Silksong' }
];

export const DEFAULT_GAME: Game = 'ss';

const GAME_IDS = new Set(GAMES.map((g) => g.id));

export function isGame(s: string | null): s is Game {
	return s !== null && GAME_IDS.has(s as Game);
}
