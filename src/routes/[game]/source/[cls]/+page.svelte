<script lang="ts">
	import { invalidate } from '$app/navigation';
	import { segmentLines, type DecompiledType } from 'ilspy-wasm-cache';
	import { source } from '$lib/source/source.svelte';
	import type { PageProps } from './$types';

	let { data, params }: PageProps = $props();

	let error = $state<string | null>(null);
	let dragDepth = $state(0);
	let picker = $state<HTMLInputElement>();

	const status = $derived(source.status);

	function lines(type: DecompiledType) {
		// anchor id per member line, so `#OnEnter` jumps to it
		const anchors = new Map(type.members.toReversed().map((m) => [m.line, m.name]));
		return segmentLines(type).map((segments, i) => ({ segments, id: anchors.get(i + 1) }));
	}

	function scrollToHash(_: HTMLElement) {
		if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
	}

	const carriesFiles = (e: DragEvent) => e.dataTransfer?.types.includes('Files') ?? false;

	async function addAssemblies(from: DataTransfer | FileList) {
		error = null;
		try {
			await source.drop(from, data.game);
			await invalidate('source:build');
		} catch (e) {
			error = String(e);
		}
	}

	function ondrop(e: DragEvent) {
		if (!carriesFiles(e) || !e.dataTransfer) return;
		e.preventDefault();
		dragDepth = 0;
		void addAssemblies(e.dataTransfer);
	}

	function onpick(e: Event) {
		const files = (e.currentTarget as HTMLInputElement).files;
		if (files) void addAssemblies(files);
	}
</script>

<svelte:window
	ondragenter={(e) => carriesFiles(e) && dragDepth++}
	ondragleave={(e) => carriesFiles(e) && (dragDepth = Math.max(0, dragDepth - 1))}
	ondragover={(e) => carriesFiles(e) && e.preventDefault()}
	{ondrop}
/>

{#if dragDepth}
	<div class="drop">drop the game's Managed folder to decompile its source</div>
{/if}

<div class="source">
	<div class="head">
		<h1>
			{params.cls}
			{#if status.phase !== 'idle'}
				<span class="dim">{status.phase}…</span>
			{/if}
		</h1>
		{#if data.source.picked}
			<button onclick={() => picker?.click()}>pick source</button>
			<input bind:this={picker} type="file" webkitdirectory hidden onchange={onpick} />
		{/if}
	</div>
	{#if error}
		<p class="err">{error}</p>
	{:else if data.source.type === null}
		<div class="prompt">
			<p>
				The source needs to be decompiled from the game assemblies. Drop the
				<code>hollow_knight_Data/Managed</code> folder anywhere on the page.
			</p>
			<input type="file" webkitdirectory onchange={onpick} />
		</div>
	{:else}
		{#await data.source.type then type}
			<pre use:scrollToHash>{#each lines(type) as line, i (i)}<div
						class="ln"
						id={line.id}>{#each line.segments as s, j (j)}{#if s.kind}<span class="t-{s.kind}"
									>{s.text}</span
								>{:else}{s.text}{/if}{/each}</div>{/each}</pre>
		{:catch e}
			<p class="err">{e}</p>
		{/await}
	{/if}
</div>

<style>
	.source {
		padding: 0 var(--pad-x) 2rem;
	}
	.head {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}
	.head button {
		margin-left: auto;
		flex-shrink: 0;
		background: var(--panel);
		color: var(--fg);
		border: 1px solid #333;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
	}
	h1 {
		font-size: 1rem;
		font-weight: 600;
		word-break: break-all;
	}
	.dim {
		color: var(--dim);
		font-weight: normal;
	}
	.err {
		color: #e06c75;
	}
	.prompt code {
		color: var(--fg);
	}
	pre {
		margin: 0;
		font-size: 0.8rem;
		tab-size: 4;
		counter-reset: ln;
		overflow-x: auto;
	}
	.ln {
		counter-increment: ln;
		scroll-margin-top: 30vh;
	}
	.ln::before {
		content: counter(ln);
		display: inline-block;
		width: 5ch;
		margin-right: 1.5ch;
		text-align: right;
		color: var(--dim);
		user-select: none;
	}
	.ln:target {
		background: var(--panel);
	}
	.t-keyword {
		color: #c678dd;
	}
	.t-type {
		color: var(--state);
	}
	.t-method {
		color: var(--action);
	}
	.t-member {
		color: #9d8fb5;
	}
	.t-string {
		color: #cd9178;
	}
	.t-number {
		color: var(--event);
	}
	.t-comment {
		color: var(--dim);
	}
	.drop {
		position: fixed;
		inset: 0;
		z-index: 10;
		display: flex;
		align-items: center;
		justify-content: center;
		background: rgb(20 20 23 / 0.85);
		border: 3px dashed var(--accent);
		pointer-events: none;
	}
</style>
