<script lang="ts">
	import { fmtCallValue } from '$lib/fmt';
	import type { FsmModel } from '$lib/model';
	import type { Tooltips } from '$lib/tooltips';
	import { anchorFragment, anchorUrl, copyText, resolveAnchor, type FsmAnchor } from '$lib/anchor';
	import StateBody from './StateBody.svelte';

	let { model, tooltips = {} }: { model: FsmModel; tooltips?: Tooltips } = $props();

	let root = $state<HTMLElement>();
	let flash = $state<FsmAnchor | null>(null);

	/** flash a state header (action null) or an action line, clearing itself after the animation */
	function flashAnchor(a: FsmAnchor) {
		flash = a;
		setTimeout(() => {
			if (flash === a) flash = null;
		}, 1600);
	}

	/** scroll to a state's `state X {` definition block (goto-definition) */
	function goto(name: string) {
		const el = root?.querySelector(`[data-state="${CSS.escape(name)}"]`);
		if (el instanceof HTMLElement) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			flashAnchor({ state: name, action: null });
		}
	}

	/** deep-link (`#Init/7`): scroll to the anchored action line and flash it; if the action
	 * index no longer exists (stale link, out of range), degrade to the state header — and flash
	 * that, so the fallback still gives feedback */
	function applyAnchor() {
		const a = resolveAnchor(
			model.states.map((s) => s.name),
			location.hash
		);
		if (!a) return;
		const line =
			a.action == null
				? null
				: root?.querySelector(`[data-anchor="${CSS.escape(`${a.state}/${a.action}`)}"]`);
		const el = line ?? root?.querySelector(`[data-state="${CSS.escape(a.state)}"]`);
		if (!(el instanceof HTMLElement)) return;
		el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		flashAnchor(line ? a : { state: a.state, action: null });
	}

	/** copy a permalink (`#State/N`, or `#State` for a state) and make the address bar carry it */
	function linkAnchor(state: string, action: number | null) {
		const a: FsmAnchor = { state, action };
		const url = anchorUrl('pseudo', anchorFragment(state, action));
		history.replaceState(history.state, '', url);
		void copyText(url);
		flashAnchor(a);
	}

	// apply a deep-link anchor once the model has rendered — effects run after the DOM update, so
	// the targeted line already exists; re-runs when navigating to a different FSM (new model)
	$effect(() => {
		void model;
		applyAnchor();
	});

	/** Ctrl+A inside the code block selects only the code, not the whole page */
	function onSelectAll(e: KeyboardEvent) {
		if (!(e.ctrlKey || e.metaKey) || e.key !== 'a') return;
		e.preventDefault();
		const sel = getSelection();
		if (!sel || !root) return;
		const range = document.createRange();
		range.selectNodeContents(root);
		sel.removeAllRanges();
		sel.addRange(range);
	}
</script>

