<script lang="ts">
	import type { Param } from './model';
	import { fmtValue, valueKind, varRefName } from './fmt';
	import Self from './ParamRow.svelte';

	let {
		param,
		depth = 0,
		varDefaults,
		help
	}: { param: Param; depth?: number; varDefaults?: Map<string, string>; help?: string } = $props();
	const isList = $derived(param.value.type === 'List');
	const text = $derived(fmtValue(param.value));
	// when the value is a `var "X"` reference, hover shows that variable's authored default
	const title = $derived.by(() => {
		const name = varRefName(text);
		const def = name == null ? undefined : varDefaults?.get(name);
		return def == null ? undefined : `= ${def}`;
	});
</script>

<div class="row" style="padding-left: {depth * 1.25}rem">
	<span class="name" class:help title={help}>{param.name || '·'}</span>
	<span class="dim">: {param.type_name} =</span>
	<span class="val {valueKind(param.value)}" {title}>{text}</span>
</div>
{#if isList && param.value.type === 'List'}
	{#each param.value.value as child, i (i)}
		<Self param={child} depth={depth + 1} {varDefaults} />
	{/each}
{/if}

<style>
	.row {
		font-family: ui-monospace, Menlo, monospace;
		line-height: 1.5;
		white-space: pre-wrap;
	}
	.name {
		color: var(--fg);
	}
	.name.help {
		cursor: help;
		border-bottom: 1px dotted var(--dim);
	}
	.val.var {
		color: var(--var);
	}
	.val.event {
		color: var(--event);
	}
</style>
