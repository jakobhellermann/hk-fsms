<script module lang="ts">
	import { browser } from '$app/environment';

	// bottom pseudocode panel height is drag-resizable and persisted in localStorage
	const SIDEBAR_KEY = 'fsm:graph-panel-h';
	const CFG_KEY = 'fsm:graph-layout-cfg';
	let panelHeight = $state((browser && Number(localStorage.getItem(SIDEBAR_KEY))) || 320);
</script>

<script lang="ts">
	import { untrack, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import type { FsmModel } from '$lib/model';
	import type { Tooltips } from '$lib/tooltips';
	import { computeLayout, type EdgeStyle, type LayoutCfg } from '$lib/graph/layout';
	import { anchorFragment, anchorUrl, copyText, resolveAnchor } from '$lib/anchor';
	import GraphSvg from '$lib/graph/GraphSvg.svelte';
	import StateBody from './StateBody.svelte';
	import { PanZoom } from '$lib/panzoom.svelte';
	import SettingsMenu from '$lib/SettingsMenu.svelte';
	import { useHeaderBar } from '$lib/header-bar.svelte';
	import { viewSettings } from '$lib/settings.svelte';

	// `modeTabs` lets the detail view drop its mode switcher into the toolbar (same row as fit), which
	// sits in the page header
	let {
		model,
		modeTabs,
		tooltips = {}
	}: { model: FsmModel; modeTabs?: Snippet; tooltips?: Tooltips } = $props();

	// nodes always sit at their raw PlayMaker editor rects (one node per state, linear chains
	// optionally collapsed). `edgeStyle` controls how edges/labels look: `routed` (straight line,
	// label at the midpoint) or `side`/`bottom` (out-transitions as labelled ports leaving the side
	// resp. the bottom edge).
	const defaultCfg: LayoutCfg = {
		collapseChains: true,
		edgeStyle: 'side'
	};
	let layoutCfg = $state<LayoutCfg>(
		browser && localStorage.getItem(CFG_KEY)
			? { ...defaultCfg, ...JSON.parse(localStorage.getItem(CFG_KEY)!) }
			: { ...defaultCfg }
	);
	$effect(() => {
		if (browser) localStorage.setItem(CFG_KEY, JSON.stringify(layoutCfg));
	});

	// the selected state lives in the URL (?state=) so it survives reload and is shareable; its
	// pseudocode shows in the sidebar
	const selected = $derived(page.url.searchParams.get('state'));
	const selectedState = $derived(
		selected ? (model.states.find((s) => s.name === selected) ?? null) : null
	);
	function select(name: string | null, keepHash = false) {
		const p = new URLSearchParams(page.url.searchParams);
		if (name) p.set('state', name);
		else p.delete('state');
		// a user click drops a deep-link hash (`goto` with a query-only URL) — they've moved on;
		// applying an anchor keeps it, so the URL keeps pointing at the anchored action
		goto(`?${p}${keepHash ? location.hash : ''}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}

	// `#State/N` permalinks (see anchor.ts): a deep link selects the state (reusing the `?state=`
	// mechanism + its pan-into-view effect) and flashes the anchored action in the sidebar
	let flashAction = $state<number | null>(null);
	$effect(() => {
		if (flashAction == null) return;
		const t = setTimeout(() => (flashAction = null), 1600);
		return () => clearTimeout(t);
	});
	function applyAnchor() {
		const a = resolveAnchor(
			model.states.map((s) => s.name),
			location.hash
		);
		if (!a) return;
		flashAction = a.action;
		// `selected` (page.url-derived) must not become a dependency of the caller's effect — the
		// goto in select() would re-trigger it and re-flash the line on every selection
		untrack(() => {
			if (selected !== a.state) select(a.state, true);
		});
	}
	function linkAnchor(state: string, action: number | null) {
		const url = anchorUrl('graph', anchorFragment(state, action));
		history.replaceState(history.state, '', url);
		void copyText(url);
		flashAction = action;
	}
	$effect(() => {
		void model;
		applyAnchor();
	});

	const layout = $derived(computeLayout(model, layoutCfg));

	// pan/zoom: an SVG <g> transform (see `PanZoom`), following `home` until the first interaction
	let canvas = $state<HTMLDivElement>();
	let cw = $state(0);
	let ch = $state(0);
	const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

	const fit = $derived.by(() => {
		if (!cw || !ch || !layout.width || !layout.height) return { tx: 0, ty: 0, k: 1 };
		const k = Math.min((cw - 40) / layout.width, (ch - 40) / layout.height, 1);
		return { tx: (cw - layout.width * k) / 2, ty: (ch - layout.height * k) / 2, k };
	});
	// default view: 100% zoom with the start state top-centre (horizontally centred, near the top) so the
	// graph opens at the beginning of the flow. Nodes sit at raw PlayMaker editor rects, so the start can
	// be anywhere — without this the view centred the whole (often wide) graph and the start ended up
	// off-screen. Falls back to whole-graph-centred when there's no start node.
	const startNode = $derived(layout.nodes.find((n) => n.start));
	const home = $derived.by(() => {
		const n = startNode;
		if (!cw || !ch || !n) return { tx: (cw - layout.width) / 2, ty: 20, k: 1 };
		return { tx: cw / 2 - (n.x + n.w / 2), ty: 56 - n.y, k: 1 };
	});
	useHeaderBar(() => toolbar);

	const pz = new PanZoom(
		() => home,
		() => canvas,
		{ min: 0.1, max: 4 }
	);
	const cur = $derived(pz.cur);

	// re-fit whenever the model (i.e. the FSM) changes — not on config tweaks,
	// so adjusting ranker/seps doesn't lose pan/zoom state
	let lastCentered: string | null = null;
	$effect(() => {
		void model;
		pz.view = null;
		lastCentered = null;
	});

	// when the selected state changes (sidebar click or a ?state= deep link), pan it into view if it's
	// off-screen — keep the current zoom, don't disturb the view if it's already visible
	$effect(() => {
		const sel = selected;
		const w = cw,
			h = ch,
			nodes = layout.nodes;
		if (!sel) {
			lastCentered = null;
			return;
		}
		if (!w || !h || sel === lastCentered) return;
		const n = nodes.find((m) => m.id === sel || m.chain?.some((s) => s.name === sel));
		if (!n) return;
		lastCentered = sel;
		untrack(() => {
			const k = cur.k;
			const m = 24;
			const x0 = cur.tx + n.x * k;
			const y0 = cur.ty + n.y * k;
			if (x0 >= m && y0 >= m && x0 + n.w * k <= w - m && y0 + n.h * k <= h - m) return;
			pz.view = { tx: w / 2 - (n.x + n.w / 2) * k, ty: h / 2 - (n.y + n.h / 2) * k, k };
		});
	});

	// drag the panel's top edge to resize its height
	let resizing = $state<{ y: number; h: number } | null>(null);
	function resizeDown(e: PointerEvent) {
		e.preventDefault();
		resizing = { y: e.clientY, h: panelHeight };
	}

	function move(e: PointerEvent) {
		if (resizing) {
			panelHeight = clamp(resizing.h + (resizing.y - e.clientY), 120, 640);
			return;
		}
		pz.move(e);
	}
	function end(e: PointerEvent) {
		if (resizing) {
			resizing = null;
			if (browser) localStorage.setItem(SIDEBAR_KEY, String(panelHeight));
			return;
		}
		// a tap/click on empty canvas (no pan) clears the selection
		if (pz.end(e)) select(null);
	}
</script>

<svelte:window
	onhashchange={applyAnchor}
	onpointermove={move}
	onpointerup={end}
	onpointercancel={end}
/>

<div class="body">
	<!-- drag/wheel are mouse-only enhancements -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="canvas"
		bind:this={canvas}
		bind:clientWidth={cw}
		bind:clientHeight={ch}
		onpointerdown={(e) => pz.down(e)}
		onwheel={(e) => pz.wheel(e)}
		oncontextmenu={(e) => e.preventDefault()}
		class:grabbing={pz.dragging}
	>
		<svg class="stage">
			<g transform="translate({cur.tx} {cur.ty}) scale({cur.k})">
				<GraphSvg
					{layout}
					edgeStyle={layoutCfg.edgeStyle}
					{selected}
					onselect={(name) => {
						if (!pz.moved) select(name);
					}}
				/>
			</g>
		</svg>
	</div>

	<aside class="panel" style="height: {panelHeight}px">
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div class="resizer" onpointerdown={resizeDown} class:active={!!resizing}></div>
		{#if selectedState}
			<div class="sbhead">
				<span class="state">{selectedState.name}</span>
				<button
					class="copy"
					title="copy link to this state"
					aria-label="copy link to state {selectedState.name}"
					onclick={() => linkAnchor(selectedState.name, null)}>#</button
				>
				<button class="close" onclick={() => select(null)} aria-label="close">×</button>
			</div>
			<div class="code">
				<StateBody
					state={selectedState}
					{model}
					{tooltips}
					onnavigate={select}
					onanchor={linkAnchor}
					flash={flashAction}
					emptyNote
				/>
			</div>
		{:else}
			<div class="empty dim">click a state to see its actions & transitions</div>
		{/if}
	</aside>
</div>

{#snippet toolbar()}
	<div class="toolbar">
		<SettingsMenu label="view options">
			<span class="tb-label">transitions</span>
			<div class="seg">
				{#each ['routed', 'side', 'bottom'] as s}
					<button
						class:active={layoutCfg.edgeStyle === s}
						onclick={() => (layoutCfg.edgeStyle = s as EdgeStyle)}
						>{s === 'routed' ? 'edge' : s === 'bottom' ? 'vertical' : s}</button
					>
				{/each}
			</div>
			<label>
				<input type="checkbox" bind:checked={layoutCfg.collapseChains} />
				collapse chains
			</label>
			<label>
				<input type="checkbox" bind:checked={viewSettings.hideCosmetic} />
				hide cosmetic actions
			</label>
		</SettingsMenu>
		<button onclick={() => (pz.view = { ...fit })}>fit</button>
		{#if modeTabs}
			<span class="grow"></span>
			{@render modeTabs()}
		{/if}
	</div>
{/snippet}

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}
	.grow {
		flex: 1;
	}
	.toolbar > button {
		background: var(--panel);
		color: var(--fg);
		border: 1px solid #333;
		border-radius: 4px;
		padding: 0.25rem 0.5rem;
		cursor: pointer;
	}
	.tb-label {
		font-size: 0.8rem;
		color: var(--dim);
	}
	.seg {
		display: flex;
		gap: 2px;
	}
	.seg button {
		background: var(--bg);
		color: var(--fg);
		border: 1px solid #333;
		border-radius: 3px;
		padding: 2px 8px;
		font-size: 0.75rem;
		cursor: pointer;
		width: auto;
		height: auto;
	}
	.seg button.active {
		background: var(--accent);
		color: var(--bg);
		border-color: var(--accent);
	}
	/* fills the rest of the viewport below the header (see the game layout); size containment keeps
	   its content (e.g. a long object list) from growing the page past the viewport */
	.body {
		flex: 1;
		contain: size;
		display: flex;
		flex-direction: column;
	}
	.canvas {
		flex: 1;
		min-height: 0;
		overflow: hidden;
		cursor: grab;
		user-select: none;
		touch-action: none;
	}
	.canvas.grabbing {
		cursor: grabbing;
	}
	.panel {
		position: relative;
		flex-shrink: 0;
		width: 100%;
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-top: 1px solid #333;
		background: var(--bg);
	}
	.empty {
		padding: 1rem;
	}
	.resizer {
		position: absolute;
		left: 0;
		right: 0;
		top: 0;
		height: 10px;
		cursor: row-resize;
		z-index: 2;
		touch-action: none;
	}
	.resizer:hover,
	.resizer.active {
		background: var(--accent);
		opacity: 0.5;
	}
	.sbhead {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		border-bottom: 1px solid #333;
		background: var(--bg);
	}
	.sbhead .state {
		font-weight: 600;
	}
	.copy {
		background: none;
		border: none;
		color: var(--dim);
		cursor: pointer;
		font-size: 0.9rem;
		line-height: 1;
		padding: 0 0.2rem;
		margin-left: auto;
	}
	.copy:hover {
		color: var(--accent);
	}
	.close {
		background: none;
		border: none;
		color: var(--dim);
		cursor: pointer;
		font-size: 1.1rem;
		line-height: 1;
		padding: 0 0.2rem;
	}
	.close:hover {
		color: var(--fg);
	}
	.code {
		flex: 1;
		min-height: 0;
		overflow: auto;
		padding: 0.8rem 1rem 2rem;
		font-family: ui-monospace, Menlo, monospace;
		font-size: 14px;
		line-height: 1.65;
	}
	.stage {
		display: block;
		width: 100%;
		height: 100%;
	}
</style>
