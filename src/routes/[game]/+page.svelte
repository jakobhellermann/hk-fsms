<script lang="ts">
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { createQuery, useQueryClient } from '@tanstack/svelte-query';
	import {
		fetchIndex,
		fetchSceneNames,
		favoritesFor,
		fsmSegments,
		encodePath,
		gameSegment,
		parseGameRef,
		sceneFile,
		sceneLabel,
		sceneSegment,
		versionsFor,
		keepWithinGame
	} from '$lib/data';
	import { groupNamedScenes, groupOtherFiles, type SceneGroup } from '$lib/scenes';
	import { untrack } from 'svelte';
	import { isGroupOpen, setGroupOpen } from '$lib/openGroups';

	const gameRef = $derived(parseGameRef(page.params.game));
	const game = $derived(gameRef.game);
	const segment = $derived(gameSegment(gameRef));
	const query = $derived(page.url.searchParams.get('q') ?? '');

	// debounced query for filtering — lets the input render the typed char before the heavy
	// scene computation runs. The URL updates immediately (for links/navigation); the filter
	// waits a tick.
	let debouncedQuery = $state(untrack(() => query));
	$effect(() => {
		const q = query;
		const id = setTimeout(() => (debouncedQuery = q), 0);
		return () => clearTimeout(id);
	});

	const coll = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

	// index and scene names as one query, so favorites and scene names never mix two versions while
	// another version loads
	const client = useQueryClient();
	const versionQuery = createQuery(() => ({
		queryKey: ['versionData', gameRef.game, gameRef.version],
		placeholderData: keepWithinGame(gameRef.game),
		queryFn: async () => {
			const ref = gameRef;
			const [entries, sceneNames] = await Promise.all([
				client.fetchQuery({
					queryKey: ['index', ref.game, ref.version],
					queryFn: () => fetchIndex(ref)
				}),
				client.fetchQuery({
					queryKey: ['sceneNames', ref.game, ref.version],
					queryFn: () => fetchSceneNames(ref)
				})
			]);
			return { version: ref.version ?? versionsFor(ref.game).at(-1)!, entries, sceneNames };
		}
	}));
	const entries = $derived(versionQuery.data?.entries ?? []);
	const sceneNames = $derived(versionQuery.data?.sceneNames ?? new Map<string, string>());

	const terms = $derived(debouncedQuery.trim().toLowerCase().split(/\s+/));
	const match = (s: string) => {
		if (!terms[0]) return true;
		const lower = s.toLowerCase();
		return terms.every((t) => lower.includes(t));
	};
	const byFile = (a: { file: string }, b: { file: string }) => coll.compare(a.file, b.file);
	const sceneHref = (s: SceneRow) =>
		`${base}/${segment}/${encodePath(sceneSegment(sceneNames, s.file))}${s.contentMatch ? `?q=${encodeURIComponent(debouncedQuery.trim())}` : ''}`;

	type SceneRow = {
		file: string;
		name: string;
		count: number;
		named: boolean;
		contentMatch: boolean;
	};
	const scenes = $derived.by(() => {
		const q = terms[0];
		const by = new Map<string, number>();
		const searchText = new Map<string, string>();
		for (const e of entries) {
			by.set(e.file, (by.get(e.file) ?? 0) + 1);
			if (q) {
				const s = (e.name + ' ' + e.game_object).toLowerCase();
				searchText.set(e.file, (searchText.get(e.file) ?? '') + ' ' + s);
			}
		}
		const rows: SceneRow[] = [...by.entries()].map(([file, count]) => {
			const named = sceneNames.has(file);
			const contentMatch =
				q.length > 0 && terms.every((t) => (searchText.get(file) ?? '').includes(t));
			return {
				file,
				count,
				named,
				contentMatch,
				name: named ? sceneNames.get(file)! : sceneLabel(file)
			};
		});
		return rows.filter((s) => match(s.name) || match(s.file) || s.contentMatch).sort(byFile);
	});
	const namedScenes = $derived(scenes.filter((s) => s.named));
	const otherScenes = $derived(scenes.filter((s) => !s.named));

	// ungrouped singles first, then the collapsible prefix groups
	const singlesFirst = (gs: SceneGroup<SceneRow>[]) => [
		...gs.filter((g) => !g.group),
		...gs.filter((g) => g.group)
	];
	const namedGroups = $derived(singlesFirst(groupNamedScenes(namedScenes)));
	const otherGroups = $derived(singlesFirst(groupOtherFiles(otherScenes)));

	// curated quick-links (e.g. named bosses) resolved against the index to real FSM URLs; filtered by
	// the same search terms as the scenes, and dropped silently if the target FSM no longer exists
	const favorites = $derived(
		favoritesFor(game, versionQuery.data?.version ?? '')
			.filter((f) => match(f.name))
			.map((f) => {
				let path: string;
				const file = sceneFile(sceneNames, f.scene);
				if (f.fsm) {
					const e = entries.find(
						(x) => x.file === file && x.game_object === (f.game_object ?? '') && x.name === f.fsm
					);
					if (!e) return null;
					path = fsmSegments(entries, sceneNames, e).map(encodePath).join('/');
				} else {
					// scene favorite: link to the bundle's object tree (only if it has any FSMs)
					if (!entries.some((x) => x.file === file)) return null;
					path = encodePath(sceneSegment(sceneNames, file));
				}
				return {
					name: f.name,
					href: `${base}/${segment}/${path}${f.mode ? `?mode=${f.mode}` : ''}`
				};
			})
			.filter((f) => f !== null)
	);
