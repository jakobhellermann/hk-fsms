// Mirror of the indexer's `hierarchy::Root` JSON plus the 2D geometry and categorization used by the
// colliders view.

import type { Action, FsmModel, GoRef, ObjectRef } from './model';

export type Vec2 = [number, number];

/** `[a, b, c, d, tx, ty]`: maps `(x, y)` to `(a·x + c·y + tx, b·x + d·y + ty)` */
export type Affine2 = [number, number, number, number, number, number];

export interface HNode {
	name: string;
	active: boolean;
	layer: string;
	/** custom tag; Unity's builtin tags are left out */
	tag?: string;
	/** this node's local space → the owner's frame */
	matrix: Affine2;
	components?: HComponent[];
	colliders?: HCollider[];
	children?: HNode[];
}

export interface HRoot extends HNode {
	external?: HExternal[];
}

/** a GameObject the FSM references outside the owner's subtree */
export interface HExternal {
	path: string;
	parents_active: boolean;
	node: HNode;
}

export interface HComponent {
	class: string;
	enabled: boolean;
	fsm?: string;
	template?: string;
}

export type HShape =
	| { shape: 'box'; size: Vec2 }
	| { shape: 'circle'; radius: number }
	| { shape: 'capsule'; size: Vec2; direction: number }
	| { shape: 'polygon'; paths: Vec2[][] }
	| { shape: 'edge'; points: Vec2[] };

export type HCollider = HShape & { offset: Vec2; trigger: boolean; enabled: boolean };

// Categories and colors of Silksong.DebugMod's HitboxRender, plus HealthManager.
export type Category =
	| 'enemy'
	| 'terrain'
	| 'nonSliderTerrain'
	| 'attack'
	| 'hazardRespawn'
	| 'gate'
	| 'breakable'
	| 'trigger'
	| 'healthManager'
	| 'nonMantleRegion'
	| 'alertRegion'
	| 'other';

export const CATEGORIES: { id: Category; label: string; color: string }[] = [
	{ id: 'enemy', label: 'damages hero', color: 'rgb(204, 0, 0)' },
	{ id: 'attack', label: 'damages enemies', color: 'rgb(0, 255, 255)' },
	{ id: 'healthManager', label: 'health manager', color: 'rgb(255, 77, 255)' },
	{ id: 'terrain', label: 'terrain', color: 'rgb(0, 204, 0)' },
	{ id: 'nonSliderTerrain', label: 'non-slider terrain', color: 'rgb(0, 204, 153)' },
	{ id: 'trigger', label: 'trigger', color: 'rgb(128, 128, 255)' },
	{ id: 'breakable', label: 'breakable', color: 'rgb(255, 191, 204)' },
	{ id: 'gate', label: 'transition', color: 'rgb(0, 0, 128)' },
	{ id: 'hazardRespawn', label: 'hazard respawn', color: 'rgb(128, 0, 128)' },
	{ id: 'nonMantleRegion', label: 'no clamber', color: 'rgb(0, 77, 0)' },
	{ id: 'alertRegion', label: 'alert range', color: 'rgb(230, 153, 102)' },
	{ id: 'other', label: 'other', color: 'rgb(179, 179, 179)' }
];

export const categoryColor = (c: Category) => CATEGORIES.find((x) => x.id === c)!.color;

const has = (node: HNode, cls: string) => node.components?.some((c) => c.class === cls) ?? false;
const hasFsm = (node: HNode, name: string) =>
	node.components?.some((c) => c.class === 'PlayMakerFSM' && c.fsm === name) ?? false;
const hasTemplate = (node: HNode, name: string) =>
	node.components?.some((c) => c.class === 'PlayMakerFSM' && c.template === name) ?? false;

