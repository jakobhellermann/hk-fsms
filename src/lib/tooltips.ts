// PlayMaker `[Tooltip]` help text, extracted from the game assemblies by the indexer
// (`tooltip_map.rs`) into `static/data/<game>/tooltips.json`. Keyed by an action's FULL class name
// (matching `Action.class`), each entry carries the class-level description and per-param help.

export interface ActionTip {
	/** class-level `[Tooltip]` — what the action does */
	tip?: string;
	/** field name → its `[Tooltip]` — per-parameter help */
	params?: Record<string, string>;
}

export type Tooltips = Record<string, ActionTip>;
