import { describe, expect, it } from 'vitest';
import { actionTokens } from './pseudo';

describe('actionTokens', () => {
	it('renders a layerMask array inline with names and indices', () => {
		const tokens = actionTokens({
			class: 'X.RayCast',
			custom_name: null,
			enabled: true,
			params: [
				{
					name: 'layerMask',
					type_name: 'Array',
					value: {
						type: 'List',
						value: [
							{
								name: '',
								type_name: 'FsmInt',
								value: { type: 'Layer', value: { index: 8, name: 'Terrain' } }
							},
							{
								name: '',
								type_name: 'FsmInt',
								value: { type: 'Layer', value: { index: 25, name: 'Soft Terrain' } }
							}
						]
					}
				}
			]
		});
		expect(tokens.map((t) => t.text).join('')).toBe(
			'RayCast(layerMask=[Terrain (8), Soft Terrain (25)])'
		);
		expect(tokens.find((t) => t.text === 'Terrain (8)')?.title).toBe('Unity layer');
	});

	it('folds a negated compound operand into the operator (+= -1 → -= 1)', () => {
		const tokens = actionTokens({
			class: 'X.FloatAdd',
			custom_name: null,
			enabled: true,
			params: [
				{
					name: 'floatVariable',
					type_name: 'FsmFloat',
					value: { type: 'PackedVar', value: 'Flaps' }
				},
				{ name: 'add', type_name: 'FsmFloat', value: { type: 'Float', value: -1 } }
			]
		});
		expect(tokens.map((t) => t.text).join('')).toBe('var "Flaps" -= 1');
	});

	it('attaches action + param tooltips as token titles', () => {
		const a = {
			class: 'HutongGames.PlayMaker.Actions.FloatCompare',
			custom_name: null,
			enabled: true,
			params: [
				{ name: 'float1', type_name: 'FsmFloat', value: { type: 'Float', value: 1 } as const },
				{ name: 'everyFrame', type_name: 'FsmBool', value: { type: 'Bool', value: true } as const }
			]
		};
		const tip = {
			tip: 'Sends Events based on the comparison of 2 Floats.',
			params: { float1: 'The first float variable.', everyFrame: 'Repeat every frame.' }
		};
		const tokens = actionTokens(a, tip);
		expect(tokens.find((t) => t.cls === 'act')?.title).toBe(tip.tip);
		expect(tokens.find((t) => t.text === 'float1=')?.title).toBe(tip.params.float1);
		expect(tokens.find((t) => t.text === 'everyFrame=')?.title).toBe(tip.params.everyFrame);
		// without a tip the tokens carry no titles (the callers pass no tooltips → no hover text)
		expect(actionTokens(a).find((t) => t.cls === 'act')?.title).toBeUndefined();
	});

	it('highlights a var embedded in an eventTarget', () => {
		const tokens = actionTokens({
			class: 'X.SendEventByName',
			custom_name: null,
			enabled: true,
			params: [
				{
					name: 'eventTarget',
					type_name: 'FsmEventTarget',
					value: {
						type: 'EventTarget',
						value: {
							kind: 1,
							game_object: { Var: 'HUD Canvas' },
							fsm_name: null,
							fsm: { file: null, target: { kind: 'Null' } },
							exclude_self: false,
							send_to_children: false
						}
					}
				}
			]
		});
		expect(tokens.map((t) => t.text).join('')).toBe(
			'SendEventByName(eventTarget=GameObject(var "HUD Canvas"))'
		);
		expect(tokens.find((t) => t.cls === 'var')?.text).toBe('var "HUD Canvas"');
	});
});