/** `HitboxRender.CategorizeHitbox` in its detailed mode, with `HealthManager` split out of "other". */
export function categorize(node: HNode, collider: HCollider, parent: HNode | null): Category {
	if (
		has(node, 'DamageHero') ||
		hasFsm(node, 'damages_hero') ||
		hasTemplate(node, 'hornet_multi_wounder') ||
		has(node, 'CogMultiHitter') ||
		(has(node, 'TriggerEnterEvent') && parent !== null && has(parent, 'RangeAttackGroup'))
	)
		return 'enemy';
	if (node.layer === 'Terrain') return has(node, 'NonSlider') ? 'nonSliderTerrain' : 'terrain';
	if (
		has(node, 'DamageEnemies') ||
		hasFsm(node, 'damages_enemy') ||
		(node.name === 'Damager' && hasFsm(node, 'Damage'))
	)
		return 'attack';
	if (collider.trigger && has(node, 'HazardRespawnTrigger')) return 'hazardRespawn';
	if (collider.trigger && has(node, 'TransitionPoint')) return 'gate';
	if (has(node, 'Breakable') || node.layer === 'Interactive Object')
		return has(node, 'Lever_tk2d') || has(node, 'Lever') ? 'trigger' : 'breakable';
	if (
		has(node, 'HarpoonHook') ||
		has(node, 'Lever_tk2d') ||
		has(node, 'Lever') ||
		node.tag === 'Geo'
	)
		return 'trigger';
	if (has(node, 'HealthManager')) return 'healthManager';
	if (node.components?.some((c) => c.class === 'NoClamberRegion' && c.enabled))
		return 'nonMantleRegion';
	if (has(node, 'AlertRange')) return 'alertRegion';
	return 'other';
}

function apply([a, b, c, d, tx, ty]: Affine2, [x, y]: Vec2): Vec2 {
	return [a * x + c * y + tx, b * x + d * y + ty];
}

/** One drawable collider outline in the owner's frame. */
export interface Outline {
	node: HNode;
	/** full GameObject path of the collider's node */
	nodePath: string;
	/** list label: relative to the owner, or the full path for external nodes */
	label: string;
	external: boolean;
	/** position among the parent's children in hierarchy order */
	siblingIndex: number;
	collider: HCollider;
	category: Category;
	/** active in hierarchy and enabled */
	live: boolean;
	ignoreRaycast: boolean;
	/** closed polylines, or open ones for edge colliders */
	polylines: Vec2[][];
	closed: boolean;
}

const CIRCLE_SEGMENTS = 48;

function circle(cx: number, cy: number, r: number): Vec2[] {
	return Array.from({ length: CIRCLE_SEGMENTS }, (_, i) => {
		const a = (i / CIRCLE_SEGMENTS) * 2 * Math.PI;
		return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Vec2;
	});
}

/** stadium shape: two half circles joined along `direction` (0 = vertical, 1 = horizontal) */
function capsule(cx: number, cy: number, [w, h]: Vec2, direction: number): Vec2[] {
	const vertical = direction === 0;
	const r = (vertical ? w : h) / 2;
	const half = Math.max(0, (vertical ? h : w) / 2 - r);
	const n = CIRCLE_SEGMENTS / 2;
	const pts: Vec2[] = [];
	for (const [sign, start] of [
		[1, 0],
		[-1, Math.PI]
	] as const) {
		for (let i = 0; i <= n; i++) {
			const a = start + (vertical ? 0 : -Math.PI / 2) + (i / n) * Math.PI;
			const [ox, oy] = vertical ? [0, sign * half] : [sign * half, 0];
			pts.push([cx + ox + r * Math.cos(a), cy + oy + r * Math.sin(a)]);
		}
	}
	return pts;
}

/** local-space polylines of a collider (offset applied) */
function localPolylines(c: HCollider): { polylines: Vec2[][]; closed: boolean } {
	const [ox, oy] = c.offset;
	const shift = (pts: Vec2[]) => pts.map(([x, y]) => [x + ox, y + oy] as Vec2);
	switch (c.shape) {
		case 'box': {
			const [hw, hh] = [c.size[0] / 2, c.size[1] / 2];
			return {
				polylines: [
					shift([
						[-hw, hh],
						[hw, hh],
						[hw, -hh],
						[-hw, -hh]
					])
				],
				closed: true
			};
		}
		case 'circle':
			return { polylines: [circle(ox, oy, c.radius)], closed: true };
		case 'capsule':
			return { polylines: [capsule(ox, oy, c.size, c.direction)], closed: true };
		case 'polygon':
			return { polylines: c.paths.map(shift), closed: true };
		case 'edge':
			return { polylines: [shift(c.points)], closed: false };
	}
}

