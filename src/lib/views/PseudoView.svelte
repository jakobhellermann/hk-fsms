<script lang="ts">
	import type { FsmModel, Param } from '$lib/model';
	import { fmtValue, short } from '$lib/fmt';

	let { model }: { model: FsmModel } = $props();

	// compact one-line arg list for an action: `name=value, …`
	function args(params: Param[]): string {
		return params
			.map((p) => {
				const v = fmtValue(p.value);
				return p.name ? `${p.name}=${v}` : v;
			})
			.join(', ');
	}
</script>

<div class="code">
	<div><span class="kw">fsm</span> <span class="name">{model.name}</span> {'{'}</div>
	<div class="i1"><span class="kw">start</span> <span class="state">{model.start_state}</span></div>
	{#each model.global_transitions as t (t.event + t.to_state)}
		<div class="i1">
			<span class="kw">on</span> <span class="event">{t.event}</span>
			<span class="arrow">→</span>
			<span class="state">{t.to_state}</span> <span class="cmt">// from any state</span>
		</div>
	{/each}

	{#each model.states as s (s.name)}
		<div class="blank"></div>
		<div class="i1"><span class="kw">state</span> <span class="state">{s.name}</span> {'{'}</div>
		{#each s.actions as a, i (i)}
			<div class="i2" class:off={!a.enabled}>
				<span class="act">{short(a.class)}</span>(<span class="args">{args(a.params)}</span
				>){#if !a.enabled}<span class="cmt"> // disabled</span>{/if}
			</div>
		{/each}
		{#each s.transitions as t (t.event + t.to_state)}
			<div class="i2">
				<span class="kw">on</span> <span class="event">{t.event}</span>
				<span class="arrow">→</span>
				<span class="state">{t.to_state}</span>
			</div>
		{/each}
		<div class="i1">{'}'}</div>
	{/each}
	<div>{'}'}</div>
</div>

<style>
	.code {
		padding: 1rem 1.25rem 3rem;
		font-family: ui-monospace, Menlo, monospace;
		font-size: 13px;
		line-height: 1.6;
	}
	.code > div {
		white-space: pre-wrap;
		word-break: break-word;
	}
	.i1 {
		padding-left: 2ch;
	}
	.i2 {
		padding-left: 4ch;
		text-indent: -2ch;
		margin-left: 2ch;
	}
	.blank {
		height: 0.6rem;
	}
	.kw {
		color: #c678dd;
	}
	.name {
		color: var(--fg);
		font-weight: 600;
	}
	.act {
		color: var(--action);
	}
	.args {
		color: var(--fg);
	}
	.event {
		color: var(--event);
	}
	.state {
		color: var(--state);
	}
	.arrow,
	.cmt {
		color: var(--dim);
	}
	.off {
		opacity: 0.55;
	}
</style>
