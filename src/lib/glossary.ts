// Definitions sourced from the PlayMaker decompile (HutongGames.PlayMaker), not guessed.

export const glossary = {
	// FsmEvent.isSystemEvent — built-in events PlayMaker predefines (FINISHED, mouse/application/
	// collision events, …) as opposed to events the FSM author added.
	system:
		'Built-in PlayMaker event (e.g. FINISHED), predefined by the engine rather than authored in this FSM.',

	// FsmEvent.isGlobal — registered in PlayMakerGlobals.Events; such events can be broadcast to and
	// received by other FSMs. Non-global events only fire within the FSM that defines them.
	global:
		'Global event: can be broadcast to and received across FSMs (PlayMakerGlobals). Local (non-global) events only fire inside this FSM.',

	// Fsm.ProcessEvent checks globalTransitions before the active state's own transitions.
	globalTransitions:
		'Transitions checked on every event regardless of the active state; evaluated before the current state’s own transitions.',

	// FsmEventTarget.EventTarget enum
	eventTarget: {
		Self: 'Send the event to this same FSM.',
		GameObject: 'Send to FSMs on a target GameObject.',
		GameObjectFSM: 'Send to a named FSM on a target GameObject.',
		FSMComponent: 'Send to a specific PlayMakerFSM component.',
		BroadcastAll: 'Broadcast the event to every FSM in the scene.',
		HostFSM: 'Send to the FSM hosting this sub-FSM.',
		SubFSMs: 'Send to sub-FSMs run by this FSM.'
	} as Record<string, string>,

	startState: 'The state the FSM begins in when it starts.',
	disabled: 'This action is disabled and does not run.'
};
