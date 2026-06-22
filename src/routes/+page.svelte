<script lang="ts">
	import { base } from '$app/paths';
	import { GAMES, loadIndex, type Game } from '$lib/data';
	import type { IndexEntry } from '$lib/model';

	let game = $state<Game>('hk');
	let scene = $state<string | null>(null);
	let go = $state<string | null>(null);
	let query = $state('');
	let entries = $state<IndexEntry[]>([]);
	let error = $state<string | null>(null);

	$effect(() => {
		const g = game;
		entries = [];
		error = null;
		scene = null;
		go = null;
		loadIndex(g)
			.then((e) => {
				if (game === g) entries = e;
			})
			.catch((err) => {
				if (game === g) error = String(err);
			});
	});

	function pickGame(g: Game) {
		game = g;
	}
	function pickScene(s: string | null) {
		scene = s;
		go = null;
		query = '';
	}
	function pickGo(o: string | null) {
		go = o;
		query = '';
	}

	const match = (s: string) => s.toLowerCase().includes(query.trim().toLowerCase());

	// level 1: scenes with FSM counts
	const scenes = $derived.by(() => {
		const by = new Map<string, number>();
		for (const e of entries) by.set(e.file, (by.get(e.file) ?? 0) + 1);
		return [...by.entries()]
			.map(([file, count]) => ({ file, count }))
			.filter((s) => match(s.file))
			.sort((a, b) => a.file.localeCompare(b.file));
	});

	// level 2: game objects within the chosen scene
	const gameObjects = $derived.by(() => {
		if (!scene) return [];
		const by = new Map<string, number>();
		for (const e of entries)
			if (e.file === scene) by.set(e.game_object, (by.get(e.game_object) ?? 0) + 1);
		return [...by.entries()]
			.map(([path, count]) => ({ path, count }))
			.filter((g) => match(g.path))
			.sort((a, b) => a.path.localeCompare(b.path));
	});

	// level 3: FSMs on the chosen game object
	const fsms = $derived.by(() => {
		if (!scene || go === null) return [];
		return entries
			.filter((e) => e.file === scene && e.game_object === go)
			.filter((e) => match(e.name))
			.sort((a, b) => a.name.localeCompare(b.name));
	});

	const leaf = (p: string) => p.split('/').pop() || p;
</script>

<header>
	<h1>PlayMaker FSM browser</h1>
	<div class="controls">
		<div class="games">
			{#each GAMES as g (g.id)}
				<button class:active={game === g.id} onclick={() => pickGame(g.id)}>{g.label}</button>
			{/each}
		</div>
		<input placeholder="filter…" bind:value={query} />
	</div>

	<nav class="crumbs">
		<button class="crumb" class:active={!scene} onclick={() => pickScene(null)}>scenes</button>
		{#if scene}
			<span class="sep">›</span>
			<button class="crumb" class:active={!!scene && go === null} onclick={() => pickGo(null)}
				>{scene}</button
			>
		{/if}
		{#if scene && go !== null}
			<span class="sep">›</span>
			<span class="crumb active" title={go}>{go === '' ? '(scene root)' : leaf(go)}</span>
		{/if}
	</nav>
</header>

{#if error}
	<p class="err">{error}</p>
{:else if !scene}
	<ul class="list">
		{#each scenes as s (s.file)}
			<li>
				<button class="rowbtn" onclick={() => pickScene(s.file)}>{s.file}</button>
				<span class="dim">×{s.count}</span>
			</li>
		{/each}
	</ul>
{:else if go === null}
	<ul class="list">
		{#each gameObjects as g (g.path)}
			<li>
				<button class="rowbtn" onclick={() => pickGo(g.path)} title={g.path}>
					{g.path === '' ? '(scene root)' : leaf(g.path)}
				</button>
				<span class="dim">×{g.count}</span>
			</li>
		{/each}
	</ul>
{:else}
	<ul class="list fsmlist">
		{#each fsms as e (e.path_id)}
			<li>
				<a href="{base}/fsm/{game}/{e.hash}">{e.name}</a>
			</li>
		{/each}
	</ul>
{/if}

<style>
	header {
		padding: 1rem 1.25rem;
		position: sticky;
		top: 0;
		background: var(--bg);
		border-bottom: 1px solid #333;
	}
	h1 {
		font-size: 1.1rem;
		margin: 0 0 0.75rem;
	}
	.controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
	}
	.games button {
		background: var(--panel);
		color: var(--fg);
		border: 1px solid #333;
		padding: 0.3rem 0.7rem;
		cursor: pointer;
		border-radius: 4px;
	}
	.games button.active {
		border-color: var(--accent);
		color: var(--accent);
	}
	input {
		flex: 1;
		background: var(--panel);
		color: var(--fg);
		border: 1px solid #333;
		padding: 0.35rem 0.6rem;
		border-radius: 4px;
	}
	.crumbs {
		margin-top: 0.6rem;
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-family: ui-monospace, Menlo, monospace;
	}
	.crumb {
		background: none;
		border: none;
		color: var(--accent);
		cursor: pointer;
		padding: 0;
		font: inherit;
	}
	.crumb.active {
		color: var(--fg);
		cursor: default;
	}
	.sep {
		color: var(--dim);
	}
	.list {
		list-style: none;
		margin: 0;
		padding: 0.5rem 1.25rem;
		columns: 3;
		column-gap: 2rem;
	}
	.fsmlist {
		columns: 2;
	}
	.list li {
		break-inside: avoid;
		padding: 0.15rem 0;
	}
	.rowbtn {
		background: none;
		border: none;
		color: var(--accent);
		cursor: pointer;
		padding: 0;
		font: inherit;
		text-align: left;
	}
	.rowbtn:hover {
		text-decoration: underline;
	}
	.err {
		color: #e06c75;
		padding-left: 1.25rem;
	}
</style>
