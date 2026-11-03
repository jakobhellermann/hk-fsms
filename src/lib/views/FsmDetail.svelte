<script lang="ts">
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createQuery } from '@tanstack/svelte-query';
	import {
		fetchHierarchy,
		fetchModel,
		fetchTooltips,
		type GameRef,
		keepWithinGame
	} from '$lib/data';
	import RawView from '$lib/views/RawView.svelte';
	import PseudoView from '$lib/views/PseudoView.svelte';
	import GraphView from '$lib/views/GraphView.svelte';
	import CollidersView from '$lib/views/CollidersView.svelte';
	import SettingsMenu from '$lib/SettingsMenu.svelte';
	import { viewSettings } from '$lib/settings.svelte';
	import { setContext } from 'svelte';
	import { COLLIDER_LINKS, type ColliderLinks, nodePaths } from '$lib/colliders';

	let {
		gameRef,
		hash,
		hierarchy,
		owner
	}: { gameRef: GameRef; hash: string; hierarchy: string | null; owner: string } = $props();

	// links from actions to the colliders view, with the referenced objects selected. The hierarchy
	// (shared with the colliders view's query) tells which references have colliders to show.
	const colliderTargets = $derived(page.url.searchParams.getAll('collider'));
	const hierarchyQuery = createQuery(() => ({
		queryKey: ['hierarchy', gameRef.game, hierarchy],
		queryFn: () => fetchHierarchy(gameRef.game, hierarchy!),
		enabled: hierarchy !== null,
		staleTime: Infinity
	}));
	const linkable = $derived(
		hierarchyQuery.data && hierarchy !== null
			? nodePaths(hierarchyQuery.data, owner)
			: new Set<string>()
	);
	setContext<ColliderLinks>(COLLIDER_LINKS, {
		get owner() {
			return owner;
		},
		known: (target) => linkable.has(target.endsWith('/*') ? target.slice(0, -2) : target),
		href: (targets) => {
			const p = new URLSearchParams(page.url.searchParams);
			p.set('mode', 'colliders');
			p.delete('collider');
			for (const t of targets) p.append('collider', t);
			return `${page.url.pathname}?${p}`;
		}
	});

	type Mode = 'raw' | 'pseudo' | 'graph' | 'colliders';
	const MODES: { id: Mode; label: string }[] = [
		{ id: 'graph', label: 'graph' },
		{ id: 'pseudo', label: 'pseudocode' },
		{ id: 'raw', label: 'raw' },
		{ id: 'colliders', label: 'colliders' }
	];
	const isMode = (s: string | null): s is Mode =>
		s === 'raw' || s === 'pseudo' || s === 'graph' || s === 'colliders';

	// view mode is a global preference (localStorage), overridable per-FSM via ?mode=
	const STORAGE_KEY = 'fsm:view-mode';
	let stored = $state<Mode>('graph');
	if (browser && isMode(localStorage.getItem(STORAGE_KEY)))
		stored = localStorage.getItem(STORAGE_KEY) as Mode;
	const urlMode = $derived(page.url.searchParams.get('mode'));
	// FSMs whose owner has no collider data offer no colliders mode
	const modes = $derived(hierarchy === null ? MODES.filter((m) => m.id !== 'colliders') : MODES);
	const mode = $derived.by<Mode>(() => {
		const m = isMode(urlMode) ? urlMode : stored;
		return m === 'colliders' && hierarchy === null ? 'graph' : m;
	});
	$effect(() => {
		// following a collider link is a one-off visit, not a new preferred mode
		if (browser && isMode(urlMode) && urlMode !== stored && !colliderTargets.length) {
			stored = urlMode;
			localStorage.setItem(STORAGE_KEY, urlMode);
		}
	});
	function setMode(m: Mode) {
		stored = m;
		if (browser) localStorage.setItem(STORAGE_KEY, m);
		const p = new URLSearchParams(page.url.searchParams);
		p.set('mode', m);
		if (m !== 'colliders') p.delete('collider');
		// keep a deep-link hash (`#State/N`) across the switch so the anchor re-applies in the
		// new view — `goto` with a hash-less URL would drop it
		goto(`${page.url.pathname}?${p}${browser ? location.hash : ''}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	const modelQuery = createQuery(() => ({
		queryKey: ['model', gameRef.game, hash],
		placeholderData: keepWithinGame(gameRef.game),
		queryFn: () => fetchModel(gameRef.game, hash),
		enabled: hash !== ''
	}));

	// immutable per version, so cache forever (like the model content)
	const tooltipsQuery = createQuery(() => ({
		queryKey: ['tooltips', gameRef.game, gameRef.version],
		placeholderData: keepWithinGame(gameRef.game),
		queryFn: () => fetchTooltips(gameRef),
		staleTime: Infinity
	}));
	const tooltips = $derived(tooltipsQuery.data ?? {});
</script>

{#if modelQuery.isError}
	<p class="msg err">{String(modelQuery.error)}</p>
{:else if !modelQuery.data}
	<p class="msg dim">loading…</p>
{:else}
	{@const m = modelQuery.data}
	{#if mode === 'graph'}
		<!-- the graph hosts the mode tabs in its own toolbar (same row as fit) -->
		<GraphView model={m} {tooltips} {modeTabs} />
	{:else}
		<div class="bar">
			{#if mode === 'pseudo'}
				<SettingsMenu label="view options">
					<label>
						<input type="checkbox" bind:checked={viewSettings.hideCosmetic} />
						hide cosmetic actions
					</label>
				</SettingsMenu>
			{/if}
			<span class="grow"></span>
			{@render modeTabs()}
		</div>
		{#if mode === 'colliders'}
			{#if hierarchyQuery.isError}
				<p class="msg err">{String(hierarchyQuery.error)}</p>
			{:else if !hierarchyQuery.data}
				<p class="msg dim">loading…</p>
			{:else}
				<CollidersView root={hierarchyQuery.data} {owner} targets={colliderTargets} />
			{/if}
		{:else if mode === 'pseudo'}
			<PseudoView model={m} {tooltips} />
		{:else}
			<RawView model={m} {tooltips} />
		{/if}
	{/if}
{/if}

{#snippet modeTabs()}
	<div class="modes">
		{#each modes as mo (mo.id)}
			<button class:active={mode === mo.id} onclick={() => setMode(mo.id)}>{mo.label}</button>
		{/each}
	</div>
{/snippet}

<style>
	.bar {
		display: flex;
		align-items: center;
		padding: 0.5rem var(--pad-x);
	}
	.grow {
		flex: 1;
	}
	.modes button {
		background: var(--panel);
		color: var(--fg);
		border: 1px solid #333;
		padding: 0.25rem 0.6rem;
		cursor: pointer;
	}
	.modes button:first-child {
		border-radius: 4px 0 0 4px;
	}
	.modes button:last-child {
		border-radius: 0 4px 4px 0;
	}
	.modes button.active {
		border-color: var(--accent);
		color: var(--accent);
	}
	.msg {
		padding: 1rem var(--pad-x);
	}
	.err {
		color: #e06c75;
	}
</style>
