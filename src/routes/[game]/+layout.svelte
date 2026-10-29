<script lang="ts">
	import { base } from '$app/paths';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { createQuery } from '@tanstack/svelte-query';
	import {
		GAMES,
		fetchIndex,
		fetchSceneNames,
		encodePath,
		gameSegment,
		parseGameRef,
		resolveScenePath,
		sceneLabel,
		sceneSegment,
		versionsFor,
		keepWithinGame
	} from '$lib/data';

	let { children } = $props();

	const gameRef = $derived(parseGameRef(page.params.game));
	const game = $derived(gameRef.game);
	const segment = $derived(gameSegment(gameRef));
	const gameLabel = $derived(GAMES.find((g) => g.id === game)?.label ?? game);

	const versions = $derived(versionsFor(game));
	const latest = $derived(versions.at(-1));

	// switch version in place: keep everything after the game segment (scene, FSM path, query, hash)
	function setVersion(v: string) {
		const prefix = `${base}/${encodeURIComponent(page.params.game ?? '')}`;
		const path = page.url.pathname;
		const tail = path.startsWith(prefix) ? path.slice(prefix.length) : '';
		const target = gameSegment({ game, version: v === latest ? null : v });
		goto(`${base}/${target}${tail}${page.url.search}${page.url.hash}`);
	}

	const indexQuery = createQuery(() => ({
		queryKey: ['index', gameRef.game, gameRef.version],
		placeholderData: keepWithinGame(gameRef.game),
		queryFn: () => fetchIndex(gameRef)
	}));
	const entries = $derived(indexQuery.data ?? []);

	const sceneNamesQuery = createQuery(() => ({
		queryKey: ['sceneNames', gameRef.game, gameRef.version],
		placeholderData: keepWithinGame(gameRef.game),
		queryFn: () => fetchSceneNames(gameRef)
	}));
	const sceneNames = $derived(sceneNamesQuery.data ?? new Map<string, string>());
	const sceneTitle = (file: string) => sceneNames.get(file) ?? sceneLabel(file);

	// no scene param: the game index page
	const resolved = $derived(
		page.params.scene
			? resolveScenePath(entries, sceneNames, page.params.scene, page.params.rest ?? '')
			: { scene: null as string | null, rest: [] as string[] }
	);
	const scene = $derived(resolved.scene);
	// segments below the scene: [] = object tree, [...gameObject, fsm] = an FSM detail
	const rest = $derived(resolved.rest);
	const isDetail = $derived(scene !== null && rest.length > 0);
	const query = $derived(page.url.searchParams.get('q') ?? '');

	const sceneHref = $derived(
		scene ? `${base}/${segment}/${encodePath(sceneSegment(sceneNames, scene))}` : ''
	);
	// the FSM name shown in the breadcrumb (drop the disambiguating ":n" suffix)
	const fsmCrumb = $derived(isDetail ? rest[rest.length - 1].replace(/:\d+$/, '') : '');

	const placeholder = $derived(
		scene === null ? 'filter scenes & files…' : 'filter objects & FSMs…'
	);

	// make the filter the first Tab target without stealing focus on load (autofocus pops the
	// on-screen keyboard on tablets). intercept only the initial Tab, when nothing is focused yet.
	let filterEl = $state<HTMLInputElement>();
	function onKeydown(e: KeyboardEvent) {
		if (isDetail || !filterEl) return;
		const active = document.activeElement;
		const typing =
			active instanceof HTMLElement &&
			(active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);

		if (e.key === 'Tab' && !e.shiftKey && !typing) {
			if (active && active !== document.body) return;
			e.preventDefault();
			filterEl.focus();
			return;
		}

		// `s` or `/` jumps to the filter (unless already typing in a field or a shortcut modifier is held)
		if ((e.key === 's' || e.key === 'S' || e.key === '/') && !typing && !e.ctrlKey && !e.metaKey) {
			e.preventDefault();
			filterEl.focus();
		}
	}

	function setQuery(v: string) {
		const p = new URLSearchParams(page.url.searchParams);
		if (v) p.set('q', v);
		else p.delete('q');
		const qs = p.toString();
		goto(`${page.url.pathname}${qs ? `?${qs}` : ''}`, {
			keepFocus: true,
			noScroll: true,
			replaceState: true
		});
	}
</script>

<svelte:head>
	<title>
		{isDetail
			? `${fsmCrumb} — ${sceneTitle(scene ?? '')}`
			: scene
				? `${sceneTitle(scene)}`
				: `FSMs — ${gameLabel}`}
	</title>
</svelte:head>

<svelte:window onkeydown={onKeydown} />

