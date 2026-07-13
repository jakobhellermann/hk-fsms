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
	import GraphSvg from '$lib/graph/GraphSvg.svelte';
	import StateBody from './StateBody.svelte';

	// `modeTabs` lets the detail view drop its mode switcher into the toolbar (same row as +/−/fit)
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
	function select(name: string | null) {
		const p = new URLSearchParams(page.url.searchParams);
		if (name) p.set('state', name);
		else p.delete('state');
		goto(`?${p}`, { replaceState: true, keepFocus: true, noScroll: true });
	}

	const layout = $derived(computeLayout(model, layoutCfg));

	// pan/zoom: an SVG <g> transform driven by mouse drag (pan) and wheel (zoom-to-cursor).
	// `view` null = follow the fit-to-canvas transform; any interaction pins it to concrete values.
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
	let view = $state<{ tx: number; ty: number; k: number } | null>(null);
	const cur = $derived(view ?? home);

	// re-fit whenever the model (i.e. the FSM) changes — not on config tweaks,
	// so adjusting ranker/seps doesn't lose pan/zoom state
	let lastCentered: string | null = null;
	$effect(() => {
		void model;
		view = null;
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
			view = { tx: w / 2 - (n.x + n.w / 2) * k, ty: h / 2 - (n.y + n.h / 2) * k, k };
		});
	});

	// size the body to exactly fill the viewport below it — robust to the header height (vs a fixed
	// magic offset, which left a sliver of page scroll)
	let bodyEl = $state<HTMLElement>();
	let bodyTop = $state(0);
	$effect(() => {
		const measure = () => {
			if (bodyEl) bodyTop = bodyEl.getBoundingClientRect().top + window.scrollY;
		};
		measure();
		window.addEventListener('resize', measure);
		return () => window.removeEventListener('resize', measure);
	});

	function zoomAround(mx: number, my: number, factor: number) {
		const k = clamp(cur.k * factor, 0.1, 4);
		const r = k / cur.k;
		view = { tx: mx - (mx - cur.tx) * r, ty: my - (my - cur.ty) * r, k };
	}
	// coalesce wheel events to one zoom per animation frame: trackpads fire far faster than 60 Hz and
	// each `view` write forces a synchronous repaint of the whole SVG. summed deltas compose exactly
	// (exp is multiplicative), so batching is lossless.
	let wheelAccum = 0;
	let wheelPos = { x: 0, y: 0 };
	let wheelRaf = 0;
	function wheel(e: WheelEvent) {
		e.preventDefault();
		const rect = canvas?.getBoundingClientRect();
		if (!rect) return;
		wheelPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
		wheelAccum += e.deltaY;
		if (!wheelRaf)
			wheelRaf = requestAnimationFrame(() => {
				wheelRaf = 0;
				zoomAround(wheelPos.x, wheelPos.y, Math.exp(-wheelAccum * 0.0015));
				wheelAccum = 0;
			});
	}

	// pan/zoom via pointer events (mouse, touch, pen). one pointer pans; two pinch-zoom.
	const pointers = new Map<number, { x: number; y: number }>();
	let drag = $state<{ x: number; y: number; tx: number; ty: number } | null>(null);
	let pinch: { dist: number; cx: number; cy: number; k: number; tx: number; ty: number } | null =
		null;
	let moved = false; // whether the current gesture actually moved (vs a plain tap/click)
	function startPinch() {
		const rect = canvas?.getBoundingClientRect();
		const [a, b] = [...pointers.values()];
		pinch = {
			dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
			cx: (a.x + b.x) / 2 - (rect?.left ?? 0),
			cy: (a.y + b.y) / 2 - (rect?.top ?? 0),
			k: cur.k,
			tx: cur.tx,
			ty: cur.ty
		};
	}
	function down(e: PointerEvent) {
		if (e.button > 0) return; // ignore right/middle mouse buttons
		pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		moved = false;
		if (pointers.size >= 2) {
			startPinch();
			drag = null;
			return;
		}
		drag = { x: e.clientX, y: e.clientY, tx: cur.tx, ty: cur.ty };
	}

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
		if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		if (pinch && pointers.size >= 2) {
			const rect = canvas?.getBoundingClientRect();
			const [a, b] = [...pointers.values()];
			const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
			const midx = (a.x + b.x) / 2 - (rect?.left ?? 0);
			const midy = (a.y + b.y) / 2 - (rect?.top ?? 0);
			const k = clamp((pinch.k * dist) / pinch.dist, 0.1, 4);
			const r = k / pinch.k;
			// pin the graph point under the start midpoint, while following the fingers' midpoint (so a
			// two-finger move also pans)
			view = { tx: midx - (pinch.cx - pinch.tx) * r, ty: midy - (pinch.cy - pinch.ty) * r, k };
			moved = true;
			return;
		}
		if (!drag) return;
		if (Math.abs(e.clientX - drag.x) > 3 || Math.abs(e.clientY - drag.y) > 3) moved = true;
		view = { tx: drag.tx + (e.clientX - drag.x), ty: drag.ty + (e.clientY - drag.y), k: cur.k };
	}
	function end(e: PointerEvent) {
		if (resizing) {
			resizing = null;
			if (browser) localStorage.setItem(SIDEBAR_KEY, String(panelHeight));
			return;
		}
		pointers.delete(e.pointerId);
		if (pointers.size < 2) pinch = null;
		if (pointers.size === 0) {
			// a tap/click on empty canvas (no pan) clears the selection
			if (drag && !moved) select(null);
			drag = null;
		} else if (pointers.size === 1) {
			// one finger lifted after a pinch — resume panning from the remaining finger without a jump
			const [p] = [...pointers.values()];
			drag = { x: p.x, y: p.y, tx: cur.tx, ty: cur.ty };
		}
	}
