import { describe, expect, it } from 'vitest';
import { fmtGoRef, fmtObjectRef, fmtValue, short, valueKind } from './fmt';
import type { ObjectRef } from './model';

describe('short', () => {
	it('takes the last dotted segment', () => {
		expect(short('HutongGames.PlayMaker.Actions.SetBoolValue')).toBe('SetBoolValue');
		expect(short('NoDots')).toBe('NoDots');
	});
});

describe('fmtObjectRef', () => {
	it('null target', () => {
		expect(fmtObjectRef({ file: null, target: { kind: 'Null' } })).toBe('<null>');
	});
	it('hierarchy path, with and without file', () => {
		expect(fmtObjectRef({ file: null, target: { kind: 'Path', target: 'A/B@Comp' } })).toBe(
			'A/B@Comp'
		);
		expect(fmtObjectRef({ file: 'x.assets', target: { kind: 'Path', target: 'A@Comp' } })).toBe(
			'A@Comp (x.assets)'
		);
	});
	it('loose object falls back to name, else path id', () => {
		expect(
			fmtObjectRef({ file: 'a.assets', target: { kind: 'Loose', target: { name: 'foo', id: 5 } } })
		).toBe('foo (a.assets)');
		expect(
			fmtObjectRef({ file: null, target: { kind: 'Loose', target: { name: null, id: 7 } } })
		).toBe('loose:7');
	});
});

describe('fmtGoRef', () => {
	it('self / variable / object', () => {
		expect(fmtGoRef('SelfOwner')).toBe('Self');
		expect(fmtGoRef({ Var: 'Hero' })).toBe('var "Hero"');
		const o: ObjectRef = { file: null, target: { kind: 'Null' } };
		expect(fmtGoRef({ Object: o })).toBe('<null>');
	});
});

describe('fmtValue', () => {
	it('scalars and vectors', () => {
		expect(fmtValue({ type: 'Bool', value: true })).toBe('true');
		expect(fmtValue({ type: 'Int', value: 3 })).toBe('3');
		expect(fmtValue({ type: 'Float', value: 1.5 })).toBe('1.5');
		expect(fmtValue({ type: 'Vector', value: [0, 1, 2] })).toBe('(0, 1, 2)');
	});

	it('packed vars and events distinguish null', () => {
		expect(fmtValue({ type: 'PackedVar', value: null })).toBe('(unset)');
		expect(fmtValue({ type: 'PackedVar', value: 'Gravity Scale' })).toBe('var "Gravity Scale"');
		expect(fmtValue({ type: 'Event', value: null })).toBe('(none)');
		expect(fmtValue({ type: 'Event', value: 'SLASH' })).toBe('->"SLASH"');
	});

	it('fsm strings, enums, arrays', () => {
		expect(fmtValue({ type: 'FsmString', value: { kind: 'Literal', value: 'hi' } })).toBe('"hi"');
		expect(fmtValue({ type: 'FsmString', value: { kind: 'Var', value: 'n' } })).toBe('var "n"');
		expect(
			fmtValue({
				type: 'Enum',
				value: { kind: 'Named', value: { enum_name: 'A.B.Mode', value: 1 } }
			})
		).toBe('Mode(1)');
		expect(fmtValue({ type: 'Array', value: { kind: 'Var', value: 'xs' } })).toBe('var "xs"');
		expect(
			fmtValue({
				type: 'Array',
				value: {
					kind: 'Values',
					value: [
						{ type: 'Int', value: 1 },
						{ type: 'Str', value: 'a' }
					]
				}
			})
		).toBe('[1, "a"]');
	});

	it('spells out a curve and names a property target', () => {
		const key = (time: number, value: number) => ({
			time,
			value,
			in_slope: 0,
			out_slope: 0,
			in_weight: 0,
			out_weight: 0,
			weighted_mode: 0
		});
		expect(
			fmtValue({
				type: 'AnimCurve',
				value: {
					keys: [key(0, 0), key(1, 0.5)],
					pre_infinity: 0,
					post_infinity: 0,
					rotation_order: 0
				}
			})
		).toBe(
			'curve[(time=0, value=0, inSlope=0, outSlope=0), (time=1, value=0.5, inSlope=0, outSlope=0)]'
		);
		// a stepped curve: JSON cannot hold the infinite tangent, so it arrives as a string
		expect(
			fmtValue({
				type: 'AnimCurve',
				value: {
					keys: [{ ...key(0, 0), in_slope: 'Infinity' }],
					pre_infinity: 0,
					post_infinity: 0,
					rotation_order: 0
				}
			})
		).toBe('curve[(time=0, value=0, inSlope=Infinity, outSlope=0)]');
		expect(
			fmtValue({
				type: 'Property',
				value: {
					target: 'SelfOwner',
					type_name: 'UnityEngine.Transform',
					property: 'position',
					set: true
				}
			})
		).toBe('Transform.position on Self');
		// a target that never resolves: the action returns early and does nothing
		expect(
			fmtValue({
				type: 'Property',
				value: {
					target: { Object: { file: null, target: { kind: 'Null' } } },
					type_name: 'X.ObjectBounce',
					property: '',
					set: false
				}
			})
		).toBe('ObjectBounce on <null>');
	});

	it('layers show the name with its index, falling back to the index', () => {
		expect(fmtValue({ type: 'Layer', value: { index: 8, name: 'Terrain' } })).toBe('Terrain (8)');
		expect(fmtValue({ type: 'Layer', value: { index: 8, name: null } })).toBe('layer 8');
	});

	it('list reports element count', () => {
		expect(
			fmtValue({
				type: 'List',
				value: [{ name: '', type_name: 'Int', value: { type: 'Int', value: 1 } }]
			})
		).toBe('[1 elems]');
	});
});

describe('valueKind', () => {
	it('flags events and variable bindings for colouring', () => {
		expect(valueKind({ type: 'Event', value: 'X' })).toBe('event');
		expect(valueKind({ type: 'PackedVar', value: 'n' })).toBe('var');
		expect(valueKind({ type: 'Int', value: 1 })).toBe('');
	});
});
