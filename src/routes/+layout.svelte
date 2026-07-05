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
