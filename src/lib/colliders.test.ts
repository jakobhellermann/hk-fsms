import { describe, expect, it } from 'vitest';
import {
	type HCollider,
	type HNode,
	alertRangeTargets,
	categorize,
	linkTargets,
	matchesTarget,
	nodePaths,
	outlines
} from './colliders';
import type { Action, FsmModel, ParamValue } from './model';

const box = (size: [number, number], offset: [number, number] = [0, 0]): HCollider => ({
	shape: 'box',
	size,
	offset,
	trigger: true,
	enabled: true
});

const node = (over: Partial<HNode>): HNode => ({
	name: 'n',
	active: true,
	layer: 'Default',
	matrix: [1, 0, 0, 1, 0, 0],
	...over
});

const comp = (cls: string, extra: object = {}) => ({ class: cls, enabled: true, ...extra });

const close = (actual: number[][], expected: number[][]) =>
	actual.forEach((p, i) => p.forEach((v, j) => expect(v).toBeCloseTo(expected[i][j])));

describe('outlines', () => {
	it('places each collider by its node matrix, after the collider offset', () => {
		// mirrored in x, then moved by (10, -5)
		const root = node({ matrix: [-1, 0, 0, 1, 10, -5], colliders: [box([2, 2], [1, 0])] });
		close(outlines(root, 'Owner')[0].polylines[0], [
			[10, -4],
			[8, -4],
			[8, -6],
			[10, -6]
		]);
	});

	it('groups siblings by category, keeping hierarchy order within a category and subtrees intact', () => {
		const alert = (name: string) =>
			node({ name, components: [comp('AlertRange')], colliders: [box([1, 1])] });
		const root = node({
			children: [
				alert('Mid'),
				node({
					name: 'Slash',
					children: [
						node({ name: 'Hit', components: [comp('DamageHero')], colliders: [box([1, 1])] })
					]
				}),
				alert('Close')
			]
		});
		expect(outlines(root, 'Owner').map((o) => o.label)).toEqual(['Slash/Hit', 'Mid', 'Close']);
	});

	it('marks colliders below an inactive object as not live', () => {
		const root = node({
			children: [node({ active: false, children: [node({ colliders: [box([1, 1])] })] })]
		});
		expect(outlines(root, 'Owner')[0].live).toBe(false);
		expect(outlines(root, 'Owner')[0].nodePath).toBe('Owner/n/n');
	});
});

describe('categorize', () => {
	const c = box([1, 1]);

	it('damages hero beats everything else, including the terrain layer', () => {
		expect(categorize(node({ layer: 'Terrain', components: [comp('DamageHero')] }), c, null)).toBe(
			'enemy'
		);
		expect(
			categorize(
				node({
					components: [comp('PlayMakerFSM', { fsm: 'x', template: 'hornet_multi_wounder' })]
				}),
				c,
				null
			)
		).toBe('enemy');
	});

	it('treats a TriggerEnterEvent under a RangeAttackGroup as damaging', () => {
		const parent = node({ components: [comp('RangeAttackGroup')] });
		const n = node({ components: [comp('TriggerEnterEvent')] });
		expect(categorize(n, c, parent)).toBe('enemy');
		expect(categorize(n, c, null)).toBe('other');
	});

	it('splits terrain by NonSlider', () => {
		expect(categorize(node({ layer: 'Terrain' }), c, null)).toBe('terrain');
		expect(categorize(node({ layer: 'Terrain', components: [comp('NonSlider')] }), c, null)).toBe(
			'nonSliderTerrain'
		);
	});

	it('only counts transitions and hazard respawns on triggers', () => {
		const n = node({ components: [comp('TransitionPoint')] });
		expect(categorize(n, c, null)).toBe('gate');
		expect(categorize(n, { ...c, trigger: false }, null)).toBe('other');
	});

	it('ranks levers on interactive objects as triggers', () => {
		expect(categorize(node({ layer: 'Interactive Object' }), c, null)).toBe('breakable');
		expect(
			categorize(node({ layer: 'Interactive Object', components: [comp('Lever')] }), c, null)
		).toBe('trigger');
	});

	it('ranks health managers above alert ranges, and needs NoClamberRegion enabled', () => {
		expect(
			categorize(node({ components: [comp('AlertRange'), comp('HealthManager')] }), c, null)
		).toBe('healthManager');
		expect(categorize(node({ components: [comp('AlertRange')] }), c, null)).toBe('alertRegion');
		expect(
			categorize(
				node({ components: [{ class: 'NoClamberRegion', enabled: false }, comp('AlertRange')] }),
				c,
				null
			)
		).toBe('alertRegion');
	});
});

describe('external nodes', () => {
	it('labels external nodes by full path and takes their ancestors into account', () => {
		const root = {
			...node({ name: 'Boss' }),
			external: [
				{
					path: 'Scene/Escape Range',
					parents_active: false,
					node: node({ name: 'Escape Range', colliders: [box([2, 2])] })
				}
			]
		};
		const [o] = outlines(root, 'Scene/Boss');
		expect(o.label).toBe('Scene/Escape Range');
		expect(o.external).toBe(true);
		expect(o.live).toBe(false);
	});
});

const action = (cls: string, params: Record<string, ParamValue>): Action => ({
	class: cls,
	custom_name: null,
	enabled: true,
	params: Object.entries(params).map(([name, value]) => ({ name, type_name: '', value }))
});

const fsm = (variables: FsmModel['variables'], actions: Action[] = []): FsmModel =>
	({
		name: 'Control',
		enabled: true,
		start_state: 'A',
		events: [],
		global_transitions: [],
		states: [{ name: 'A', actions, transitions: [] }],
		variables
	}) as unknown as FsmModel;