{#snippet stateRef(name: string)}
	{#if name}
		<span
			class="state link"
			role="button"
			tabindex="0"
			onclick={() => goto(name)}
			onkeydown={(e) => e.key === 'Enter' && goto(name)}>{name}</span
		>
	{:else}
		<span class="cmt">(none)</span>
	{/if}
{/snippet}

<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div
	class="code"
	bind:this={root}
	tabindex="0"
	role="region"
	aria-label="pseudocode"
	onkeydown={onSelectAll}
>
	{#if !model.enabled}
		<div class="cmt">// component disabled: this FSM does not run until something enables it</div>
	{/if}
	{#if model.template_name}
		<div class="cmt">// uses template: {model.template_name}</div>
	{/if}
	<div><span class="kw">fsm</span> <span class="name">{model.name}</span> {'{'}</div>
	<div class="i1"><span class="kw">start</span> {@render stateRef(model.start_state)}</div>

	{#each model.global_transitions as t (t.event + t.to_state)}
		<div class="i1">
			<span class="kw">on</span> <span class="event">{t.event}</span>
			<span class="arrow">-></span>
			{@render stateRef(t.to_state)} <span class="cmt">// from any state</span>
		</div>
	{/each}

	{#each model.states as s (s.name)}
		<div class="blank"></div>
		<div
			class="i1 shead"
			data-state={s.name}
			class:flash={flash?.state === s.name && flash.action == null}
		>
			<!-- gutter after the text (see StateBody): the code renders with white-space: pre-wrap, so
			     markup whitespace is significant and would shift `state X {` right if it came first -->
			<span class="kw">{s.is_sequence ? 'sequence state' : 'state'}</span>
			<span class="state">{s.name}</span>
			{'{'}<button
				class="anch"
				title="copy link to this state"
				aria-label="copy link to state {s.name}"
				onclick={() => linkAnchor(s.name, null)}
			></button>
		</div>
		<StateBody
			state={s}
			{model}
			{tooltips}
			onnavigate={goto}
			onanchor={linkAnchor}
			indent={4}
			flash={flash?.state === s.name ? flash.action : null}
		/>
		<div class="i1">{'}'}</div>
	{/each}

	<!-- inspector-exposed first, in their own paragraph: those are the ones an
	     instance of a template can set, so they are where two instances differ -->
	{#each [true, false] as exposed (exposed)}
		{@const group = model.variables.filter((v) => v.show_in_inspector === exposed)}
		{#if group.length}
			<div class="blank"></div>
			{#each group as v (v.category + v.name)}
				<div class="i1">
					<span class="kw">var</span> <span class="var">{v.name}</span><span class="cmt"
						>: {v.category} =</span
					>
					{fmtCallValue(v.value)}
				</div>
			{/each}
		{/if}
	{/each}
	<div>{'}'}</div>
</div>

<!-- re-apply when the hash is edited in the address bar; the initial deep link is applied by the
     effect in the script above. Pure hash changes don't go through the SvelteKit router
     (page.url goes stale), so listen natively. -->
<svelte:window onhashchange={applyAnchor} />

<style>
	.code {
		padding: 1rem var(--pad-x) 3rem;
		font-family: ui-monospace, Menlo, monospace;
		font-size: 14px;
		line-height: 1.65;
	}
	.code > div {
		white-space: pre-wrap;
		word-break: break-word;
	}
	.i1 {
		padding-left: 2ch;
	}
	/* state-header permalink: same gutter column as the action `#`s — the button spans the 2ch
	   indent (up to the `state` keyword), so hovering/clicking anywhere there copies the link; the
	   `#` itself sits at the strip's left edge, clear of the text */
	.shead {
		position: relative;
	}
	.shead .anch {
		position: absolute;
		left: 0;
		width: 2ch;
		top: 0;
		bottom: 0;
	}
	.anch {
		padding: 0;
		border: none;
		background: none;
		color: var(--dim);
		font: inherit;
		text-align: left;
		cursor: pointer;
		user-select: none;
		opacity: 0;
	}
	.anch::before {
		content: '#';
	}
	.anch:hover,
	.anch:focus-visible {
		opacity: 1;
	}
	.anch:hover {
		color: var(--accent);
	}
	.blank {
		height: 0.6rem;
	}
	.kw {
		color: #c678dd;
	}
	.var {
		color: #9d8fb5;
	}
	.name {
		color: var(--fg);
		font-weight: 600;
	}
	.event {
		color: var(--event);
	}
	.state {
		color: var(--state);
		font-weight: 600;
	}
	.link {
		cursor: pointer;
	}
	.link:hover {
		text-decoration: underline;
	}
	.arrow,
	.cmt {
		color: var(--dim);
	}
	@keyframes flash {
		0% {
			background: color-mix(in srgb, var(--state) 30%, transparent);
		}
		100% {
			background: transparent;
		}
	}
	/* highlight bar starting at the `state` keyword — the div's own background would tint the 2ch
	   indent before the text as well (see StateBody for the z-index dance) */
	.flash {
		z-index: 0;
	}
	.flash::before {
		content: '';
		position: absolute;
		z-index: -1;
		top: 0;
		bottom: 0;
		left: 2ch;
		right: 0;
		border-radius: 2px;
		animation: flash 1.6s ease-out;
	}
</style>