<!-- rendered beside the game buttons on wide screens and in the crumb row on phones -->
{#snippet versionSelect(placement: 'wide' | 'narrow')}
	{#if versions.length > 1}
		<select
			class="version {placement}"
			title="game version"
			value={gameRef.version ?? latest}
			onchange={(e) => setVersion(e.currentTarget.value)}
		>
			{#each [...versions].reverse() as v (v)}
				<option value={v}>{v}</option>
			{/each}
		</select>
	{/if}
{/snippet}

<header>
	<div class="topline">
		<a class="home" href="{base}/{segment}"><h1>PlayMaker FSM browser</h1></a>
		<div class="switch">
			<div class="games">
				{#each GAMES as g (g.id)}
					<a
						class="gamebtn"
						class:active={game === g.id}
						title={g.label}
						href="{base}/{g.id}{query ? `?q=${encodeURIComponent(query)}` : ''}"
					>
						<span class="lbl-long">{g.label}</span>
						<span class="lbl-short">{g.short}</span>
					</a>
				{/each}
			</div>
			{@render versionSelect('wide')}
		</div>
	</div>

	<nav class="crumbs">
		<a class="crumb" class:active={scene === null} href="{base}/{segment}">{gameLabel}</a>
		{#if scene !== null}
			<span class="sep">›</span>
			{#if isDetail}
				<a class="crumb" href={sceneHref} title={scene}>{sceneTitle(scene)}</a>
				<span class="sep">›</span>
				<span class="crumb active">{fsmCrumb}</span>
			{:else}
				<span class="crumb active" title={scene}>{sceneTitle(scene)}</span>
			{/if}
		{/if}
		{@render versionSelect('narrow')}
	</nav>

	{#if !isDetail}
		<div class="filter-wrap">
			<input
				class="filter"
				bind:this={filterEl}
				{placeholder}
				value={query}
				oninput={(e) => setQuery(e.currentTarget.value)}
			/>
			{#if query}
				<button class="clear" onclick={() => setQuery('')} aria-label="clear filter">✕</button>
			{/if}
		</div>
	{/if}
</header>

{@render children()}

<style>
	header {
		padding: 0.85rem var(--pad-x);
		position: sticky;
		top: 0;
		background: var(--bg);
		border-bottom: 1px solid #333;
		z-index: 1;
	}
	.topline {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
	}
	.home {
		color: inherit;
		text-decoration: none;
	}
	h1 {
		font-size: 1.1rem;
		margin: 0;
	}
	.gamebtn {
		background: var(--panel);
		color: var(--fg);
		border: 1px solid #333;
		padding: 0.3rem 0.7rem;
		cursor: pointer;
		border-radius: 4px;
		text-decoration: none;
		white-space: nowrap;
	}
	/* full game names don't fit a phone-width topline — show the short labels from config */
	.lbl-short {
		display: none;
	}
	@media (max-width: 480px) {
		.lbl-long {
			display: none;
		}
		.lbl-short {
			display: inline;
		}
	}
	.switch {
		display: flex;
		align-items: center;
		gap: 0.8rem;
	}
	.version {
		background: none;
		color: var(--fg);
		opacity: 0.75;
		border: none;
		padding: 0;
		font-size: 0.85rem;
		text-align-last: right;
		cursor: pointer;
	}
	.version.wide {
		order: -1;
	}
	.version.narrow {
		display: none;
		margin-left: auto;
	}
	@media (max-width: 480px) {
		.version.wide {
			display: none;
		}
		.version.narrow {
			display: block;
		}
	}
	.version:hover {
		opacity: 1;
	}
	.version option {
		background: var(--panel);
		color: var(--fg);
	}
	.gamebtn.active {
		border-color: var(--accent);
		color: var(--accent);
	}
	.crumbs {
		margin: 0.6rem 0;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-family: ui-monospace, Menlo, monospace;
		font-size: 0.95rem;
		flex-wrap: wrap;
	}
	.crumb {
		color: var(--accent);
		text-decoration: none;
	}
	.crumb:hover {
		text-decoration: underline;
	}
	.crumb.active {
		color: var(--fg);
		cursor: default;
		text-decoration: none;
	}
	.sep {
		color: var(--dim);
	}
	.filter-wrap {
		position: relative;
	}
	.filter {
		width: 100%;
		background: var(--panel);
		color: var(--fg);
		border: 1px solid #333;
		padding: 0.4rem 0.65rem;
		border-radius: 4px;
	}
	.clear {
		position: absolute;
		right: 0.4rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		color: var(--dim);
		cursor: pointer;
		font-size: 0.8rem;
		padding: 0.1rem 0.3rem;
		line-height: 1;
	}
	.clear:hover {
		color: var(--fg);
	}
</style>
