import type {
	ArrayValue,
	Call,
	EnumValue,
	EventTarget,
	GoRef,
	ObjectRef,
	ParamValue,
	Property,
	StrValue,
	TemplateControl,
	Value,
	VarOverride,
	VarValue
} from './model';

export const short = (cls: string) => cls.split('.').pop() ?? cls;
const q = (s: string) => JSON.stringify(s);

/** A colorised fragment of a formatted value: `cls` is the css colour class (omitted = default). */
export interface Token {
	text: string;
	cls?: string;
	/** hover text — used to reveal the elements behind a collapsed `[N elems]` list */
	title?: string;
	/** event name — when this token is an event value (->"CANCEL"), for click-to-navigate */
	event?: string;
}

const tokenText = (toks: Token[]) => toks.map((t) => t.text).join('');
const varTok = (name: string): Token => ({ text: `var ${q(name)}`, cls: 'var' });

export function fmtObjectRef(r: ObjectRef): string {
	let loc: string;
	switch (r.target.kind) {
		case 'Null':
			return '<null>';
		case 'Path':
			loc = r.target.target;
			break;
		case 'Loose':
			loc = r.target.target.name ?? `loose:${r.target.target.id}`;
			break;
	}
	return r.file ? `${loc} (${r.file})` : loc;
}

export function goRefTokens(r: GoRef): Token[] {
	if (r === 'SelfOwner') return [{ text: 'Self' }];
	if ('Var' in r) return [varTok(r.Var)];
	return [{ text: fmtObjectRef(r.Object) }];
}

export function fmtGoRef(r: GoRef): string {
	return tokenText(goRefTokens(r));
}

function fmtStr(s: StrValue): string {
	return s.kind === 'Var' ? `var ${q(s.value)}` : q(s.value);
}

function fmtEnum(e: EnumValue): string {
	switch (e.kind) {
		case 'Var':
			return `var ${q(e.value)}`;
		case 'Named':
			return `${short(e.value.enum_name)}(${e.value.value})`;
		case 'Value':
			return String(e.value);
	}
}

function fmtArray(a: ArrayValue): string {
	return a.kind === 'Var' ? `var ${q(a.value)}` : `array[${a.value.length} elems]`;
}

function fmtVar(v: VarValue): string {
	switch (v.type) {
		case 'Var':
			return `var ${q(v.value)}`;
		case 'Unset':
			return '(unset var)';
		case 'Unused':
			return '(unused)';
		case 'Float':
		case 'Int':
			return String(v.value);
		case 'Bool':
			return String(v.value);
		case 'Str':
			return q(v.value);
		case 'Object':
			return fmtObjectRef(v.value);
		case 'Vector':
			return `(${v.value.join(',')})`;
		case 'Enum':
			return `enum(${v.value})`;
		case 'Array':
			return fmtArray(v.value);
	}
}

function eventTargetTokens(t: EventTarget): Token[] {
	const kind =
		['Self', 'GameObject', 'GameObjectFSM', 'FSMComponent', 'BroadcastAll', 'HostFSM', 'SubFSMs'][
			t.kind
		] ?? '?';
	const inner: Token[] = [];
	if (t.kind === 1 || t.kind === 2) inner.push(...goRefTokens(t.game_object));
	if (t.fsm_name) {
		if (inner.length) inner.push({ text: ', ' });
		inner.push({ text: `fsm=${q(t.fsm_name)}` });
	}
	return inner.length ? [{ text: `${kind}(` }, ...inner, { text: ')' }] : [{ text: kind }];
}

// the active parameter value of a FunctionCall (a `Value`, the variant decode.rs selects by type)
function fmtCallValue(v: Value): string {
	switch (v.type) {
		case 'Var':
			return `var ${q(v.value)}`;
		case 'Bool':
		case 'Int':
		case 'Float':
			return String(v.value);
		case 'Str':
			return q(v.value);
		case 'Vector':
			return `(${v.value.join(', ')})`;
		case 'Enum':
			return `${short(v.value.enum_name)}(${v.value.value})`;
		case 'Object':
			return fmtObjectRef(v.value);
		case 'Array':
			return fmtArray(v.value);
	}
}

