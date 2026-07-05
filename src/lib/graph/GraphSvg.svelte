<script lang="ts">
	// Presentational SVG body for the FSM graph: the arrowhead <defs> + the edge and node groups.
	// Pure and SSR-safe — no pan/zoom, no browser access, no internal state. The interactive
	// GraphView wraps this inside its own zoom <g>; the OG image generator renders it via
	// svelte/server. Colours use the same CSS classes / `var(--…)` as before, so the live view is
	// unchanged; a caller can override the palette by setting the vars via the `style` prop on the
	// root <g>. Clicks are surfaced through the optional `onselect` callback (undefined = inert).
	import {
		edgePath,
		line,
		stateColor,
		PAD_Y,
		ROW_H,
		type LayoutResult,
		type EdgeStyle
	} from '$lib/graph/layout';

	let {
		layout,
		edgeStyle,
		selected = null,
		onselect,
		style
	}: {
		layout: LayoutResult;
		edgeStyle: EdgeStyle;
		selected?: string | null;
		onselect?: (name: string | null) => void;
		style?: string;
	} = $props();
</script>

<g {style}>
	<defs>
		<!-- single arrowhead for every edge: `markerUnits=userSpaceOnUse` keeps its size constant
		     regardless of the (thicker) stroke a hot edge uses, and `fill=context-stroke` makes the
		     tip inherit the edge's own colour (transition tint, global var, selection accent, …) -->
		<marker
			id="arrow"
			viewBox="0 0 10 10"
			refX="9"
			refY="5"
			markerWidth="8"
			markerHeight="8"
			markerUnits="userSpaceOnUse"
			orient="auto-start-reverse"
		>
			<path d="M0,0 L10,5 L0,10 z" fill="context-stroke" />
		</marker>
	</defs>

	{#each layout.edges as e, i (i)}
		{@const hot =
			selected != null &&
			(layout.edgeGroups[i][0].has(selected) || layout.edgeGroups[i][1].has(selected))}
		{#if e.points}
			<!-- routed transition or global arrow: polyline with midpoint label -->
			<polyline
				points={line(e.points)}
				fill="none"
				stroke={hot ? 'var(--accent)' : e.global ? 'var(--var)' : (e.color ?? '#888')}
				stroke-width={hot ? 2.2 : 1.3}
				stroke-dasharray={e.back ? '2 3' : undefined}
				marker-end="url(#arrow)"
				opacity={selected == null ? 0.8 : hot ? 1 : 0.18}
				pointer-events="none"
			/>
			<text
				x={e.lx}
				y={e.ly! - 3}
				class="elabel"
				class:hot
				text-anchor="middle"
				opacity={selected == null || hot ? 1 : 0.2}>{e.label === 'FINISHED' ? '' : e.label}</text
			>
		{:else}
			<path
				d={edgePath(e, edgeStyle)}
				fill="none"
				stroke={hot ? 'var(--accent)' : (e.color ?? '#888')}
				stroke-width={hot ? 2 : 1.2}
				stroke-dasharray={e.back ? '2 3' : undefined}
				marker-end="url(#arrow)"
				opacity={selected == null ? 0.55 : hot ? 1 : 0.1}
				pointer-events="none"
			/>
		{/if}
	{/each}

	{#each layout.nodes as n (n.id)}
		{@const nodeFill = stateColor(n.colorIndex)}
		<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
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
				class:sel={n.chain ? n.chain.some((s) => s.name === selected) : selected === n.id}
				class:clickable={!n.any}
				style={nodeFill ? `fill: color-mix(in srgb, ${nodeFill} 22%, var(--panel))` : ''}
				onclick={() => {
					if (!n.any) onselect?.(n.id);
				}}
			/>
			{#if n.chain}
				{#each n.chain as s, j (s.name)}
					{#if j > 0}
						<line
							x1={n.x + 6}
							y1={n.y + PAD_Y + j * ROW_H}
							x2={n.x + n.w - 6}
							y2={n.y + PAD_Y + j * ROW_H}
							class="chain-divider"
						/>
					{/if}
					<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
					<rect
						x={n.x}
						y={n.y + PAD_Y + j * ROW_H}
						width={n.w}
						height={ROW_H}
						class="chain-slot"
						class:sel={selected === s.name}
						onclick={() => onselect?.(s.name)}
					/>
					<text
						x={n.x + n.w / 2}
						y={n.y + PAD_Y + j * ROW_H + 14}
						text-anchor="middle"
						class="nlabel"
						class:sel={selected === s.name}
						style="pointer-events: none">{s.name}</text
					>
					{#if s.event && s.event !== 'FINISHED' && j < n.chain.length - 1}
						<text x={n.x + n.w + 4} y={n.y + PAD_Y + (j + 1) * ROW_H - 2} class="chain-arrow"
							>↓</text
						>
						<text x={n.x + n.w + 14} y={n.y + PAD_Y + (j + 1) * ROW_H + 2} class="chain-event"
							>{s.event}</text
						>
					{/if}
				{/each}
			{:else}
				<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
				<rect
					x={n.x}
					y={n.y}
					width={n.w}
					height={n.h}
					rx="5"
					class="node-slot"
					onclick={() => {
						if (!n.any) onselect?.(n.id);
					}}
				/>
				<!-- centre the name when there are no labelled ports (routed, or a name-only box) -->
				{@const centered = edgeStyle === 'routed' || !n.rows.some((r) => !r.bare)}
				<text
					x={n.x + n.w / 2}
					y={centered ? n.y + n.h / 2 + 4 : n.y + 16}
					text-anchor="middle"
					class="nlabel"
					class:sel={selected === n.id}
					style="pointer-events: none">{n.label}</text
				>
			{/if}
			{#each n.rows as r (r.event + r.to)}
				<!-- a chain's exit transitions all leave from its LAST state, so highlight the ports
				     when that state (not the chain head) is selected -->
				{@const owner = n.chain ? n.chain[n.chain.length - 1].name : n.id}
				{@const lit = selected === owner || selected === r.to}
				<!-- `bare` rows (FINISHED) have no labelled port; only the edge is drawn -->
				{#if !r.bare}
					{#if edgeStyle === 'bottom' && n.rows.length > 1}
						<!-- faint wire linking the event row to its (target-ordered) bottom port;
						     a lone transition needs none — its port sits centred under the row -->
						<path
							class="wire"
							class:hot={lit}
							d="M {n.x + 6} {r.ty} C {n.x + 6} {(r.ty + r.py) / 2}, {r.px} {(r.ty + r.py) /
								2}, {r.px} {r.py}"
						/>
					{/if}
					<text x={n.x + 10} y={r.ty + 3} class="erow" class:hot={lit}>{r.event}</text>
					<circle cx={r.px} cy={r.py} r="2" class="port" class:hot={lit} />
				{/if}
			{/each}
		</g>
	{/each}
</g>

<style>
	.node {
		fill: var(--panel);
		stroke: #555;
		stroke-width: 1;
	}
	.node.clickable {
		cursor: pointer;
	}
	.node.start {
		stroke: var(--state);
		stroke-width: 2;
	}
	.node.any {
		fill: #2a2333;
		stroke: var(--var);
	}
	.node.sel {
		stroke: var(--accent);
		stroke-width: 2.5;
	}
	.nlabel {
		fill: var(--state);
		font-family: ui-monospace, Menlo, monospace;
		font-size: 13px;
	}
	.nlabel.sel {
		fill: var(--accent);
	}
	.elabel {
		fill: var(--event);
		font-family: ui-monospace, Menlo, monospace;
		font-size: 11px;
		paint-order: stroke;
		stroke: var(--bg);
		stroke-width: 3px;
		pointer-events: none;
	}
	.elabel.hot {
		fill: var(--accent);
		font-weight: 600;
	}
	.erow {
		fill: var(--event);
		font-family: ui-monospace, Menlo, monospace;
		font-size: 11px;
		pointer-events: none;
	}
	.erow.hot {
		fill: var(--accent);
	}
	.port {
		fill: #888;
		pointer-events: none;
	}
	.port.hot {
		fill: var(--accent);
	}
	.wire {
		fill: none;
		stroke: #4a4a4a;
		stroke-width: 1;
	}
	.wire.hot {
		stroke: var(--accent);
	}
	.chain-divider {
		stroke: #444;
		stroke-width: 1;
		pointer-events: none;
	}
	.node-slot {
		fill: transparent;
		cursor: pointer;
	}
	.node-slot:hover {
		fill: color-mix(in srgb, var(--fg) 8%, transparent);
	}
	.chain-slot {
		fill: transparent;
		cursor: pointer;
	}
	.chain-slot.sel {
		fill: color-mix(in srgb, var(--accent) 15%, transparent);
	}
	.chain-slot:hover {
		fill: color-mix(in srgb, var(--fg) 8%, transparent);
	}
	.chain-arrow {
		fill: var(--dim);
		font-family: ui-monospace, Menlo, monospace;
		font-size: 10px;
		pointer-events: none;
	}
	.chain-event {
		fill: var(--event);
		font-family: ui-monospace, Menlo, monospace;
		font-size: 10px;
		opacity: 0.7;
		pointer-events: none;
	}
</style>