</script>

{#snippet groupList(groups: SceneGroup<SceneRow>[], ns: string)}
	<ul class="grouplist">
		{#each groups as g (g.prefix)}
			{@const key = `${game}:${ns}:${g.prefix}`}
			<li>
				{#if g.group}
					<details
						open={isGroupOpen(key) || debouncedQuery !== ''}
						ontoggle={(e) => {
							if (!debouncedQuery) setGroupOpen(key, e.currentTarget.open);
						}}
					>
						<summary>{g.prefix} <span class="dim badge">{g.items.length}</span></summary>
						<ul class="sublist">
							{#each g.items as s (s.file)}
								<li>
									<a class="rowlink" href={sceneHref(s)} title={s.file}>{s.name}</a>
									<span class="dim badge">{s.count}</span>
								</li>
							{/each}
						</ul>
					</details>
				{:else}
					{@const s = g.items[0]}
					<span class="single">
						<a class="rowlink" href={sceneHref(s)} title={s.file}>{s.name}</a>
						<span class="dim badge">{s.count}</span>
					</span>
				{/if}
			</li>
		{/each}
	</ul>
{/snippet}

{#if versionQuery.isPending}
	<p class="msg dim">loading…</p>
{:else if versionQuery.isError}
	<p class="msg err">{String(versionQuery.error)}</p>
{:else}
	{#if favorites.length}
		<section class="favorites">
			<ul class="favlist">
				{#each favorites as f (f.name)}
					<li><a class="favlink" href={f.href}>{f.name}</a></li>
				{/each}
			</ul>
		</section>
	{/if}
	<div class="cols">
		<section class="col">
			<div class="count dim">{namedScenes.length} scenes</div>
			{@render groupList(namedGroups, 'named')}
		</section>
		{#if otherScenes.length}
			<section class="col">
				<div class="count dim">{otherScenes.length} other files</div>
				{@render groupList(otherGroups, 'other')}
			</section>
		{/if}
	</div>
{/if}

<style>
	.favorites {
		padding: 0.2rem var(--pad-x) 0.6rem;
		border-bottom: 1px solid #2a2a2a;
		margin-bottom: 0.4rem;
	}
	.favlist {
		list-style: none;
		margin: 0.3rem 0 0;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}
	.favlink {
		display: inline-block;
		padding: 0.15rem 0.6rem;
		border: 1px solid #333;
		border-radius: 999px;
		background: var(--panel);
		color: var(--accent);
		text-decoration: none;
		font-size: 0.9rem;
	}
	.favlink:hover {
		border-color: var(--accent);
	}
	.cols {
		display: flex;
		flex-wrap: wrap;
		gap: 0 1rem;
		align-items: flex-start;
	}
	.col {
		flex: 1 1 320px;
		min-width: 0;
	}
	.count {
		padding: 0.6rem var(--pad-x) 0;
		font-size: 0.9rem;
	}
	.grouplist {
		list-style: none;
		margin: 0;
		padding: 0.4rem var(--pad-x) 2rem;
	}
	.grouplist > li {
		padding: 0.08rem 0;
	}
	.grouplist summary {
		cursor: pointer;
		font-weight: 600;
		padding: 0.06rem 0;
	}
	.single {
		display: inline-flex;
		align-items: baseline;
		gap: 0.4rem;
		min-width: 0;
	}
	.sublist {
		list-style: none;
		margin: 0;
		padding-left: 0.8rem;
		border-left: 1px solid #2a2a2a;
	}
	.sublist li {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
		padding: 0.05rem 0;
		min-width: 0;
	}
	.rowlink {
		color: var(--accent);
		text-decoration: none;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.rowlink:hover {
		text-decoration: underline;
	}
	.badge {
		font-size: 0.8rem;
		flex-shrink: 0;
	}
	.msg {
		padding: 1rem var(--pad-x);
	}
	.err {
		color: #e06c75;
	}
</style>
