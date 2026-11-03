// Pan/zoom of an SVG canvas via pointer events (mouse, touch, pen): one pointer pans, two
// pinch-zoom, the wheel zooms around the cursor.

export interface View {
	tx: number;
	ty: number;
	k: number;
}

export class PanZoom {
	/** the pinned view; `null` follows `fallback` (e.g. fit-to-canvas) until the first interaction */
	view = $state<View | null>(null);
	/** a single pointer is panning */
	dragging = $state(false);
	/** whether the current gesture moved, i.e. isn't a tap */
	moved = false;

	#pointers = new Map<number, { x: number; y: number }>();
	#drag: { x: number; y: number; tx: number; ty: number } | null = null;
	#pinch: { dist: number; cx: number; cy: number; k: number; tx: number; ty: number } | null = null;
	#wheel = { accum: 0, x: 0, y: 0, raf: 0 };

	constructor(
		private fallback: () => View,
		private canvas: () => HTMLElement | undefined,
		private limits: { min: number; max: number }
	) {}

	get cur(): View {
		return this.view ?? this.fallback();
	}

	#clampK(k: number) {
		return Math.min(this.limits.max, Math.max(this.limits.min, k));
	}

	#origin() {
		const rect = this.canvas()?.getBoundingClientRect();
		return { left: rect?.left ?? 0, top: rect?.top ?? 0 };
	}

	zoomAround(mx: number, my: number, factor: number) {
		const cur = this.cur;
		const k = this.#clampK(cur.k * factor);
		const r = k / cur.k;
		this.view = { tx: mx - (mx - cur.tx) * r, ty: my - (my - cur.ty) * r, k };
	}

	// coalesce wheel events to one zoom per animation frame: trackpads fire far faster than 60 Hz and
	// each `view` write forces a synchronous repaint of the whole SVG. summed deltas compose exactly
	// (exp is multiplicative), so batching is lossless.
	wheel(e: WheelEvent) {
		e.preventDefault();
		const { left, top } = this.#origin();
		const w = this.#wheel;
		w.x = e.clientX - left;
		w.y = e.clientY - top;
		w.accum += e.deltaY;
		if (!w.raf)
			w.raf = requestAnimationFrame(() => {
				w.raf = 0;
				this.zoomAround(w.x, w.y, Math.exp(-w.accum * 0.0015));
				w.accum = 0;
			});
	}

	#startPinch() {
		const { left, top } = this.#origin();
		const [a, b] = [...this.#pointers.values()];
		const cur = this.cur;
		this.#pinch = {
			dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
			cx: (a.x + b.x) / 2 - left,
			cy: (a.y + b.y) / 2 - top,
			k: cur.k,
			tx: cur.tx,
			ty: cur.ty
		};
	}

	#startDrag(x: number, y: number) {
		this.#drag = { x, y, tx: this.cur.tx, ty: this.cur.ty };
		this.dragging = true;
	}

	down(e: PointerEvent) {
		if (e.button > 0) return; // ignore right/middle mouse buttons
		this.#pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		this.moved = false;
		if (this.#pointers.size >= 2) {
			this.#startPinch();
			this.#drag = null;
			this.dragging = false;
			return;
		}
		this.#startDrag(e.clientX, e.clientY);
	}

	move(e: PointerEvent) {
		if (this.#pointers.has(e.pointerId))
			this.#pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
		const pinch = this.#pinch;
		if (pinch && this.#pointers.size >= 2) {
			const { left, top } = this.#origin();
			const [a, b] = [...this.#pointers.values()];
			const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
			const midx = (a.x + b.x) / 2 - left;
			const midy = (a.y + b.y) / 2 - top;
			const k = this.#clampK((pinch.k * dist) / pinch.dist);
			const r = k / pinch.k;
			// pin the point under the start midpoint while following the fingers' midpoint (so a
			// two-finger move also pans)
			this.view = { tx: midx - (pinch.cx - pinch.tx) * r, ty: midy - (pinch.cy - pinch.ty) * r, k };
			this.moved = true;
			return;
		}
		const drag = this.#drag;
		if (!drag) return;
		if (Math.abs(e.clientX - drag.x) > 3 || Math.abs(e.clientY - drag.y) > 3) this.moved = true;
		this.view = {
			tx: drag.tx + (e.clientX - drag.x),
			ty: drag.ty + (e.clientY - drag.y),
			k: this.cur.k
		};
	}

	/** whether this ended a tap: the last pointer lifted without the gesture moving */
	end(e: PointerEvent): boolean {
		this.#pointers.delete(e.pointerId);
		if (this.#pointers.size < 2) this.#pinch = null;
		if (this.#pointers.size === 0) {
			const tap = this.#drag !== null && !this.moved;
			this.#drag = null;
			this.dragging = false;
			return tap;
		}
		if (this.#pointers.size === 1) {
			// one finger lifted after a pinch — resume panning from the remaining finger without a jump
			const [p] = [...this.#pointers.values()];
			this.#startDrag(p.x, p.y);
		}
		return false;
	}
}
