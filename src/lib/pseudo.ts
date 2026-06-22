import type { FsmModel, Param } from './model';
import { fmtValue, short } from './fmt';

/** compact one-line arg list for an action: `name=value, …` (unnamed params show just the value) */
export function args(params: Param[]): string {
	return params
		.map((p) => {
			const v = fmtValue(p.value);
			return p.name ? `${p.name}=${v}` : v;
		})
		.join(', ');
}

/** one line for an action: `ActionClass(args)`, with a trailing `// disabled` when not enabled */
export function actionText(a: FsmModel['states'][number]['actions'][number]): string {
	const line = `${short(a.class)}(${args(a.params)})`;
	return a.enabled ? line : `${line}  // disabled`;
}

/**
 * Canonical plain-text pseudocode for an FSM. The PseudoView component renders a colorised version
 * of the same structure; this text form is what the snapshot tests pin.
 */
export function toPseudocode(model: FsmModel): string {
	const out: string[] = [`fsm ${model.name} {`, `  start ${model.start_state}`];
	for (const t of model.global_transitions) {
		out.push(`  on ${t.event} → ${t.to_state}  // from any state`);
	}
	for (const s of model.states) {
		out.push('', `  state ${s.name} {`);
		for (const a of s.actions) out.push(`    ${actionText(a)}`);
		for (const t of s.transitions) out.push(`    on ${t.event} → ${t.to_state}`);
		out.push('  }');
	}
	out.push('}');
	return out.join('\n');
}