</script>

<svelte:window onpointermove={move} onpointerup={end} onpointercancel={end} />

<div class="toolbar">
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
	<label class="tb-check">
		<input type="checkbox" bind:checked={layoutCfg.collapseChains} />
		collapse chains
	</label>
	<button onclick={() => (view = { ...fit })}>fit</button>
	{#if modeTabs}
		<span class="grow"></span>
		{@render modeTabs()}
	{/if}
</div>

<div class="body" bind:this={bodyEl} style="height: calc(100dvh - {bodyTop}px)">
	<!-- drag/wheel are mouse-only enhancements -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="canvas"
		bind:this={canvas}
		bind:clientWidth={cw}
		bind:clientHeight={ch}
		onpointerdown={down}
		onwheel={wheel}
		oncontextmenu={(e) => e.preventDefault()}
		class:grabbing={!!drag}
	>
		<svg class="stage">
			<g transform="translate({cur.tx} {cur.ty}) scale({cur.k})">
				<GraphSvg
					{layout}
					edgeStyle={layoutCfg.edgeStyle}
					{selected}
					onselect={(name) => {
						if (!moved) select(name);
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
				<button class="close" onclick={() => select(null)} aria-label="close">×</button>
			</div>
			<div class="code">
				<StateBody state={selectedState} {model} {tooltips} onnavigate={select} emptyNote />
			</div>
		{:else}
			<div class="empty dim">click a state to see its actions & transitions</div>
		{/if}
	</aside>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem var(--pad-x);
	}
	.grow {
		flex: 1;
	}
	.toolbar > button {
		background: var(--panel);
		color: var(--fg);
		border: 1px solid #333;
		border-radius: 4px;
		width: 28px;
		height: 26px;
		cursor: pointer;
	}
	.tb-label {
		margin-left: 0.5rem;
		font-size: 0.8rem;
		color: var(--dim);
	}
	.tb-check {
		display: flex;
		align-items: center;
		gap: 0.3rem;
		margin-left: 0.5rem;
		font-size: 0.8rem;
		color: var(--dim);
		cursor: pointer;
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
	.body {
		display: flex;
		flex-direction: column;
		/* height is set inline from the measured top offset (see component) */
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
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.6rem 1rem;
		border-bottom: 1px solid #333;
		background: var(--bg);
	}
	.sbhead .state {
		font-weight: 600;
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
