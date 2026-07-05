// Pure FSM graph layout — extracted verbatim from GraphView.svelte so it can run headless (OG image
// generation) and in the interactive view alike. `computeLayout` computes node/edge geometry purely
// from `model` + `cfg`; `edgePath` builds an edge's SVG path. No DOM, no runes, no browser access.

import type { FsmModel } from '$lib/model';

export type EdgeStyle = 'routed' | 'side' | 'bottom';
export type LayoutCfg = {
	edgeStyle: EdgeStyle;
	collapseChains: boolean;
};

const ANY = '★ any state';

// PlayMaker state colour groups: the author picks a colorIndex (0 = default/grey) per state. The
// palette RGBs are PlayMaker's editor palette as replicated by FSMExpress (STATE_COLORS in
// FsmPlaymaker.cs) — PlayMaker only stores the index. Index 0 keeps the neutral panel look;
// unknown indices fall back to default too (FSMExpress clamps to the last colour, a known TODO).
export const STATE_COLORS = [
	'#808080',
	'#748fc9',
	'#3ab6a6',
	'#5da435',
	'#e1fe32',
	'#eb832e',
	'#bb4b4b',
	'#7535a4'
];
// lighter tint used for a transition, keyed by its SOURCE state's group (FSMExpress TRANSITION_COLORS)
export const TRANSITION_COLORS = [
	'#dedede',
	'#c5d5f8',
	'#9fe1d8',
	'#b7e19f',
	'#e1fe66',
	'#ffc698',
	'#e19fa0',
	'#c59fe1'
];
export const stateColor = (i: number) =>
	i > 0 && i < STATE_COLORS.length ? STATE_COLORS[i] : null;
export const transColor = (i: number) =>
	i > 0 && i < TRANSITION_COLORS.length ? TRANSITION_COLORS[i] : null;

export const CHAR = 6.6; // port-mode event/label text metric
export const CHAR_WIDE = 7.3; // routed-mode node width metric
export const HEADER = 24; // state-name header height (top space above the first port row)
export const ROW = 16; // per-transition row height
export const PAD = 16; // horizontal padding (each side)
export const NAME_H = 34; // height of a name-only box (no labelled ports) — gives the label breathing room
export const txt = (s: string) => s.length * CHAR;
export const ROW_H = 20; // chain state row height
export const PAD_Y = 0; // chain box vertical padding
export const DOCK_INSET = 12; // side edge: dock at least this far from a target's corners
export const SIDE_LEAN = 12; // side edge: min horizontal lean so a target straight below still curves gently

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

// a state inside a chain node: its name + the event that transitions to the next state (empty on last)
export type ChainState = { name: string; event: string };

// ty = label y inside the box; (px,py) = the port the edge leaves from; `down` (side mode) means it
// drops straight from the bottom centre rather than leaving the side
// `bare` = an unlabelled default (FINISHED) exit: no label row, edge leaves from the bottom centre
export type Row = {
	event: string;
	to: string;
	ty: number;
	px: number;
	py: number;
	down?: boolean;
	bare?: boolean;
};
export type Node = {
	id: string;
	label: string;
	x: number;
	y: number;
	w: number;
	h: number;
	start: boolean;
	any: boolean;
	/** PlayMaker colour-group index of the head state (0 = default/grey) */
	colorIndex: number;
	rows: Row[];
	/** present when this node is a collapsed linear chain */
	chain?: ChainState[];
};
export type Edge = {
	from: string;
	to: string;
	global: boolean;
	// port-based state transitions (side/bottom):
	down?: boolean;
	up?: boolean; // target docked at its bottom edge (entered from below) rather than its top
	topPort?: boolean; // bottom mode: source port sits on the top edge and leaves upward
	bow?: number; // side mode: horizontal direction the curve leaves the port (matches the port side)
	sx?: number;
	sy?: number;
	tx?: number;
	ty?: number;
	/** transition tint from the source state's colour group (null = default grey); unset for globals */
	color?: string | null;
	/** "back" edge: a DFS back edge (loops to an ancestor of the source in the start-rooted DFS) — dotted */
	back?: boolean;
	/** side mode: dock on the target's left/right edge (horizontal arrival) — a level side-neighbour */
	hdock?: boolean;
	// routed transitions + global arrows (polyline + midpoint label):
	points?: { x: number; y: number }[];
	label?: string;
	lx?: number;
	ly?: number;
};

