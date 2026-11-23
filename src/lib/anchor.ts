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
 *
 * A global transition anchors as `#on/<event>`, e.g. `#on/HERO%20DAMAGED`; when the FSM has several
 * global transitions on the same event (real in the data: one live + one dead entry), the emitted
 * fragment appends the target (`#on/STUN/Check%20Facing`). The resolver accepts both forms: an
 * event-only fragment resolves to the first transition on that event.
 */

export type FsmAnchor = {
	state: string;
	/** 1-based action index within the state; `null` = the state itself */
	action: number | null;
};

/** a global transition, resolved to its concrete entry (first one on the event for `#on/<event>`) */
export type GlobalAnchor = { event: string; target: string };

/** minimal shape of the model's global transitions, so anchor.ts stays model-agnostic */
type GlobalTransition = { event: string; to_state: string };

/** fragment (without leading `#`) for a state's nth action (1-based) — or the state when n is null */
export function anchorFragment(state: string, action: number | null): string {
	const name = encodeURIComponent(state);
	return action == null ? name : `${name}/${action}`;
}

/** fragment for a global transition: `on/<event>`. The target is appended only when the FSM has
 * several global transitions on that event, so the usual (unambiguous) link stays short. */
export function globalFragment(globals: GlobalTransition[], t: GlobalTransition): string {
	const event = encodeURIComponent(t.event);
	const dup = globals.filter((g) => g.event === t.event).length > 1;
	return dup ? `on/${event}/${encodeURIComponent(t.to_state)}` : `on/${event}`;
}

function decode(s: string): string {
	try {
		return decodeURIComponent(s);
	} catch {
		return s; // malformed % sequence — take it literally
	}
}

/**
 * Resolve a URL hash (`#Init/7`, `#on/HERO%20DAMAGED`) against a model's state names and global
 * transitions. Returns `null` for anything that isn't an anchor. The whole fragment is tried as a
 * state name first — a state may itself be named `X/3`, and a manually typed link to it should not
 * read as "action 3 of X" (canonical links avoid the ambiguity entirely by encoding the name's own
 * `/` as `%2F`). State anchors win over global ones by the same rule: a state named `on` captures
 * `#on/…` fragments before the global grammar applies.
 */
export function resolveAnchor(
	stateNames: string[],
	globals: GlobalTransition[],
	hash: string
): FsmAnchor | GlobalAnchor | null {
	const raw = hash.replace(/^#/, '');
	if (!raw) return null;
	const whole = decode(raw);
	if (stateNames.includes(whole)) return { state: whole, action: null };
	const m = raw.match(/\/(\d+)$/);
	if (m) {
		const state = decode(raw.slice(0, -m[0].length));
		if (stateNames.includes(state)) return { state, action: Number(m[1]) };
	}
	if (raw.startsWith('on/')) {
		const rest = raw.slice(3);
		const sep = rest.indexOf('/'); // events never contain `/` in the data, so the first one separates
		const event = decode(sep < 0 ? rest : rest.slice(0, sep));
		const target = sep < 0 ? null : decode(rest.slice(sep + 1));
		const t = globals.find((g) => g.event === event && (target == null || g.to_state === target));
		return t ? { event: t.event, target: t.to_state } : null;
	}
	return null;
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
