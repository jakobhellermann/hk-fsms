<script lang="ts">
	import type { FsmModel } from '$lib/model';
	import type { Tooltips } from '$lib/tooltips';
	import { fmtCallValue, short } from '$lib/fmt';
	import { glossary } from '$lib/glossary';
	import { anchorFragment, anchorUrl, copyText, resolveAnchor, type FsmAnchor } from '$lib/anchor';
	import ParamRow from '$lib/ParamRow.svelte';

	let { model, tooltips = {} }: { model: FsmModel; tooltips?: Tooltips } = $props();

	// variable name → formatted authored default, for the hover on `var "X"` references in params
	const varDefaults = $derived(
		new Map(model.variables.map((v) => [v.name, fmtCallValue(v.value)]))
	);

	// `#State/N` permalinks (see anchor.ts): deep-link scroll+flash, and per-action copy buttons
	let statesEl = $state<HTMLElement>();
	let flash = $state<FsmAnchor | null>(null);
	function flashAnchor(a: FsmAnchor) {
		flash = a;
		setTimeout(() => {
			if (flash === a) flash = null;
		}, 1600);
	}
	function applyAnchor() {
		const a = resolveAnchor(
			model.states.map((s) => s.name),
			location.hash
		);
		if (!a) return;
		// action line first, degrading to the state block when the action index no longer exists
		// (stale link, out of range) — flashing what was actually found
		const line =
			a.action == null
				? null
				: statesEl?.querySelector(`[data-anchor="${CSS.escape(`${a.state}/${a.action}`)}"]`);
		const el = line ?? statesEl?.querySelector(`[data-state="${CSS.escape(a.state)}"]`);
		if (el instanceof HTMLElement) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			flashAnchor(line ? a : { state: a.state, action: null });
		}
	}
	function linkAnchor(state: string, action: number | null) {
		const url = anchorUrl('raw', anchorFragment(state, action));
		history.replaceState(history.state, '', url);
		void copyText(url);
		flashAnchor({ state, action });
	}
	$effect(() => {
		void model;
		applyAnchor();
	});
</script>

<svelte:window onhashchange={applyAnchor} />