export type LayoutResult = {
	nodes: Node[];
	edges: Edge[];
	edgeGroups: [Set<string>, Set<string>][];
	width: number;
	height: number;
};

export function computeLayout(model: FsmModel, layoutCfg: LayoutCfg): LayoutResult {
	const style = layoutCfg.edgeStyle;
	const routed = style === 'routed';
	const port = !routed;

	// ── chain detection ──
	const outs = new Map<string, { event: string; to: string }[]>();
	const ins = new Map<string, { event: string; from: string }[]>();
	for (const s of model.states)
		for (const t of s.transitions) {
			(outs.get(s.name) ?? outs.set(s.name, []).get(s.name)!).push({
				event: t.event,
				to: t.to_state
			});
			(ins.get(t.to_state) ?? ins.set(t.to_state, []).get(t.to_state)!).push({
				event: t.event,
				from: s.name
			});
		}
	const isChainLink = (from: string, to: string): boolean => {
		if (!to || from === to || from === ANY || to === ANY) return false;
		const o = outs.get(from) ?? [];
		const i = ins.get(to) ?? [];
		return o.length === 1 && o[0].to === to && i.length === 1 && i[0].from === from;
	};
	const groups: { states: string[]; events: string[] }[] = [];
	if (layoutCfg.collapseChains) {
		const visited = new Set<string>();
		const startChain = (start: string) => {
			if (visited.has(start)) return;
			const states: string[] = [start];
			const events: string[] = [];
			visited.add(start);
			let cur = start;
			while (true) {
				const o = outs.get(cur) ?? [];
				if (o.length !== 1 || !isChainLink(cur, o[0].to)) break;
				const next = o[0].to;
				if (visited.has(next)) break;
				events.push(o[0].event);
				states.push(next);
				visited.add(next);
				cur = next;
			}
			groups.push({ states, events });
		};
		for (const s of model.states) {
			const i = ins.get(s.name) ?? [];
			if (i.length === 1 && isChainLink(i[0].from, s.name)) continue;
			startChain(s.name);
		}
		for (const s of model.states) startChain(s.name);
	} else {
		for (const s of model.states) groups.push({ states: [s.name], events: [] });
	}
	// no ANY node — global transitions render as incoming arrows above their target
	const groupOf = new Map<string, number>();
	groups.forEach((grp, i) => grp.states.forEach((s) => groupOf.set(s, i)));

	// transitions of a state that leave its group (visible ports); intra-chain transitions are hidden.
	// for chain groups we must look at ALL states, since the exit transition may come from the last
	// state in the chain, not the first.
	const transOf = (id: string) => {
		const grp = groupOf.get(id);
		if (grp == null) return [];
		const raw = model.states
			.filter((s) => groupOf.get(s.name) === grp)
			.flatMap((s) => s.transitions);
		return raw.filter((t) => grp !== groupOf.get(t.to_state));
	};
	// FINISHED is PlayMaker's implicit "done" event. On its own it stays an unlabelled bottom edge
	// (no port row); but a state that also has named transitions gets a labelled FINISHED port
	// alongside them — a bare edge there is confusing. FINISHED sorts last, as the default exit.
	const labeledPorts = (id: string) => {
		const t = transOf(id);
		const named = t.filter((x) => x.event !== 'FINISHED');
		const finished = t.filter((x) => x.event === 'FINISHED');
		return named.length > 0 ? [...named, ...finished] : named;
	};

	// width fits the widest state name in the group (a chain renders all of them, not just the head)
	const sizeOf = (names: string[], trans: { event: string }[], chainLen: number) => ({
		width:
			Math.max(...names.map((s) => txt(s) + 4), ...trans.map((t) => txt(t.event) + 16), 40) +
			PAD * 2,
		height:
			chainLen > 1
				? chainLen * ROW_H + PAD_Y * 2 + trans.length * ROW + (trans.length ? 6 : 0)
				: trans.length
					? HEADER + trans.length * ROW + 6
					: NAME_H
	});
	// node geometry: raw PlayMaker editor rects, normalised so the top-left sits near the origin.
	// a collapsed chain is placed at its head state's editor position.
	const raw = groups.map((grp) => model.states.find((s) => s.name === grp.states[0])!.position);
	const minX = Math.min(...raw.map((p) => p.x));
	const minY = Math.min(...raw.map((p) => p.y));
	const posList = raw.map((p, i) => {
		const grp = groups[i];
		const x = p.x - minX + 20;
		const y = p.y - minY + 20;
		// keep the faithful raw rect only for a lone state in `routed` mode; otherwise size to fit
		// the stacked chain states + any ports
		if (grp.states.length === 1 && routed) return { x, y, w: p.w, h: p.h };
		if (port) {
			const sz = sizeOf(grp.states, labeledPorts(grp.states[0]), grp.states.length);
			return { x, y, w: sz.width, h: sz.height };
		}
		const w = Math.max(54, ...grp.states.map((s) => s.length * CHAR_WIDE + 22));
		const h = grp.states.length === 1 ? 30 : grp.states.length * ROW_H + PAD_Y * 2;
		return { x, y, w, h };
	});
	const width = Math.max(...posList.map((p) => p.x + p.w), 80) + 20;
	const height = Math.max(...posList.map((p) => p.y + p.h), 80) + 20;

	const nodes: Node[] = groups.map((grp, i) => {
		const { x: left, y: top, w, h } = posList[i];
		const label = grp.states[0];
		const chain = grp.states.length > 1;
		const colorIndex = model.states.find((s) => s.name === label)?.color_index ?? 0;
		let rows: Row[] = [];
		if (port) {
			const trans = transOf(label);
			const named = trans.filter((t) => t.event !== 'FINISHED');
			const finished = trans.filter((t) => t.event === 'FINISHED');
			// mixed: FINISHED shares the box with named transitions → give it a labelled port too
			const ports = named.length > 0 ? [...named, ...finished] : named;
			const single = ports.length === 1;
			rows = ports.map((t, idx) => ({
				event: t.event,
				to: t.to_state,
				ty: chain
					? top + PAD_Y + grp.states.length * ROW_H + idx * ROW + ROW / 2
					: top + HEADER + idx * ROW + ROW / 2,
				px: left + w / 2, // placeholder; the port slot is assigned below
				py: top + h,
				// in side mode a lone labelled out-edge drops straight down from the bottom centre
				down: style === 'side' && single
			}));
			// FINISHED standing alone: no port row, just an unlabelled default edge from the bottom
			if (named.length === 0)
				for (const t of finished)
					rows.push({
						event: t.event,
						to: t.to_state,
						ty: top + h,
						px: left + w / 2,
						py: top + h,
						down: true,
						bare: true
					});
		}
		return {
			id: label,
			label,
			x: left,
			y: top,
			w,
			h,
			start: grp.states[0] === model.start_state,
			any: false,
			colorIndex,
			rows,
			chain: chain
				? grp.states.map((s, j) => ({
						name: s,
						event: j < grp.events.length ? grp.events[j] : ''
					}))
				: undefined
		};
	});

	// classify "back" edges (drawn dotted) as DFS back edges on the group graph rooted at the start
	// state: an edge to a group still on the recursion stack, i.e. an ancestor the flow is looping
	// back to. This beats a BFS-layer compare, which mislabels the longer of two paths to a shared
	// node as "back" even though it flows forward. DFS runs over groups so it matches the rendered
	// node granularity (a collapsed chain is one vertex).
	const groupAdj: number[][] = groups.map(() => []);
	{
		const seen = groups.map(() => new Set<number>());
		for (const s of model.states) {
			const fg = groupOf.get(s.name);
			if (fg == null) continue;
			for (const t of s.transitions) {
				const tg = groupOf.get(t.to_state);
				if (tg == null || tg === fg || seen[fg].has(tg)) continue;
				seen[fg].add(tg);
				groupAdj[fg].push(tg);
			}
		}
	}
	const backPair = new Set<string>(); // "fromGroup toGroup" indices that are DFS back edges
	{
		const color = groups.map(() => 0); // 0 = unvisited, 1 = on stack, 2 = done
		const startG = model.start_state != null ? groupOf.get(model.start_state) : undefined;
		const roots = startG != null ? [startG, ...groups.map((_, i) => i)] : groups.map((_, i) => i);
		for (const root of roots) {
			if (color[root] !== 0) continue;
			color[root] = 1;
			const stack = [{ u: root, i: 0 }];
			while (stack.length) {
				const top = stack[stack.length - 1];
				if (top.i < groupAdj[top.u].length) {
					const v = groupAdj[top.u][top.i++];
					if (color[v] === 1)
						backPair.add(top.u + ' ' + v); // v is an ancestor on the stack
					else if (color[v] === 0) {
						color[v] = 1;
						stack.push({ u: v, i: 0 });
					}
				} else {
					color[top.u] = 2;
					stack.pop();
				}
			}
		}
	}
	const isBack = (fromId: string, toId: string) => {
		const a = groupOf.get(fromId);
		const b = groupOf.get(toId);
		return a != null && b != null && backPair.has(a + ' ' + b);
	};

	const edges: Edge[] = [];
	if (routed) {
		// routed mode: straight labelled lines between nodes (groups), with
		// endpoints trimmed to each box border along the centre-to-centre line
		const cx = (n: Node) => n.x + n.w / 2;
		const cy = (n: Node) => n.y + n.h / 2;
		const border = (n: Node, tx: number, ty: number) => {
			const dx = tx - cx(n);
			const dy = ty - cy(n);
			if (dx === 0 && dy === 0) return { x: cx(n), y: cy(n) };
			const t = Math.min(
				dx !== 0 ? n.w / 2 / Math.abs(dx) : Infinity,
				dy !== 0 ? n.h / 2 / Math.abs(dy) : Infinity
			);
			return { x: cx(n) + dx * t, y: cy(n) + dy * t };
		};
		for (const s of model.states) {
			const fg = groupOf.get(s.name);
			if (fg == null) continue;
			const from = nodes[fg];
			for (const t of s.transitions) {
				const tg = groupOf.get(t.to_state);
				if (tg == null || tg === fg) continue; // skip intra-chain transitions
				const to = nodes[tg];
				const p0 = border(from, cx(to), cy(to));
				const p1 = border(to, cx(from), cy(from));
				edges.push({
					points: [p0, p1],
					label: t.event,
					global: false,
					color: transColor(from.colorIndex),
					back: isBack(from.id, to.id),
					from: from.id,
					to: to.id,
					lx: (p0.x + p1.x) / 2,
					ly: (p0.y + p1.y) / 2
				});
			}
		}
	} else if (!routed) {
		const cx = (m: Node) => m.x + m.w / 2;
		const byId = new Map(nodes.map((n) => [n.id, n]));
		const srcRow = new Map<Edge, Row>(); // bottom mode: edge → its source row (to re-place the port)
		const sideDock = new Map<Edge, boolean>(); // side mode: edge → source port on the right side (to recompute the bow after re-docking)
		for (const n of nodes) {
			const valid = n.rows
				.map((r) => ({ r, target: nodes[groupOf.get(r.to)!] }))
				.filter((o): o is { r: Row; target: Node } => !!o.target);
			if (style === 'bottom') {
				// edges to a target below leave the bottom edge; back-edges (target above) leave the TOP
				// edge and rise to the target's bottom — so flow stays vertical in both directions. each
				// group spreads left→right by target x so its edges fan out without crossing.
				const isUp = (o: { target: Node }) => o.target.y + o.target.h <= n.y + n.h;
				const place = (arr: { r: Row; target: Node }[], py: number, up: boolean) => {
					for (const o of arr) {
						o.r.py = py;
						const e: Edge = {
							from: n.id,
							to: o.target.id,
							global: n.any,
							color: transColor(n.colorIndex),
							back: isBack(n.id, o.target.id),
							up,
							topPort: up,
							sx: o.r.px,
							sy: py,
							tx: cx(o.target),
							ty: up ? o.target.y + o.target.h : o.target.y
						};
						edges.push(e);
						srcRow.set(e, o.r);
					}
				};
				place(
					valid.filter((o) => !isUp(o)),
					n.y + n.h,
					false
				);
				place(valid.filter(isUp), n.y, true);
			} else {
				// side: a lone out-edge drops straight down; otherwise leave from the side (at the row's
				// y) that's nearer the target
				for (const { r, target } of valid) {
					const tgtCx = cx(target);
					const right = tgtCx >= n.x + n.w / 2;
					if (!r.down) {
						r.px = right ? n.x + n.w : n.x;
						r.py = r.ty;
					}
					const lo = target.x + DOCK_INSET;
					const hi = target.x + target.w - DOCK_INSET;
					const vlo = target.y + DOCK_INSET;
					const vhi = target.y + target.h - DOCK_INSET;
					// which target edge to dock on, by where the port sits vertically: above the target → its
					// top, below it → its bottom, level with it → the facing SIDE (horizontal arrival). the
					// side case keeps a level neighbour from grazing over the top edge to reach a top dock.
					const up = r.py >= target.y + target.h;
					const side = !r.down && !up && r.py > target.y;
					let dockX: number;
					let dockY: number;
					if (side) {
						// dock on the edge facing the source, at the port's height (clamped to the box)
						dockX = r.px >= tgtCx ? target.x + target.w : target.x;
						dockY = clamp(r.py, vlo, vhi);
					} else {
						// dock toward the target's centre, but never past the port on its exit side — that
						// would swing the curve back across the node. so a target off to the port's side gets
						// a natural diagonal curve, while one straight below docks under the port. the
						// swing-limit bound must never cross the target's dock band, else the range inverts
						// and the edge lands beside the node; staying on the target wins over the anti-swing.
						dockX = r.down
							? tgtCx
							: right
								? clamp(tgtCx, Math.min(hi, Math.max(lo, r.px)), hi)
								: clamp(tgtCx, lo, Math.max(lo, Math.min(hi, r.px)));
						dockY = up ? target.y + target.h : target.y;
					}
					// horizontal control offset scaled to the actual gap (plus a small side lean), so a
					// target straight below gets a gentle curve instead of a fixed 50px loop at the port
					const bow = (dockX - r.px) * 0.5 + (right ? SIDE_LEAN : -SIDE_LEAN);
					const e: Edge = {
						from: n.id,
						to: target.id,
						global: n.any,
						color: transColor(n.colorIndex),
						back: isBack(n.id, target.id),
						down: r.down,
						up,
						hdock: side,
						bow,
						sx: r.px,
						sy: r.py,
						tx: dockX,
						ty: dockY
					};
					edges.push(e);
					sideDock.set(e, right);
				}
			}
		}

		// re-pack each node's top and bottom edges: outgoing ports and incoming dock points share the
		// same physical edge, so give them distinct slots (ordered by the other end's x) instead of both
		// gravitating to the centre — otherwise an out-port starts exactly where an in-edge lands
		if (style === 'bottom') {
			const portEdges = edges.filter((e) => srcRow.has(e));
			for (const n of nodes) {
				const repack = (items: { e: Edge; out: boolean }[], py: number) => {
					// order by the other end's x; tie-break by the edge's own identity so a bidirectional
					// pair (which ties — both ends are the same node) lands in the SAME lane at both nodes
					// and runs parallel instead of crossing
					const eid = (e: Edge) => e.from + '\0' + e.to;
					items.sort((a, b) => {
						const ka = a.out ? byId.get(a.e.to)! : byId.get(a.e.from)!;
						const kb = b.out ? byId.get(b.e.to)! : byId.get(b.e.from)!;
						return cx(ka) - cx(kb) || eid(a.e).localeCompare(eid(b.e));
					});
					items.forEach((it, k) => {
						const x = n.x + (n.w * (k + 1)) / (items.length + 1);
						if (it.out) {
							it.e.sx = x;
							srcRow.get(it.e)!.px = x;
							srcRow.get(it.e)!.py = py;
						} else {
							it.e.tx = x;
						}
					});
				};
				const out = portEdges.filter((e) => e.from === n.id);
				const inc = portEdges.filter((e) => e.to === n.id);
				// bottom edge: out-edges leaving downward + in-edges arriving from below
				repack(
					[
						...out.filter((e) => !e.topPort).map((e) => ({ e, out: true })),
						...inc.filter((e) => e.up).map((e) => ({ e, out: false }))
					],
					n.y + n.h
				);
				// top edge: out-edges leaving upward + in-edges arriving from above
				repack(
					[
						...out.filter((e) => e.topPort).map((e) => ({ e, out: true })),
						...inc.filter((e) => !e.up).map((e) => ({ e, out: false }))
					],
					n.y
				);
			}
		}

		// side mode: spread a target's incoming docks across its edge instead of letting them all
		// gravitate to the centre (mirrors the bottom-mode re-pack). outgoing side ports are tied to
		// their label rows and stay put; only the free dock points move. a lone incoming edge keeps
		// its centre/under-port dock. bow is recomputed so the curve still meets the new dock cleanly.
		if (style === 'side') {
			// only top/bottom docks fan across the target's width; side (horizontal) docks keep their y
			const sideEdges = edges.filter((e) => sideDock.has(e) && !e.hdock);
			const dock = (target: Node, inc: Edge[]) => {
				if (inc.length < 2) return;
				inc.sort(
					(a, b) => cx(byId.get(a.from)!) - cx(byId.get(b.from)!) || a.from.localeCompare(b.from)
				);
				inc.forEach((e, k) => {
					const x = target.x + (target.w * (k + 1)) / (inc.length + 1);
					e.tx = x;
					e.bow = (x - e.sx!) * 0.5 + (sideDock.get(e)! ? SIDE_LEAN : -SIDE_LEAN);
				});
			};
			for (const n of nodes) {
				const incoming = sideEdges.filter((e) => e.to === n.id);
				dock(
					n,
					incoming.filter((e) => !e.up)
				); // docking at the top edge
				dock(
					n,
					incoming.filter((e) => e.up)
				); // docking at the bottom edge (back-edges)
			}
		}
	}

	// global transitions: short incoming arrows above each target, spread horizontally when multiple
	const globalsByTarget = new Map<string, { event: string }[]>();
	for (const t of model.global_transitions) {
		(globalsByTarget.get(t.to_state) ?? globalsByTarget.set(t.to_state, []).get(t.to_state)!).push({
			event: t.event
		});
	}
	for (const [targetName, gtrans] of globalsByTarget) {
		const targetGroup = groupOf.get(targetName);
		if (targetGroup == null) continue;
		const target = nodes[targetGroup];
		if (!target) continue;
		const n = gtrans.length;
		gtrans.forEach((gt, j) => {
			const cx = target.x + (target.w * (j + 1)) / (n + 1);
			const yOff = 28 + (n - 1 - j) * 22;
			edges.push({
				points: [
					{ x: cx, y: target.y - yOff },
					{ x: cx, y: target.y }
				],
				label: '★ ' + gt.event,
				global: true,
				from: ANY,
				to: target.id,
				lx: cx,
				ly: target.y - yOff + 12
			});
		});
	}

	const edgeGroups: [Set<string>, Set<string>][] = edges.map((e) => {
		const fg =
			e.from === ANY
				? new Set<string>()
				: new Set(groups.find((grp) => grp.states[0] === e.from)?.states ?? []);
		const tg = new Set(groups.find((grp) => grp.states[0] === e.to)?.states ?? []);
		return [fg, tg];
	});

	return { nodes, edges, edgeGroups, width, height };
}

