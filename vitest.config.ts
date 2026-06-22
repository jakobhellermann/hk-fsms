import { defineConfig } from 'vitest/config';

// the tested modules (fmt/pseudo/model) are plain TS, so we skip the SvelteKit vite plugin here
export default defineConfig({
	test: {
		include: ['src/**/*.test.ts']
	}
});
