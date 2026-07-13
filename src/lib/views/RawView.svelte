<script lang="ts">
	import type { FsmModel } from '$lib/model';
	import type { Tooltips } from '$lib/tooltips';
	import { fmtCallValue, short } from '$lib/fmt';
	import { glossary } from '$lib/glossary';
	import ParamRow from '$lib/ParamRow.svelte';

	let { model, tooltips = {} }: { model: FsmModel; tooltips?: Tooltips } = $props();

	// variable name → formatted authored default, for the hover on `var "X"` references in params
	const varDefaults = $derived(
		new Map(model.variables.map((v) => [v.name, fmtCallValue(v.value)]))
	);
</script>

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

<section>
	<h2>States</h2>
	{#each model.states as s (s.name)}
		<div class="state-block">
			<div class="state-head">
				{#if s.is_start}<span class="dim" title={glossary.startState}>*</span>{/if}
				<span class="state">{s.name}</span>
			</div>
			{#each s.transitions as t (t.event + t.to_state)}
				<div class="mono trans">
					on <span class="event">{t.event}</span> -> <span class="state">{t.to_state}</span>
				</div>
			{/each}
			{#each s.actions as a, i (i)}
				{@const tip = tooltips[a.class]}
				<div class="action" class:disabled={!a.enabled}>
					<div class="action-head">
						<span class="act" class:help={tip?.tip} title={tip?.tip}>{short(a.class)}</span>
						{#if a.custom_name && a.custom_name !== short(a.class)}
							<span class="dim">"{a.custom_name}"</span>
						{/if}
						{#if !a.enabled}<span class="dim" title={glossary.disabled}>(disabled)</span>{/if}
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
		font-weight: 600;
	}
	.trans {
		padding-left: 1.5rem;
	}
	.action {
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