/** All collider outlines of a hierarchy, in the owner's frame (see the indexer's `Walker::hierarchy`). */
export function outlines(root: HRoot, ownerPath: string): Outline[] {
	const out: Outline[] = [];
	const visit = (
		node: HNode,
		parent: HNode | null,
		path: string[],
		activeInHierarchy: boolean,
		base: { path: string; external: boolean },
		siblingIndex: number
	) => {
		const active = activeInHierarchy && node.active;
		const rel = path.join('/');
		const nodePath = rel ? `${base.path}/${rel}` : base.path;
		for (const collider of node.colliders ?? []) {
			const local = localPolylines(collider);
			out.push({
				node,
				nodePath,
				label: base.external ? nodePath : rel || node.name,
				external: base.external,
				siblingIndex,
				collider,
				category: categorize(node, collider, parent),
				live: active && collider.enabled,
				ignoreRaycast: node.layer === 'Ignore Raycast',
				polylines: local.polylines.map((pl) => pl.map((p) => apply(node.matrix, p))),
				closed: local.closed
			});
		}
		const rank = new Map((node.children ?? []).map((c) => [c, subtreeRank(c, node)]));
		const children = [...(node.children ?? [])].sort((a, b) => rank.get(a)! - rank.get(b)!);
		for (const child of children)
			visit(child, node, [...path, child.name], active, base, node.children!.indexOf(child));
	};
	visit(root, null, [], root.active, { path: ownerPath, external: false }, 0);
	for (const ext of root.external ?? [])
		visit(ext.node, null, [], ext.parents_active, { path: ext.path, external: true }, 0);
	return out;
}

const isUnder = (path: string, root: string) => path === root || path.startsWith(`${root}/`);

/**
 * whether an outline belongs to a target from `linkTargets` — its GameObject, or with `subtree` also
 * anything below it
 */
export function matchesTarget(
	o: Outline,
	target: string,
	outlinesList: Outline[],
	subtree = false
): boolean {
	const at = (root: string) => (subtree ? isUnder(o.nodePath, root) : o.nodePath === root);
	if (!target.endsWith('/*')) return at(target);
	// first AlertRange child of the parent, in hierarchy order
	const parent = target.slice(0, -2);
	const first = outlinesList
		.filter(
			(x) =>
				x.nodePath.startsWith(`${parent}/`) &&
				!x.nodePath.slice(parent.length + 1).includes('/') &&
				x.node.components?.some((c) => c.class === 'AlertRange')
		)
		.sort((a, b) => a.siblingIndex - b.siblingIndex)[0];
	return first !== undefined && at(first.nodePath);
}

/** every GameObject path in a hierarchy file; each has colliders at or below it */
export function nodePaths(root: HRoot, owner: string): Set<string> {
	const out = new Set<string>();
	const visit = (node: HNode, path: string) => {
		out.add(path);
		for (const c of node.children ?? []) visit(c, `${path}/${c.name}`);
	};
	visit(root, owner);
	for (const ext of root.external ?? []) visit(ext.node, ext.path);
	return out;
}

/** Svelte context the FSM detail view provides for linking actions to the colliders view. */
export const COLLIDER_LINKS = Symbol('collider links');
export interface ColliderLinks {
	owner: string;
	/** whether a target from `linkTargets` has colliders to show */
	known: (target: string) => boolean;
	href: (targets: string[]) => string;
}

/** the param of an alert range action that names its range (see `alertRangeTargets`) */
function alertRangeParam(a: Action): string | null {
	if (a.class === 'CheckAlertRangeByName') return 'alertRangeName';
	if (a.class === 'CheckAlertRange') return 'alertRange';
	return null;
}

const refPath = (r: ObjectRef) =>
	r.file === null && r.target.kind === 'Path' ? r.target.target.split('@')[0] : null;

