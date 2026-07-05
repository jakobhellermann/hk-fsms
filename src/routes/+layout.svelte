<script lang="ts">
	import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
	import '../app.css';

	let { children } = $props();

	// content is immutable (content-addressed), so never treat cached data as stale
	const client = new QueryClient({
		defaultOptions: {
			queries: { staleTime: Infinity, gcTime: Infinity, retry: 1 }
		}
	});
</script>

<svelte:head>
	<title>PlayMaker FSM browser</title>
</svelte:head>

<QueryClientProvider {client}>
	{@render children()}
</QueryClientProvider>

<a
	class="gh-corner"
	href="https://github.com/jakobhellermann/hk-fsms"
	target="_blank"
	rel="noreferrer"
	title="Source on GitHub"
	aria-label="Source on GitHub"
>
	<svg viewBox="0 0 16 16" width="22" height="22" fill="currentColor" aria-hidden="true">
		<path
			d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"
		/>
	</svg>
</a>

<style>
	.gh-corner {
		position: fixed;
		right: 0.75rem;
		bottom: 0.75rem;
		display: flex;
		padding: 0.4rem;
		border-radius: 6px;
		color: var(--dim);
		background: color-mix(in srgb, var(--bg) 75%, transparent);
		z-index: 10;
	}
	.gh-corner:hover {
		color: var(--fg);
	}
</style>
