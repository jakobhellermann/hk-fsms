/**
 * In-FSM permalink anchors: a URL fragment `#<state-name>/<n>` points at the nth action (1-based)
 * of a state — e.g. `…/Mage%20Lord%202#Init/7`. Anchors are semantic (state + action index), not
 * line numbers: the URL identifies the FSM by tree path, so its content silently changes with game
 * updates and indexer releases — a global line number would then point at a *different* action,
 * while a state+index anchor only breaks (visibly, falling back to the state) when the state itself
 * changes.
 *
 * State names can contain spaces, `/` (`Cancel Lag/Tag`), `:` (`All Done :)`) and even be empty, so
 * the name is percent-encoded and only the *last* `/<digits>` run of the fragment is the action
 * index — `#Cancel%20Lag/Tag/2` anchors action 2 of state `Cancel Lag/Tag`. Canonical links (built
 * by {@link anchorFragment}) encode the name's own slashes as `%2F`, keeping the separator literal.
 */

export type FsmAnchor = {
	state: string;
	/** 1-based action index within the state; `null` = the state itself */
	action: number | null;
};

/** fragment (without leading `#`) for a state's nth action (1-based) — or the state when n is null */
export function anchorFragment(state: string, action: number | null): string {
	const name = encodeURIComponent(state);
	return action == null ? name : `${name}/${action}`;
}

function decode(s: string): string {
	try {
		return decodeURIComponent(s);
	} catch {
		return s; // malformed % sequence — take it literally
	}
}

/**
 * Resolve a URL hash (`#Init/7`) against a model's state names. Returns `null` for anything that
 * isn't an anchor. The whole fragment is tried as a state name first — a state may itself be named
 * `X/3`, and a manually typed link to it should not read as "action 3 of X" (canonical links
 * avoid the ambiguity entirely by encoding the name's own `/` as `%2F`).
 */
export function resolveAnchor(stateNames: string[], hash: string): FsmAnchor | null {
	const raw = hash.replace(/^#/, '');
	if (!raw) return null;
	const whole = decode(raw);
	if (stateNames.includes(whole)) return { state: whole, action: null };
	const m = raw.match(/\/(\d+)$/);
	if (!m) return null;
	const state = decode(raw.slice(0, -m[0].length));
	return stateNames.includes(state) ? { state, action: Number(m[1]) } : null;
}

/**
 * Full URL of a permalink: current path and query, minus the graph view's `?state=` (the anchor
 * supersedes it), plus `?mode=` (so the receiver sees the view the sender linked from) and the
 * anchor fragment. `href` defaults to the current page; pass a string for testing.
 */
export function anchorUrl(mode: string, fragment: string, href = location.href): string {
	const u = new URL(href);
	u.searchParams.delete('state');
	u.searchParams.set('mode', mode);
	u.hash = `#${fragment}`;
	return u.href;
}

/**
 * Copy to the clipboard, falling back to the legacy `execCommand` path when the async clipboard API
 * is unavailable (non-secure contexts — e.g. `pnpm dev --host` reached over plain-LAN http).
 */
export async function copyText(text: string): Promise<boolean> {
	try {
		await navigator.clipboard.writeText(text);
		return true;
	} catch {
		const ta = document.createElement('textarea');
		ta.value = text;
		ta.style.position = 'fixed';
		ta.style.opacity = '0';
		document.body.appendChild(ta);
		try {
			ta.select();
			return document.execCommand('copy');
		} finally {
			ta.remove();
		}
	}
}