function goRefPath(ref: GoRef, model: FsmModel, owner: string): string | null {
	if (ref === 'SelfOwner') return owner;
	if ('Object' in ref) return refPath(ref.Object);
	const v = model.variables.find((x) => x.name === ref.Var)?.value;
	return v?.type === 'Object' ? refPath(v.value) : null;
}

const param = (a: Action, name: string) => a.params.find((p) => p.name === name)?.value;

/**
 * param name → GameObject paths it points at: the alert range of alert range actions (see
 * `alertRangeTargets`), else any param holding a fixed or variable GameObject reference. The owner
 * itself (`Self`) is left out, as nearly every action targets it.
 */
export function linkTargets(a: Action, model: FsmModel, owner: string): Map<string, string[]> {
	const out = new Map<string, string[]>();
	const rangeParam = alertRangeParam(a);
	if (rangeParam) {
		const ranges = alertRangeTargets(a, model, owner);
		if (ranges.length) out.set(rangeParam, ranges);
	}
	for (const p of a.params) {
		const v = p.value;
		if (out.has(p.name) || p.name === rangeParam) continue;
		if (v.type !== 'GameObject' && v.type !== 'Object' && v.type !== 'Owner') continue;
		if (v.value === 'SelfOwner') continue;
		const path = goRefPath(v.value, model, owner);
		if (path !== null) out.set(p.name, [path]);
	}
	return out;
}

/** `AlertRange.Find(parent, name)`: the direct child of that name, or the first AlertRange child */
const findChild = (parent: string, name: string) =>
	name === '' ? `${parent}/*` : `${parent}/${name}`;

/**
 * GameObject paths of the AlertRanges an action checks (`<parent>/*` = the parent's first AlertRange
 * child). A variable that holds no reference resolves through the `FindAlertRange` actions storing it.
 */
export function alertRangeTargets(a: Action, model: FsmModel, owner: string): string[] {
	if (a.class === 'CheckAlertRangeByName') {
		const name = param(a, 'alertRangeName');
		return name?.type === 'Str' ? [findChild(owner, name.value)] : [];
	}
	if (a.class !== 'CheckAlertRange') return [];
	const range = param(a, 'alertRange');
	if (range?.type !== 'Object') return [];
	const direct = goRefPath(range.value, model, owner);
	if (direct !== null) return [direct];
	// an unset variable: whatever FindAlertRange stores into it
	if (range.value === 'SelfOwner' || !('Var' in range.value)) return [];
	const variable = range.value.Var;
	const found = new Set<string>();
	for (const s of model.states)
		for (const f of s.actions) {
			if (f.class !== 'FindAlertRange') continue;
			const store = param(f, 'storeResult');
			const target = param(f, 'target');
			const name = param(f, 'childName');
			if (
				store?.type !== 'Object' ||
				typeof store.value !== 'object' ||
				!('Var' in store.value) ||
				store.value.Var !== variable ||
				(target?.type !== 'Owner' && target?.type !== 'GameObject') ||
				name?.type !== 'Str'
			)
				continue;
			const parent = goRefPath(target.value, model, owner);
			if (parent !== null) found.add(findChild(parent, name.value));
		}
	return [...found];
}

const categoryRank = (c: Category) => CATEGORIES.findIndex((x) => x.id === c);

/** sibling sort key: the first-listed category among the node's own colliders, else its subtree's */
function subtreeRank(node: HNode, parent: HNode): number {
	const own = (node.colliders ?? []).map((c) => categoryRank(categorize(node, c, parent)));
	if (own.length) return Math.min(...own);
	return Math.min(Infinity, ...(node.children ?? []).map((c) => subtreeRank(c, node)));
}

export function bounds(list: Outline[]): {
	minX: number;
	minY: number;
	maxX: number;
	maxY: number;
} {
	let [minX, minY, maxX, maxY] = [Infinity, Infinity, -Infinity, -Infinity];
	for (const o of list)
		for (const pl of o.polylines)
			for (const [x, y] of pl) {
				minX = Math.min(minX, x);
				minY = Math.min(minY, y);
				maxX = Math.max(maxX, x);
				maxY = Math.max(maxY, y);
			}
	if (minX > maxX) return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
	return { minX, minY, maxX, maxY };
}
