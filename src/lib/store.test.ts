import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fmtValue } from './fmt';
import { actionTokens } from './pseudo';
import { expandIndex, type FsmModel, type IndexEntry, type Param } from './model';

// Runs against the real content store (the gitignored static/data symlink → ../playmakerfsm/out).
// Skips cleanly in environments without the data (e.g. fresh CI).
const games = ['hk', 'ss'] as const;

const readModel = (dir: string, hash: string): FsmModel =>
	JSON.parse(readFileSync(resolve(dir, 'content', `${hash}.json`), 'utf8'));

describe.each(games)('real store (%s)', (game) => {
	const dir = resolve(`static/data/${game}`);
	const hasData = existsSync(resolve(dir, 'index.json'));

	describe.skipIf(!hasData)('sample', () => {
		const index: IndexEntry[] = expandIndex(
			JSON.parse(readFileSync(resolve(dir, 'index.json'), 'utf8'))
		);

		// Deterministic pick: one FSM per name, ordered by where it sits. Ordering or
		// de-duplicating by content hash would reshuffle the selection whenever the
		// model gains a field.
		const seen = new Set<string>();
		const sample = [...index]
			.sort(
				(a, b) =>
					a.name.localeCompare(b.name) ||
					a.file.localeCompare(b.file) ||
					a.game_object.localeCompare(b.game_object)
			)
			.filter((e) => (seen.has(e.name) ? false : (seen.add(e.name), true)))
			.slice(0, 400);

		// A `type` the Rust model emits but model.ts/fmt.ts miss makes fmtValue fall through its
		// switch and return undefined; the same gap turns an action line into "[object Object]".
		it('renders every param of every action in the sample', () => {
			const walkValue = (params: Param[]) => {
				for (const p of params) {
					const s = fmtValue(p.value);
					const what = `${p.type_name} (${p.value.type})`;
					expect(typeof s, what).toBe('string');
					expect(s.length, what).toBeGreaterThan(0);
					if (p.value.type === 'List') walkValue(p.value.value);
					if (p.value.type === 'Class') walkValue(p.value.value.fields);
				}
			};
			for (const e of sample) {
				const m = readModel(dir, e.hash);
				for (const st of m.states) {
					for (const a of st.actions) {
						walkValue(a.params);
						const line = actionTokens(a)
							.map((t) => t.text)
							.join('');
						expect(line, `${m.name} / ${st.name} / ${a.class}`).not.toMatch(
							/undefined|\[object Object\]/
						);
					}
				}
			}
		});
	});
});
