<script lang="ts">
	import type { FsmModel, State } from '$lib/model';
	import { actionTokens, type Token } from '$lib/pseudo';
	import { fmtCallValue, varRefName } from '$lib/fmt';
	import { isDeadAction } from '$lib/actions';
	import type { Tooltips } from '$lib/tooltips';

	// renders one state's actions + transitions as pseudocode lines, shared by the full PseudoView and
	// the graph's state-preview sidebar. `onnavigate` is how each host follows a state reference
	// (PseudoView scrolls to it, GraphView selects it). `onanchor` builds a permalink to an action
	// line (`#State/N`, see anchor.ts); `flash` highlights that action (deep-link feedback).
	// `indent` sets the left padding in ch.
	let {
		state,
		model,
		onnavigate,
		onanchor,
		tooltips = {},
		indent = 0,
		flash = null,
		emptyNote = false
	}: {
		state: State;
		model: FsmModel;
		onnavigate: (name: string) => void;
		onanchor: (state: string, action: number) => void;
		tooltips?: Tooltips;
		indent?: number;
		flash?: number | null;
		emptyNote?: boolean;
	} = $props();

	// gutter geometry: with an indent (the pseudo view's code block) the gutter button spans the
	// whitespace inside that indent; at indent 0 (the graph sidebar, where lines start flush at
	// the panel edge) there is none, so the gutter hangs 2ch into the host's own padding instead.
	// Either way the `#` sits at the gutter's left edge, clear of the text.
	const gutterLeft = $derived(indent > 0 ? '-2ch' : '-4ch');
	const gutterWidth = $derived(`${indent > 0 ? indent : 2}ch`);

	// resolve an event referenced inside an action to its target state (own transitions, then global)
	function eventTarget(event: string): string | undefined {
		return (
			state.transitions.find((t) => t.event === event)?.to_state ??
			model.global_transitions.find((t) => t.event === event)?.to_state
		);
	}

	// variable name → formatted authored default, for the hover on `var "X"` references
	const varDefaults = $derived(
		new Map(model.variables.map((v) => [v.name, fmtCallValue(v.value)]))
	);
	// hover text for a token: a var reference shows its variable's default, else its own title
	function tokenTitle(t: Token): string | undefined {
		if (t.cls === 'var') {
			const name = varRefName(t.text);
			const def = name == null ? undefined : varDefaults.get(name);
			if (def != null) return `= ${def}`;
		}
		return t.title;
	}
</script>

{#each state.actions as a, i (i)}
	{@const dead = a.enabled && isDeadAction(a)}
	<div
		class="line"
		class:off={!a.enabled || dead}
		class:flash={flash === i + 1}
		data-anchor={`${state.name}/${i + 1}`}
		style="padding-left: {indent}ch; --bar-x: {indent - 2}ch"
	>
		{#each actionTokens(a, tooltips[a.class]) as t, k (k)}{#if t.event}{@const target = eventTarget(
					t.event
				)}{#if target}<span
						class="event link"
						role="button"
						tabindex="0"
						title={t.title}
						onclick={() => onnavigate(target)}
						onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onnavigate(target)}
						>{t.text}</span
					>{:else}<span class={t.cls} title={tokenTitle(t)}>{t.text}</span>{/if}{:else}<span
					class={t.cls}
					title={tokenTitle(t)}>{t.text}</span
				>{/if}{/each}{#if !a.enabled}<span class="cmt">{' // disabled'}</span>{/if}
		<!-- gutter comes last, adjacent: `.line` renders with white-space: pre-wrap, where
		     inter-element whitespace is significant — a button before the tokens would shift the code
		     right by the collapsed spaces around it (a trailing space just hangs). The button spans
		     the whole whitespace strip, so a click anywhere in the gutter copies the link -->
		<button
			class="anch"
			style="left: {gutterLeft}; width: {gutterWidth}"
			title="copy link to this action"
			onclick={() => onanchor(state.name, i + 1)}
			aria-label="copy link to {a.class.split('.').pop()} in state {state.name}"
		></button>
	</div>
{/each}
{#if state.actions.length && state.transitions.length}
	<div class="blank"></div>
{/if}
{#each state.transitions as t (t.event + t.to_state)}
	<div class="line" style="padding-left: {indent}ch">
		<span class="kw">on</span> <span class="event">{t.event}</span>
		<span class="arrow">-></span>
		{#if t.to_state}
			<span
				class="state link"
				role="button"
				tabindex="0"
				onclick={() => onnavigate(t.to_state)}
				onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && onnavigate(t.to_state)}
				>{t.to_state}</span
			>
		{:else}
			<span class="cmt">(none)</span>
		{/if}
	</div>
{/each}
{#if emptyNote && !state.actions.length && !state.transitions.length}
	<div class="cmt" style="padding-left: {indent}ch">(no actions or transitions)</div>
{/if}

<style>
	.line {
		position: relative;
		white-space: pre-wrap;
		word-break: break-word;
		text-indent: -2ch;
		margin-left: 2ch;
	}
	/* the permalink button IS the gutter: it spans the whole whitespace strip left of the text
	   (left/width set inline per host), so hovering or clicking anywhere there works — the `#`
	   itself is just its left-aligned label, sitting at the strip's left edge, and only shows on
	   hover/focus */
	.anch {
		position: absolute;
		top: 0;
		bottom: 0;
		padding: 0;
		border: none;
		background: none;
		color: var(--dim);
		font: inherit;
		text-align: left;
		text-indent: 0;
		cursor: pointer;
		user-select: none;
		opacity: 0;
	}
	/* CSS content, not DOM text, so selecting/copying the pseudocode never picks the `#` up */
	.anch::before {
		content: '#';
	}
	.anch:hover,
	.anch:focus-visible {
		opacity: 1;
	}
	.anch:hover {
		color: var(--accent);
	}
	@keyframes flash {
		0% {
			background: color-mix(in srgb, var(--action) 30%, transparent);
		}
		100% {
			background: transparent;
		}
	}
	/* the highlight is a bar that starts at the line's first character: the .line box begins 2ch
	   left of the text (hanging indent + line indent), and a plain div background would tint those
	   empty cells too. --bar-x (inline, per host) is the text's offset from the box. z-index: 0 on
	   the flashed line keeps the negative-z bar behind the line's own text yet above surrounding
	   backgrounds. */
	.flash {
		z-index: 0;
	}
	.flash::before {
		content: '';
		position: absolute;
		z-index: -1;
		top: 0;
		bottom: 0;
		left: var(--bar-x, 0);
		right: 0;
		border-radius: 2px;
		animation: flash 1.6s ease-out;
	}
	.blank {
		height: 0.6rem;
	}
	.link {
		cursor: pointer;
	}
	.link:hover {
		text-decoration: underline;
	}
	.kw {
		color: #c678dd;
	}
	.act {
		color: var(--action);
	}
	.var {
		color: #9d8fb5;
	}
	.str {
		color: #cd9178;
	}
	.layer {
		color: #e5c07b;
	}
	.event {
		color: var(--event);
	}
	.state {
		color: var(--state);
		font-weight: 600;
	}
	.arrow,
	.cmt {
		color: var(--dim);
	}
	.off {
		opacity: 0.55;
	}
</style>
