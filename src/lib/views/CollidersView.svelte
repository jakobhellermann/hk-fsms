<script lang="ts">
	import { browser } from '$app/environment';
	import { PanZoom } from '$lib/panzoom.svelte';
	import {
		CATEGORIES,
		type Category,
		type HRoot,
		type Outline,
		bounds,
		categoryColor,
		matchesTarget,
		outlines
	} from '$lib/colliders';

	// `targets`: GameObject paths to select and frame, with everything below them (see `linkTargets`)
	let { root, owner, targets }: { root: HRoot; owner: string; targets: string[] } = $props();

	const all = $derived(outlines(root, owner));

	// filters are a global preference, like the view mode
	const FILTER_KEY = 'colliders:filters';
	const rawFilters = browser ? localStorage.getItem(FILTER_KEY) : null;
	const savedFilters = rawFilters
		? (JSON.parse(rawFilters) as { hidden: Category[]; inactive: boolean; external?: boolean })
		: null;
	let showInactive = $state(savedFilters?.inactive ?? true);
	let showExternal = $state(savedFilters?.external ?? false);
	let hidden = $state<Set<Category>>(new Set(savedFilters?.hidden ?? []));
	$effect(() => {
		if (browser)
			localStorage.setItem(
				FILTER_KEY,
				JSON.stringify({ hidden: [...hidden], inactive: showInactive, external: showExternal })
			);
	});
	const present = $derived(CATEGORIES.filter((c) => all.some((o) => o.category === c.id)));
	const hasExternal = $derived(all.some((o) => o.external));
	// a linked target is framed together with the owner's own colliders, and shown even when external
	const targetHits = $derived(
		all.filter((o) => targets.some((t) => matchesTarget(o, t, all, true)))
	);
	const visible = $derived(
		all.filter(
			(o) =>
				!hidden.has(o.category) &&
				(showInactive || o.live) &&
				(showExternal || !o.external || targetHits.includes(o))
		)
	);
	// largest first, so smaller shapes stay on top and hoverable
	const area = (o: Outline) => {
		const b = bounds([o]);
		return (b.maxX - b.minX) * (b.maxY - b.minY);
	};
	const drawOrder = $derived([...visible].sort((a, b) => area(b) - area(a)));
	function toggle(c: Category) {
		const next = new Set(hidden);
		if (next.has(c)) next.delete(c);
		else next.add(c);
		hidden = next;
	}

	// GameObject path under the pointer; all colliders of that object highlight
	let hovered = $state<string | null>(null);

	// one list entry per GameObject, in the order of its first collider
	const entries = $derived.by(() => {
		const byPath = new Map<string, Outline[]>();
		for (const o of visible) {
			const list = byPath.get(o.nodePath);
			if (list) list.push(o);
			else byPath.set(o.nodePath, [o]);
		}
		return [...byPath.values()];
	});
	const meta = (os: Outline[]) =>
		[
			os[0].node.layer,
			os.some((o) => o.collider.trigger) && 'trigger',
			!os.some((o) => o.live) && 'inactive',
			os[0].external && 'referenced, outside this object'
		]
			.filter(Boolean)
			.join(' · ');

	// world units → screen: y flips (Unity y is up)
	let canvas = $state<HTMLDivElement>();
	let cw = $state(0);
	let ch = $state(0);
	const box = $derived(
		targetHits.length
			? bounds([...targetHits, ...all.filter((o) => !o.external)])
			: bounds(visible.length ? visible : all)
	);
	const fit = $derived.by(() => {
		const w = box.maxX - box.minX || 1;
		const h = box.maxY - box.minY || 1;
		if (!cw || !ch) return { tx: 0, ty: 0, k: 20 };
		const k = Math.min((cw - 40) / w, (ch - 40) / h);
		return {
			tx: cw / 2 - ((box.minX + box.maxX) / 2) * k,
			ty: ch / 2 + ((box.minY + box.maxY) / 2) * k,
			k
		};
	});
	const pz = new PanZoom(
		() => fit,
		() => canvas,
		{ min: 0.5, max: 2000 }
	);
	const cur = $derived(pz.cur);
	$effect(() => {
		void root;
		pz.view = null;
		selected = { paths: [], subtree: false };
	});
	$effect(() => {
		selected = { paths: targets, subtree: true };
		pz.view = null;
	});

	// grid step: the power of 10 (or 5×) that keeps lines ≥ 24px apart
	const gridStep = $derived.by(() => {
		const min = 24 / cur.k;
		const p = 10 ** Math.ceil(Math.log10(min));
		return p / 2 >= min ? p / 2 : p;
	});
	const gridLines = $derived.by(() => {
		if (!cw || !ch) return { xs: [], ys: [] };
		const s = gridStep;
		const x0 = Math.floor(-cur.tx / cur.k / s) * s;
		const x1 = (cw - cur.tx) / cur.k;
		const y0 = Math.floor((cur.ty - ch) / cur.k / s) * s;
		const y1 = cur.ty / cur.k;
		const xs: number[] = [];
		const ys: number[] = [];
		for (let x = x0; x <= x1; x += s) xs.push(x);
		for (let y = y0; y <= y1; y += s) ys.push(y);
		return { xs, ys };
	});
	const sx = (x: number) => cur.tx + x * cur.k;
	const sy = (y: number) => cur.ty - y * cur.k;
	const pathData = (o: Outline) =>
		o.polylines
			.map(
				(pl) =>
					pl
						.map(([x, y], i) => `${i ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(y).toFixed(1)}`)
						.join('') + (o.closed ? 'Z' : '')
			)
			.join('');
	const fmtNum = (n: number) => Number(n.toFixed(3)).toString();

	// GameObject paths (or `alertRangeTargets` wildcards): clicked objects select just their own
	// colliders, linked ones everything below them too
	let selected = $state.raw<{ paths: string[]; subtree: boolean }>({ paths: [], subtree: false });
	const isSelected = (o: Outline) =>
		selected.paths.some((t) => matchesTarget(o, t, all, selected.subtree));
	const select = (path: string | null) =>
		(selected = { paths: path === null ? [] : [path], subtree: false });
	let panelEl = $state<HTMLElement>();
	$effect(() => {
		if (selected.paths.length)
			panelEl?.querySelector('li.selected')?.scrollIntoView({ block: 'nearest' });
	});

	function end(e: PointerEvent) {
		// a tap without panning selects the shape under the pointer, or clears on empty canvas
		if (pz.end(e)) select(hovered);
	}
