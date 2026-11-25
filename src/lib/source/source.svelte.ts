import { base } from '$app/paths';
import {
	collectFiles,
	createDecompiler,
	type DecompiledType,
	type Decompiler,
	type Status
} from 'ilspy-wasm-cache';
import type { Game } from '$lib/data';

export interface Source {
	/** Whether the game has a current build. */
	picked: boolean;
	/** From the current build: cached, being decompiled, or null if the build must be dropped first. */
	type: DecompiledType | Promise<DecompiledType> | null;
}

const buildKey = (game: Game) => `hk-fsms:source-build:${game}`;

function readBuild(game: Game): string | null {
	try {
		return localStorage.getItem(buildKey(game));
	} catch {
		return null;
	}
}

function writeBuild(game: Game, key: string) {
	try {
		localStorage.setItem(buildKey(game), key);
	} catch {
		// private mode: the build just isn't remembered across reloads
	}
}

/** Decompiled sources of all games; every lookup is memoized, so revisiting a type costs no round trip. */
class SourceStore {
	status = $state.raw<Status>({ phase: 'idle' });
	#decompiler: Decompiler | null = null;
	/** key of the set whose assemblies the worker holds, so its uncached types can be decompiled */
	#loadedKey: string | null = null;
	#cached = new Map<string, Promise<DecompiledType | undefined>>();
	#decompiling = new Map<string, Promise<DecompiledType>>();

	get #worker(): Decompiler {
		if (this.#decompiler) return this.#decompiler;
		const decompiler = createDecompiler(new URL(`${base}/decompiler/`, location.origin));
		decompiler.onStatus((s) => (this.status = s));
		return (this.#decompiler = decompiler);
	}

	async open(game: Game, cls: string): Promise<Source> {
		const key = readBuild(game);
		if (!key) return { picked: false, type: null };
		const id = `${key}:${cls}`;
		const pending = this.#decompiling.get(id);
		if (pending) return { picked: true, type: pending };
		let cached = this.#cached.get(id);
		if (!cached) {
			cached = this.#worker.get(key, cls);
			cached.catch(() => this.#cached.delete(id));
			this.#cached.set(id, cached);
		}
		const type = await cached;
		if (type) return { picked: true, type };
		if (key !== this.#loadedKey) return { picked: true, type: null };
		const decompiling = this.#worker.request(key, cls).finally(() => this.#decompiling.delete(id));
		decompiling.catch(() => this.#cached.delete(id));
		this.#decompiling.set(id, decompiling);
		this.#cached.set(id, decompiling);
		return { picked: true, type: decompiling };
	}

	/** Adds dropped assemblies and makes them the game's current build. Call synchronously in the drop handler. */
	async drop(source: DataTransfer | FileList, game: Game): Promise<void> {
		const files = await collectFiles(source);
		if (!files.length) throw new Error('no .dll files in the drop');
		const set = await this.#worker.add(files);
		this.#loadedKey = set.key;
		writeBuild(game, set.key);
	}
}

export const source = new SourceStore();
