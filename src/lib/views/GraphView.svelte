<script lang="ts">
	import dagre from '@dagrejs/dagre';
	import type { FsmModel } from '$lib/model';

	let { model }: { model: FsmModel } = $props();

	const ANY = '★ any state';

	type Node = {
		id: string;
		label: string;
		x: number;
		y: number;
		w: number;
		h: number;
		start: boolean;
		any: boolean;
	};
	type Edge = {
		points: { x: number; y: number }[];
		label: string;
		global: boolean;
		lx: number;
		ly: number;
	};

	const layout = $derived.by(() => {
		const g = new dagre.graphlib.Graph({ multigraph: true });
		g.setGraph({ rankdir: 'TB', nodesep: 28, ranksep: 46, marginx: 16, marginy: 16 });
		g.setDefaultEdgeLabel(() => ({}));

		const width = (s: string) => Math.max(54, s.length * 7.3 + 22);
		for (const s of model.states)
			g.setNode(s.name, { label: s.name, width: width(s.name), height: 30 });
		if (model.global_transitions.length)
			g.setNode(ANY, { label: ANY, width: width(ANY), height: 30 });

		const addEdge = (from: string, t: { event: string; to_state: string }, global: boolean) => {
			if (!g.hasNode(from) || !g.hasNode(t.to_state)) return;
			g.setEdge(from, t.to_state, { label: t.event, global }, `${from}|${t.event}|${t.to_state}`);
		};
		for (const s of model.states) for (const t of s.transitions) addEdge(s.name, t, false);
		for (const t of model.global_transitions) addEdge(ANY, t, true);

		dagre.layout(g);

		const nodes: Node[] = g.nodes().map((id) => {
			const n = g.node(id);
			return {
				id,
				label: n.label as string,
				x: n.x - n.width / 2,
				y: n.y - n.height / 2,
				w: n.width,
				h: n.height,
				start: id === model.start_state,
				any: id === ANY
			};
		});
		const edges: Edge[] = g.edges().map((e) => {
			const d = g.edge(e) as { points: { x: number; y: number }[]; label: string; global: boolean };
			const mid = d.points[Math.floor(d.points.length / 2)] ?? { x: 0, y: 0 };
			return { points: d.points, label: d.label, global: d.global, lx: mid.x, ly: mid.y };
		});
		const gl = g.graph();
		return { nodes, edges, width: gl.width ?? 100, height: gl.height ?? 100 };
	});

	const line = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

	// scale: default fits the graph to the canvas width; +/- override, reset returns to fit
	let canvas = $state<HTMLDivElement>();
	let cw = $state(0);
	const fit = $derived(cw && layout.width ? Math.min(1, (cw - 40) / layout.width) : 1);
	let userScale = $state<number | null>(null);
	const scale = $derived(userScale ?? fit);

	// drag anywhere on the canvas to pan
	let drag = $state<{ x: number; y: number; l: number; t: number } | null>(null);
	function down(e: MouseEvent) {
		if (!canvas) return;
		drag = { x: e.clientX, y: e.clientY, l: canvas.scrollLeft, t: canvas.scrollTop };
	}
	function move(e: MouseEvent) {
		if (!drag || !canvas) return;
		canvas.scrollLeft = drag.l - (e.clientX - drag.x);
		canvas.scrollTop = drag.t - (e.clientY - drag.y);
	}
	const end = () => (drag = null);
</script>

<svelte:window onmousemove={move} onmouseup={end} />

<div class="toolbar">
	<button onclick={() => (userScale = Math.min(scale * 1.25, 3))}>+</button>
	<button onclick={() => (userScale = Math.max(scale / 1.25, 0.1))}>−</button>
	<button onclick={() => (userScale = null)}>fit</button>
	<span class="dim">{model.states.length} states · {Math.round(scale * 100)}% · drag to pan</span>
</div>

<!-- drag-to-pan is a mouse-only enhancement; native scroll keeps it keyboard-accessible -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="canvas"
	bind:this={canvas}
	bind:clientWidth={cw}
	onmousedown={down}
	class:grabbing={!!drag}
>
	<svg
		width={layout.width * scale}
		height={layout.height * scale}
		viewBox="0 0 {layout.width} {layout.height}"
	>
		<defs>
			<marker
				id="arrow"
				viewBox="0 0 10 10"
				refX="9"
				refY="5"
				markerWidth="6"
				markerHeight="6"
				orient="auto-start-reverse"
			>
				<path d="M0,0 L10,5 L0,10 z" fill="#888" />
			</marker>
			<marker
				id="arrowg"
				viewBox="0 0 10 10"
				refX="9"
				refY="5"
				markerWidth="6"
				markerHeight="6"
				orient="auto-start-reverse"
			>
				<path d="M0,0 L10,5 L0,10 z" fill="var(--var)" />
			</marker>
		</defs>

		{#each layout.edges as e, i (i)}
			<polyline
				points={line(e.points)}
				fill="none"
				stroke={e.global ? 'var(--var)' : '#888'}
				stroke-width="1.3"
				marker-end="url(#{e.global ? 'arrowg' : 'arrow'})"
				opacity="0.8"
			/>
			<text x={e.lx} y={e.ly - 3} class="elabel" text-anchor="middle">{e.label}</text>
		{/each}

		{#each layout.nodes as n (n.id)}
			<g>
				<rect
					x={n.x}
					y={n.y}
					width={n.w}
					height={n.h}
					rx="5"
					class="node"
					class:start={n.start}
					class:any={n.any}
				/>
				<text x={n.x + n.w / 2} y={n.y + n.h / 2 + 4} text-anchor="middle" class="nlabel"
					>{n.label}</text
				>
			</g>
		{/each}
	</svg>
</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		padding: 0.5rem 1.25rem;
	}
	.toolbar button {
		background: var(--panel);
		color: var(--fg);
		border: 1px solid #333;
		border-radius: 4px;
		width: 28px;
		height: 26px;
		cursor: pointer;
	}
	.toolbar button:last-of-type {
		width: auto;
		padding: 0 0.5rem;
	}
	.toolbar .dim {
		margin-left: 0.5rem;
		font-size: 0.85rem;
	}
	.canvas {
		overflow: auto;
		max-height: calc(100vh - 160px);
		padding: 0 1.25rem 2rem;
		cursor: grab;
		user-select: none;
	}
	.canvas.grabbing {
		cursor: grabbing;
	}
	.node {
		fill: var(--panel);
		stroke: #555;
		stroke-width: 1;
	}
	.node.start {
		stroke: var(--state);
		stroke-width: 2;
	}
	.node.any {
		fill: #2a2333;
		stroke: var(--var);
	}
	.nlabel {
		fill: var(--state);
		font-family: ui-monospace, Menlo, monospace;
		font-size: 12px;
	}
	.elabel {
		fill: var(--event);
		font-family: ui-monospace, Menlo, monospace;
		font-size: 10px;
		paint-order: stroke;
		stroke: var(--bg);
		stroke-width: 3px;
	}
</style>