const objVar = (name: string, target: string | null) => ({
	name,
	category: 'object',
	show_in_inspector: false,
	value: {
		type: 'Object' as const,
		value: {
			file: null,
			target: target === null ? { kind: 'Null' as const } : { kind: 'Path' as const, target }
		}
	}
});

describe('alertRangeTargets', () => {
	it('resolves by-name lookups to a direct child of the owner', () => {
		const a = action('CheckAlertRangeByName', {
			alertRangeName: { type: 'Str', value: 'Close Range' }
		});
		expect(alertRangeTargets(a, fsm([]), 'Scene/Boss')).toEqual(['Scene/Boss/Close Range']);
		const empty = action('CheckAlertRangeByName', { alertRangeName: { type: 'Str', value: '' } });
		expect(alertRangeTargets(empty, fsm([]), 'Scene/Boss')).toEqual(['Scene/Boss/*']);
	});

	it('resolves a variable through its value, dropping the component suffix', () => {
		const a = action('CheckAlertRange', {
			alertRange: { type: 'Object', value: { Var: 'Escape' } }
		});
		const model = fsm([objVar('Escape', 'Scene/Escape Range@AlertRange')]);
		expect(alertRangeTargets(a, model, 'Scene/Boss')).toEqual(['Scene/Escape Range']);
	});

	it('resolves an empty variable through the FindAlertRange actions storing it', () => {
		const check = action('CheckAlertRange', {
			alertRange: { type: 'Object', value: { Var: 'R' } }
		});
		const find = action('FindAlertRange', {
			target: { type: 'Owner', value: 'SelfOwner' },
			storeResult: { type: 'Object', value: { Var: 'R' } },
			childName: { type: 'Str', value: 'Retreat Range' }
		});
		const other = action('FindAlertRange', {
			target: { type: 'Owner', value: 'SelfOwner' },
			storeResult: { type: 'Object', value: { Var: 'X' } },
			childName: { type: 'Str', value: 'Other' }
		});
		const model = fsm([objVar('R', null)], [check, find, other]);
		expect(alertRangeTargets(check, model, 'Scene/Boss')).toEqual(['Scene/Boss/Retreat Range']);
		expect(alertRangeTargets(check, fsm([objVar('R', null)], [check]), 'Scene/Boss')).toEqual([]);
	});
});

describe('matchesTarget', () => {
	it('picks the first AlertRange child for a wildcard target', () => {
		const root = node({
			name: 'Boss',
			children: [
				node({ name: 'Hit', components: [comp('DamageHero')], colliders: [box([1, 1])] }),
				node({ name: 'First', components: [comp('AlertRange')], colliders: [box([1, 1])] }),
				node({
					name: 'Second',
					components: [comp('AlertRange'), comp('HealthManager')],
					colliders: [box([1, 1])]
				})
			]
		});
		const list = outlines(root, 'S/Boss');
		const hits = list.filter((o) => matchesTarget(o, 'S/Boss/*', list)).map((o) => o.label);
		// hierarchy order, although category grouping lists 'Second' (health manager) first
		expect(hits).toEqual(['First']);
	});
});

describe('linkTargets', () => {
	it('links GameObject params by fixed path or variable, but not Self', () => {
		const a = action('ActivateGameObject', {
			gameObject: { type: 'GameObject', value: { Var: 'Terrain Collider' } },
			other: {
				type: 'GameObject',
				value: { Object: { file: null, target: { kind: 'Path', target: 'Scene/Boss/Hit' } } }
			},
			self: { type: 'Owner', value: 'SelfOwner' }
		});
		const model = fsm([objVar('Terrain Collider', 'Scene/Boss/Terrain Collider')]);
		expect(Object.fromEntries(linkTargets(a, model, 'Scene/Boss'))).toEqual({
			gameObject: ['Scene/Boss/Terrain Collider'],
			other: ['Scene/Boss/Hit']
		});
	});

	it('keeps the alert range resolution for alert range actions', () => {
		const a = action('CheckAlertRangeByName', { alertRangeName: { type: 'Str', value: 'Close' } });
		expect(Object.fromEntries(linkTargets(a, fsm([]), 'S/Boss'))).toEqual({
			alertRangeName: ['S/Boss/Close']
		});
	});
});

describe('nodePaths and subtree matching', () => {
	const root = {
		...node({
			name: 'Boss',
			colliders: [box([1, 1])],
			children: [
				node({
					name: 'Collider Slam',
					children: [node({ name: 'Hurtbox', colliders: [box([1, 1])] })]
				})
			]
		}),
		external: [
			{
				path: 'S/Range',
				parents_active: true,
				node: node({ name: 'Range', colliders: [box([1, 1])] })
			}
		]
	};

	it('lists every node, including colliderless containers and external nodes', () => {
		expect([...nodePaths(root, 'S/Boss')]).toEqual([
			'S/Boss',
			'S/Boss/Collider Slam',
			'S/Boss/Collider Slam/Hurtbox',
			'S/Range'
		]);
	});

	it('matches a container through its subtree only when asked to', () => {
		const list = outlines(root, 'S/Boss');
		const hits = (t: string, subtree: boolean) =>
			list.filter((o) => matchesTarget(o, t, list, subtree)).map((o) => o.nodePath);
		expect(hits('S/Boss/Collider Slam', true)).toEqual(['S/Boss/Collider Slam/Hurtbox']);
		expect(hits('S/Boss/Collider Slam', false)).toEqual([]);
		expect(hits('S/Boss', false)).toEqual(['S/Boss']);
	});
});