function callValueTokens(v: Value): Token[] {
	if (v.type === 'Var') return [varTok(v.value)];
	if (v.type === 'Str') return [{ text: q(v.value), cls: 'str' }];
	return [{ text: fmtCallValue(v) }];
}

function functionTokens(f: Call): Token[] {
	if (!f.parameter_type || f.parameter_type === 'None') return [{ text: `${f.function}()` }];
	// fall back to the bare type when the value couldn't be decoded
	if (!f.value) return [{ text: `${f.function}(<${f.parameter_type}>)` }];
	return [{ text: `${f.function}(` }, ...callValueTokens(f.value), { text: ')' }];
}

function fmtProperty(p: Property): string {
	const ty = short(p.type_name);
	return p.property ? `${ty}.${p.property}` : ty;
}

function templateTokens(t: TemplateControl): Token[] {
	const out: Token[] = [{ text: `template=${t.template}` }];
	const section = (label: string, es: VarOverride[], arrow: string) => {
		if (!es.length) return;
		out.push({ text: ` ${label}[` });
		es.forEach((o, i) => {
			if (i) out.push({ text: ', ' });
			if (o.value.type === 'Var')
				out.push({ text: `${o.variable}${arrow}` }, varTok(o.value.value));
			else out.push({ text: o.variable });
		});
		out.push({ text: ']' });
	};
	section('in', t.inputs, '<-');
	section('out', t.outputs, '->');
	section('vars', t.overrides, '=');
	if (t.events.length) {
		out.push({ text: ` events[${t.events.map(([f, to]) => `${f}->${to}`).join(', ')}]` });
	}
	return out;
}

// single-line rendering of a parameter value (List is rendered structurally by the component)
export function fmtValue(v: ParamValue): string {
	switch (v.type) {
		case 'Bool':
		case 'Int':
		case 'Float':
			return String(v.value);
		case 'Vector':
			return `(${v.value.join(', ')})`;
		case 'PackedVar':
			return v.value === null ? '(unset)' : `var ${q(v.value)}`;
		case 'Event':
			return v.value === null ? '(none)' : `->${q(v.value)}`;
		case 'Str':
			return q(v.value);
		case 'FsmString':
			return fmtStr(v.value);
		case 'Owner':
		case 'GameObject':
		case 'Object':
			return fmtGoRef(v.value);
		case 'Var':
			return fmtVar(v.value);
		case 'EventTarget':
			return tokenText(eventTargetTokens(v.value));
		case 'Function':
			return tokenText(functionTokens(v.value));
		case 'Template':
			return tokenText(templateTokens(v.value));
		case 'Enum':
			return fmtEnum(v.value);
		case 'EnumMember':
			return v.value;
		case 'Layer':
			return v.value.name ?? `layer ${v.value.index}`;
		case 'Array':
			return fmtArray(v.value);
		case 'Property':
			return fmtProperty(v.value);
		case 'AnimCurve':
			return `curve[${v.value.keys.length} keys]`;
		case 'List':
			return `[${v.value.length} elems]`;
		case 'Pptr':
			return fmtObjectRef(v.value);
		case 'Raw':
			return `(${v.value.length}B)`;
	}
}

// composite values embed `var "x"` / strings the single-class `valueKind` can't reach; render them
// structurally into tokens instead. Returns null for scalar values (caller uses `valueKind`).
export function compositeTokens(v: ParamValue): Token[] | null {
	switch (v.type) {
		case 'EventTarget':
			return eventTargetTokens(v.value);
		case 'Function':
			return functionTokens(v.value);
		case 'Template':
			return templateTokens(v.value);
		default:
			return null;
	}
}

// css class for coloring a value
export function valueKind(v: ParamValue): string {
	if (v.type === 'Event') return 'event';
	const s = fmtValue(v);
	if (s.startsWith('var ')) return 'var';
	if (v.type === 'Str' || (v.type === 'FsmString' && v.value.kind === 'Literal')) return 'str';
	return '';
}
