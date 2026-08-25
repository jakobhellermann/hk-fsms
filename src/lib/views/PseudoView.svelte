<script lang="ts">
	import { fmtCallValue } from '$lib/fmt';
	import type { FsmModel } from '$lib/model';
	import type { Tooltips } from '$lib/tooltips';
	import StateBody from './StateBody.svelte';

	let { model, tooltips = {} }: { model: FsmModel; tooltips?: Tooltips } = $props();

	let root = $state<HTMLElement>();
	let flash = $state<string | null>(null);

	/** scroll to a state's `state X {` definition block (goto-definition) */
	function goto(name: string) {
		const el = root?.querySelector(`[data-state="${CSS.escape(name)}"]`);
		if (el instanceof HTMLElement) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
			flash = name;
			setTimeout(() => {
				if (flash === name) flash = null;
			}, 1500);
		}
	}

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
		<div class="i1" data-state={s.name} class:flash={flash === s.name}>
			<span class="kw">state</span> <span class="state">{s.name}</span>
			{'{'}
		</div>
		<StateBody state={s} {model} {tooltips} onnavigate={goto} indent={4} />
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
	.flash {
		animation: flash 1.5s ease-out;
		border-radius: 2px;
	}
</style>
