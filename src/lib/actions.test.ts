import { describe, expect, it } from 'vitest';
import { isCosmetic } from './actions';
import type { Action, ParamValue } from './model';

const action = (cls: string, params: Record<string, ParamValue> = {}): Action => ({
	class: cls,
	custom_name: null,
	enabled: true,
	params: Object.entries(params).map(([name, value]) => ({ name, type_name: '', value }))
});

describe('isCosmetic', () => {
	it('matches presentation actions by short class name, including versioned variants', () => {
		expect(isCosmetic(action('HutongGames.PlayMaker.Actions.AudioPlayRandomVoiceFromTable'))).toBe(
			true
		);
		expect(isCosmetic(action('PlayAudioEvent'))).toBe(true);
		expect(isCosmetic(action('HutongGames.PlayMaker.Actions.DoCameraShakeV2'))).toBe(true);
		expect(isCosmetic(action('PlayParticleEmitterInState'))).toBe(true);
		expect(isCosmetic(action('HutongGames.PlayMaker.Actions.PlayRandomAudioClipTableV2'))).toBe(
			true
		);
	});

	it('leaves gameplay actions and the deliberate exceptions alone', () => {
		expect(isCosmetic(action('HutongGames.PlayMaker.Actions.ActivateGameObject'))).toBe(false);
		expect(isCosmetic(action('HutongGames.PlayMaker.Actions.EnemySingControl'))).toBe(false);
		expect(isCosmetic(action('HutongGames.PlayMaker.Actions.ShakePositionV2'))).toBe(false);
		expect(isCosmetic(action('HutongGames.PlayMaker.Actions.StartRoarEmitter'))).toBe(false);
		expect(isCosmetic(action('HutongGames.PlayMaker.Actions.TriggerWorldRumble'))).toBe(false);
	});

	it('keeps an action that fires an event', () => {
		expect(
			isCosmetic(action('AudioPlay', { finishedEvent: { type: 'Event', value: 'DONE' } }))
		).toBe(false);
		expect(isCosmetic(action('AudioPlay', { finishedEvent: { type: 'Event', value: null } }))).toBe(
			true
		);
	});

	it('keeps an action that writes a variable', () => {
		const stores = action('AudioPlayRandomVoice', {
			storeAudioClip: { type: 'PackedVar', value: 'Clip' }
		});
		expect(isCosmetic(stores)).toBe(false);
		const storesNowhere = action('AudioPlayRandomVoice', {
			storeAudioClip: { type: 'PackedVar', value: null }
		});
		expect(isCosmetic(storesNowhere)).toBe(true);
	});
});
