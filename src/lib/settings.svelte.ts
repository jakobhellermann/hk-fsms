import { browser } from '$app/environment';

const HIDE_COSMETIC_KEY = 'fsm:hide-cosmetic';

/** View preferences shared by the pseudocode view and the graph's state panel, kept in localStorage. */
class ViewSettings {
	#hideCosmetic = $state(browser && localStorage.getItem(HIDE_COSMETIC_KEY) === 'true');

	/** hide actions that are pure presentation (see `isCosmetic`) */
	get hideCosmetic() {
		return this.#hideCosmetic;
	}
	set hideCosmetic(value: boolean) {
		this.#hideCosmetic = value;
		if (browser) localStorage.setItem(HIDE_COSMETIC_KEY, String(value));
	}
}

export const viewSettings = new ViewSettings();