{#if model.events.length}
	<section>
		<h2>Events</h2>
		{#each model.events as e (e.name)}
			<div class="mono">
				<span class="event">{e.name}</span>
				{#if e.is_global}<span class="tag" title={glossary.global}>(global)</span>{/if}
				{#if e.is_system}<span class="tag" title={glossary.system}>(system)</span>{/if}
			</div>
		{/each}
	</section>
{/if}

{#if model.global_transitions.length}
	<section>
		<h2 title={glossary.globalTransitions}>Global transitions</h2>
		{#each model.global_transitions as t (t.event + t.to_state)}
			<div class="mono">
				on <span class="event">{t.event}</span> -> <span class="state">{t.to_state}</span>
			</div>
		{/each}
	</section>
{/if}

<section bind:this={statesEl}>
	<h2>States</h2>
	{#each model.states as s (s.name)}
		<div class="state-block" data-state={s.name}>
			<div class="state-head" class:flash={flash?.state === s.name && flash.action == null}>
				{#if s.is_start}<span class="dim" title={glossary.startState}>*</span>{/if}
				<span class="state">{s.name}</span><button
					class="anch"
					title="copy link to this state"
					aria-label="copy link to state {s.name}"
					onclick={() => linkAnchor(s.name, null)}
				></button>
			</div>
			{#each s.transitions as t (t.event + t.to_state)}
				<div class="mono trans">
					on <span class="event">{t.event}</span> -> <span class="state">{t.to_state}</span>
				</div>
			{/each}
			{#each s.actions as a, i (i)}
				{@const tip = tooltips[a.class]}
				<div
					class="action"
					class:disabled={!a.enabled}
					class:flash={flash?.state === s.name && flash.action === i + 1}
					data-anchor={`${s.name}/${i + 1}`}
				>
					<div class="action-head">
						<span class="act" class:help={tip?.tip} title={tip?.tip}>{short(a.class)}</span>
						{#if a.custom_name && a.custom_name !== short(a.class)}
							<span class="dim">"{a.custom_name}"</span>
						{/if}
						{#if !a.enabled}<span class="dim" title={glossary.disabled}>(disabled)</span
							>{/if}<button
							class="anch"
							title="copy link to this action"
							aria-label="copy link to {short(a.class)} in state {s.name}"
							onclick={() => linkAnchor(s.name, i + 1)}
						></button>
					</div>
					{#each a.params as p, j (j)}
						<ParamRow param={p} {varDefaults} help={tip?.params?.[p.name]} />
					{/each}
				</div>
			{/each}
		</div>
	{/each}
</section>

{#if model.variables.length}
	<section>
		<h2>Variables</h2>
		{#each model.variables as v (v.category + v.name)}
			<div class="mono">
				<span class="dim">({v.category})</span> <span class="var">{v.name}</span>
				<span class="dim">=</span>
				{fmtCallValue(v.value)}
			</div>
		{/each}
	</section>
{/if}

<style>
	h2 {
		font-size: 0.9rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--dim);
		margin: 1.5rem 0 0.5rem;
	}
	section {
		padding: 0 var(--pad-x);
	}
	.state-block {
		margin: 0.75rem 0;
	}
	.state-head {
		position: relative;
		font-weight: 600;
	}
	@keyframes flash {
		0% {
			background: color-mix(in srgb, var(--action) 30%, transparent);
		}
		100% {
			background: transparent;
		}
	}
	/* highlight bar flush with the text: a plain div background would tint the empty padding
	   before it as well (see StateBody for the z-index dance) */
	.flash {
		z-index: 0;
	}
	.flash::before {
		content: '';
		position: absolute;
		z-index: -1;
		top: 0;
		bottom: 0;
		left: 0;
		right: 0;
		border-radius: 2px;
		animation: flash 1.6s ease-out;
	}
	/* skip the action's border + padding so the bar starts at the action class name */
	.action.flash::before {
		left: 0.75rem;
	}
	.trans {
		padding-left: 1.5rem;
	}
	.action {
		position: relative;
		margin: 0.4rem 0 0.4rem 1rem;
		border-left: 2px solid #333;
		padding-left: 0.75rem;
	}
	.action.disabled {
		opacity: 0.5;
	}
	.action-head {
		font-family: ui-monospace, Menlo, monospace;
	}
	.anch {
		position: absolute;
		top: 0;
		bottom: 0;
		padding: 0;
		border: none;
		background: none;
		color: var(--dim);
		font: inherit;
		font-size: 0.85em;
		cursor: pointer;
		user-select: none;
		opacity: 0;
	}
	/* state heads sit at the section's content edge, so their `#` lives in the section's 8px
	   padding — the same column the action `#`s occupy */
	.state-head .anch {
		left: -8px;
		width: 8px;
	}
	/* CSS content, not DOM text, so selecting/copying the action rows never picks the `#` up */
	.anch::before {
		content: '#';
	}
	/* the button IS the gutter — it spans the whitespace left of the text (margin + border +
	   padding for action rows, the section padding strip for state heads), so the `#` only appears
	   and a click only fires when the pointer is in that strip, not when the row is crossed.
	   The `#` sits at the strip's left edge — the -24px/36px geometry keeps that edge (and thus
	   the glyph column) aligned with the state heads' 8px strip. */
	.action .anch {
		left: -24px;
		width: 36px;
	}
	.anch:hover,
	.anch:focus-visible {
		opacity: 1;
	}
	.anch:hover {
		color: var(--accent);
	}
	.tag {
		color: var(--dim);
		cursor: help;
		border-bottom: 1px dotted var(--dim);
	}
	.event {
		color: var(--event);
	}
	.state {
		color: var(--state);
	}
	.act {
		color: var(--action);
	}
	.act.help {
		cursor: help;
		border-bottom: 1px dotted color-mix(in srgb, var(--action) 55%, transparent);
	}
	.var {
		color: var(--var);
	}
</style>