</script>

<svelte:window onpointermove={(e) => pz.move(e)} onpointerup={end} onpointercancel={end} />

<div class="toolbar">
	<button onclick={() => (pz.view = null)}>fit</button>
	{#if targets.length && !targetHits.length}
		<span class="err">{targets.join(', ')}: no colliders in the indexed data</span>
	{/if}
	<label><input type="checkbox" bind:checked={showInactive} /> inactive</label>
	{#each present as c (c.id)}
		<label class="cat" style="--c: {c.color}">
			<input type="checkbox" checked={!hidden.has(c.id)} onchange={() => toggle(c.id)} />
			{c.label}
		</label>
	{/each}
	{#if hasExternal}
		<label title="objects the FSM references outside its own"
			><input type="checkbox" bind:checked={showExternal} /> external</label
		>
	{/if}
</div>
<div class="body">
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="canvas"
		class:grabbing={pz.dragging}
		bind:this={canvas}
		bind:clientWidth={cw}
		bind:clientHeight={ch}
		onpointerdown={(e) => pz.down(e)}
		onwheel={(e) => pz.wheel(e)}
	>
		<svg>
			<g class="grid">
				{#each gridLines.xs as x (x)}
					<line x1={sx(x)} x2={sx(x)} y1="0" y2={ch} class:axis={Math.abs(x) < 1e-9} />
				{/each}
				{#each gridLines.ys as y (y)}
					<line y1={sy(y)} y2={sy(y)} x1="0" x2={cw} class:axis={Math.abs(y) < 1e-9} />
				{/each}
			</g>
			{#each drawOrder as o, i (i)}
				<!-- svelte-ignore a11y_no_static_element_interactions -->
				<path
					d={pathData(o)}
					stroke={categoryColor(o.category)}
					fill={o.closed ? categoryColor(o.category) : 'none'}
					class:inactive={!o.live}
					class:ignore={o.ignoreRaycast}
					class:hover={hovered === o.nodePath || isSelected(o)}
					onpointerenter={() => (hovered = o.nodePath)}
					onpointerleave={() => (hovered = null)}
				/>
			{/each}
		</svg>
		<span class="scale dim">grid {fmtNum(gridStep)} u</span>
	</div>
	<aside class="panel" bind:this={panelEl}>
		<ul>
			{#each entries as os (os[0].nodePath)}
				{@const o = os[0]}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
				<li
					class:hover={hovered === o.nodePath}
					class:selected={isSelected(o)}
					class:inactive={!os.some((x) => x.live)}
					onpointerenter={() => (hovered = o.nodePath)}
					onpointerleave={() => (hovered = null)}
					onclick={() => select(isSelected(o) ? null : o.nodePath)}
				>
					<span class="swatch" style="background: {categoryColor(o.category)}"></span>
					<span class="name">{o.label}</span>
					<span class="dim meta">{meta(os)}</span>
				</li>
			{/each}
		</ul>
	</aside>
</div>

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.3rem 0.8rem;
		padding: 0 var(--pad-x) 0.5rem;
	}
	.toolbar button {
		background: var(--panel);
		color: var(--fg);
		border: 1px solid #333;
		border-radius: 4px;
		padding: 0.25rem 0.6rem;
		cursor: pointer;
	}
	.toolbar label {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		cursor: pointer;
	}
	.cat {
		color: var(--c);
	}
	/* fills the rest of the viewport below the header (see the game layout); size containment keeps
	   its content (e.g. a long object list) from growing the page past the viewport */
	.body {
		flex: 1;
		contain: size;
		display: flex;
		border-top: 1px solid #333;
	}
	.canvas {
		flex: 1;
		position: relative;
		overflow: hidden;
		cursor: grab;
		touch-action: none;
	}
	.canvas.grabbing {
		cursor: grabbing;
	}
	svg {
		width: 100%;
		height: 100%;
		display: block;
	}
	.grid line {
		stroke: #fff;
		stroke-opacity: 0.06;
	}
	.grid line.axis {
		stroke-opacity: 0.25;
	}
	path {
		stroke-width: 1.5;
		fill-opacity: 0.08;
	}
	path.inactive {
		stroke-dasharray: 4 3;
		stroke-opacity: 0.6;
		fill-opacity: 0.03;
	}
	path.ignore {
		stroke-opacity: 0.35;
		fill-opacity: 0.02;
	}
	path.hover {
		stroke-width: 3;
		fill-opacity: 0.25;
	}
	.scale {
		position: absolute;
		left: 0.5rem;
		bottom: 0.4rem;
		font-size: 0.8em;
	}
	.panel {
		width: 22rem;
		overflow: auto;
		border-left: 1px solid #333;
		font-size: 0.9em;
	}
	.panel ul {
		list-style: none;
		margin: 0;
		padding: 0.3rem 0;
	}
	.panel li {
		display: grid;
		grid-template-columns: auto 1fr;
		column-gap: 0.4rem;
		padding: 0.15rem 0.6rem;
		cursor: pointer;
	}
	.panel li.hover {
		background: var(--panel);
	}
	.panel li.selected {
		background: var(--panel);
		box-shadow: inset 2px 0 0 var(--accent);
	}
	.panel li.inactive .name {
		opacity: 0.6;
	}
	.swatch {
		width: 0.7rem;
		height: 0.7rem;
		border-radius: 2px;
		align-self: center;
	}
	.name {
		word-break: break-all;
	}
	.meta {
		grid-column: 2;
		font-size: 0.85em;
	}
	.err {
		color: #e06c75;
	}
	@media (max-width: 700px) {
		.body {
			flex-direction: column;
		}
		.panel {
			width: auto;
			height: 40%;
			border-left: none;
			border-top: 1px solid #333;
		}
	}
</style>
