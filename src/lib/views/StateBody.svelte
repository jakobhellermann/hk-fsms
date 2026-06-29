<script lang="ts">
	import type { FsmModel, State } from '$lib/model';
	import { actionTokens, type Token } from '$lib/pseudo';
	import { fmtCallValue, varRefName } from '$lib/fmt';
	import { isDeadAction } from '$lib/actions';

	// renders one state's actions + transitions as pseudocode lines, shared by the full PseudoView and
	// the graph's state-preview sidebar. `onnavigate` is how each host follows a state reference
	// (PseudoView scrolls to it, GraphView selects it). `indent` sets the left padding in ch.
	let {
		state,
		model,
		onnavigate,
		indent = 0,
		emptyNote = false
	}: {
		state: State;
		model: FsmModel;
		onnavigate: (name: string) => void;
		indent?: number;
		emptyNote?: boolean;
	} = $props();

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
	<div class="line" class:off={!a.enabled || dead} style="padding-left: {indent}ch">
		{#each actionTokens(a) as t, k (k)}{#if t.event}{@const target = eventTarget(
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
		white-space: pre-wrap;
		word-break: break-word;
		text-indent: -2ch;
		margin-left: 2ch;
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
