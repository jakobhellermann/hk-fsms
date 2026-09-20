import { describe, expect, it } from 'vitest';
import { anchorFragment, anchorUrl, resolveAnchor } from './anchor';

describe('anchorFragment', () => {
	it('encodes the state name and appends the 1-based action index', () => {
		expect(anchorFragment('Init', 7)).toBe('Init/7');
		expect(anchorFragment('Mage Lord 2', 1)).toBe('Mage%20Lord%202/1');
	});

	it('encodes slashes inside the state name so the separator stays literal', () => {
		// canonical: only the final `/2` is the action index
		expect(anchorFragment('Cancel Lag/Tag', 2)).toBe('Cancel%20Lag%2FTag/2');
	});

	it('omits the index for a state-only anchor', () => {
		expect(anchorFragment('Idle', null)).toBe('Idle');
	});

	it('handles degenerate names (empty, digits, `:`)', () => {
		expect(anchorFragment('', 3)).toBe('/3');
		expect(anchorFragment('All Done :)', 1)).toBe('All%20Done%20%3A)/1');
	});
});

describe('resolveAnchor', () => {
	const names = ['Init', 'Idle', 'Mage Lord 2', 'Cancel Lag/Tag', '', 'Init 2'];

	it('resolves a state + action anchor', () => {
		expect(resolveAnchor(names, '#Init/7')).toEqual({ state: 'Init', action: 7 });
		expect(resolveAnchor(names, '#Init/0')).toEqual({ state: 'Init', action: 0 });
	});

	it('resolves a state-only anchor', () => {
		expect(resolveAnchor(names, '#Mage%20Lord%202')).toEqual({
			state: 'Mage Lord 2',
			action: null
		});
	});

	it('decodes the state name', () => {
		expect(resolveAnchor(names, '#Mage%20Lord%202/1')).toEqual({ state: 'Mage Lord 2', action: 1 });
	});

	it('separates on the last slash, so manual links with literal `/` in the name work', () => {
		expect(resolveAnchor(names, '#Cancel%20Lag/Tag/2')).toEqual({
			state: 'Cancel Lag/Tag',
			action: 2
		});
	});

	it('also accepts the canonical %2F encoding', () => {
		expect(resolveAnchor(names, '#Cancel%20Lag%2FTag/2')).toEqual({
			state: 'Cancel Lag/Tag',
			action: 2
		});
	});

	it('prefers a real state name ending in /<digits> over splitting it', () => {
		// no state `Init` beyond the ones listed, but `Init 2` exists as a state
		expect(resolveAnchor(['Init 2'], '#Init%202/3')).toEqual({ state: 'Init 2', action: 3 });
		// a fragment that is exactly a state name ending in `/digits` resolves state-only
		expect(resolveAnchor(['X/3'], '#X/3')).toEqual({ state: 'X/3', action: null });
		// real state with that name wins over the split reading
		expect(resolveAnchor(['X', 'X/3'], '#X/3')).toEqual({ state: 'X/3', action: null });
		expect(resolveAnchor(['X/3', 'X'], '#X/4')).toEqual({ state: 'X', action: 4 });
	});

	it('resolves the empty state name with an action', () => {
		expect(resolveAnchor(names, '#/3')).toEqual({ state: '', action: 3 });
	});

	it('returns null for non-anchors', () => {
		expect(resolveAnchor(names, '')).toBeNull();
		expect(resolveAnchor(names, '#')).toBeNull();
		expect(resolveAnchor(names, '#Nope/1')).toBeNull();
		expect(resolveAnchor(names, '#Nope')).toBeNull();
		expect(resolveAnchor(['Init'], '#Init')).toEqual({ state: 'Init', action: null });
	});

	it('takes malformed percent sequences literally', () => {
		expect(resolveAnchor(['100%'], '#100%25')).toEqual({ state: '100%', action: null });
		expect(resolveAnchor(['a%zb'], '#a%zb')).toEqual({ state: 'a%zb', action: null });
	});
});

describe('anchorUrl', () => {
	it('pins the mode, drops ?state= and sets the fragment', () => {
		expect(anchorUrl('pseudo', 'Init/7', 'https://x.dev/hk/level461/Mage%20Lord%202')).toBe(
			'https://x.dev/hk/level461/Mage%20Lord%202?mode=pseudo#Init/7'
		);
		expect(
			anchorUrl(
				'graph',
				'Idle/4',
				'https://x.dev/hk/level461/Mage%20Lord%202?state=Init&mode=pseudo'
			)
		).toBe('https://x.dev/hk/level461/Mage%20Lord%202?mode=graph#Idle/4');
	});

	it('keeps unrelated query params and overwrites an existing fragment', () => {
		expect(anchorUrl('raw', 'A/1', 'https://x.dev/base/ss/scn/Obj/FSM?foo=1&state=X#old')).toBe(
			'https://x.dev/base/ss/scn/Obj/FSM?foo=1&mode=raw#A/1'
		);
	});
});