export const line = (pts: { x: number; y: number }[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

// cubic curve from a port to the target: bottom/lone ports leave straight down, side ports leave
// horizontally toward their own side; the target is approached from above (top dock) or, for a
// back-edge, from below (bottom dock, `up`). distinct out/in slots (see re-pack pass) already keep
// opposing edges apart, so a vertically-aligned edge stays straight.
export const edgePath = (e: Edge, edgeStyle: EdgeStyle) => {
	const vertical = edgeStyle === 'bottom' || e.down;
	// cap both control arms to a fraction of the drop so a short edge can't place c1 below c2 — that
	// crossing makes the curve dip down, back up, then down again between two close states
	const off = Math.min(Math.abs(e.ty! - e.sy!) * 0.45, vertical ? 40 : 50);
	// side ports leave horizontally toward their own side; the bow is scaled to the horizontal gap
	// upstream (see the layout pass), so a target straight below gets a gentle lean rather than a hook
	const sideBow = e.bow ?? (e.tx! < e.sx! ? -50 : 50);
	const c1 = vertical
		? `${e.sx!} ${e.sy! + (e.topPort ? -off : off)}`
		: `${e.sx! + sideBow} ${e.sy!}`;
	let c2: string;
	if (e.hdock) {
		// side dock: approach the target's edge horizontally from the source's side, so the tip enters
		// the near face level instead of dropping onto the top
		const hoff = Math.min(Math.abs(e.tx! - e.sx!) * 0.45, 50) * (e.sx! >= e.tx! ? 1 : -1);
		c2 = `${e.tx! + hoff} ${e.ty!}`;
	} else {
		// lean the end control point toward the source so the tip's tangent (c2 → dock) follows the
		// curve's actual diagonal instead of always pointing straight into the edge. capped at `off`
		// (≤45° from vertical) so a steeply-offset dock still tucks in cleanly rather than skewing flat.
		const lean = clamp((e.tx! - e.sx!) * 0.4, -off, off);
		c2 = e.up ? `${e.tx! - lean} ${e.ty! + off}` : `${e.tx! - lean} ${e.ty! - off}`;
	}
	return `M ${e.sx!} ${e.sy!} C ${c1}, ${c2}, ${e.tx!} ${e.ty!}`;
};
