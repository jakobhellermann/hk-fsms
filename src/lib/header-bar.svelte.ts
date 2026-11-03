import { getContext, setContext, type Snippet } from 'svelte';

// A page can put a toolbar into the layout's sticky header, so it stays visible while scrolling
// without a second sticky element that would need the header's height.

const KEY = Symbol('header bar');

interface HeaderBarSlot {
	show(bar: Snippet): void;
	/** removes `bar` unless another one has replaced it meanwhile */
	hide(bar: Snippet): void;
}

/** For the layout: the toolbar the current page wants in the header. */
export function provideHeaderBar(): { readonly bar: Snippet | undefined } {
	let bar = $state<Snippet>();
	setContext<HeaderBarSlot>(KEY, {
		show: (next) => (bar = next),
		hide: (old) => {
			if (bar === old) bar = undefined;
		}
	});
	return {
		get bar() {
			return bar;
		}
	};
}

/** For a page: show `bar()` in the header while this component is mounted and it returns one. */
export function useHeaderBar(bar: () => Snippet | undefined) {
	const slot = getContext<HeaderBarSlot>(KEY);
	$effect(() => {
		const current = bar();
		if (!current) return;
		slot.show(current);
		return () => slot.hide(current);
	});
}
