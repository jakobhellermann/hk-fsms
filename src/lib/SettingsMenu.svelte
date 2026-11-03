<script lang="ts">
	import type { Snippet } from 'svelte';

	// a ⚙ toggle with a dropdown below it, closed by a pointer down anywhere outside
	let { label, children }: { label: string; children: Snippet } = $props();

	let open = $state(false);
	let root = $state<HTMLElement>();
	function closeOnOutside(e: PointerEvent) {
		if (open && e.target instanceof Node && !root?.contains(e.target)) open = false;
	}
</script>

<svelte:window onpointerdown={closeOnOutside} />

<div class="menu" bind:this={root}>
	<button
		class="toggle"
		class:active={open}
		aria-label={label}
		aria-expanded={open}
		onclick={() => (open = !open)}>⚙</button
	>
	{#if open}
		<div class="dropdown">{@render children()}</div>
	{/if}
</div>

<style>
	.menu {
		position: relative;
	}
	.toggle {
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--panel);
		color: var(--fg);
		border: 1px solid #333;
		border-radius: 4px;
		width: 28px;
		height: 26px;
		cursor: pointer;
	}
	.toggle.active {
		border-color: var(--accent);
		color: var(--accent);
	}
	.dropdown {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 0;
		z-index: 3; /* above canvases and panels */
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.6rem;
		padding: 0.6rem;
		background: var(--panel);
		border: 1px solid #333;
		border-radius: 4px;
		white-space: nowrap;
	}
	.dropdown :global(label) {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		font-size: 0.8rem;
		color: var(--dim);
		cursor: pointer;
	}
</style>
