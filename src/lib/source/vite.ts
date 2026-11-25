import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join, relative, resolve } from 'node:path';
import type { Plugin } from 'vite';

const DECOMPILER_PATH = 'decompiler/';

const MIME: Record<string, string> = {
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.wasm': 'application/wasm'
};

/** Serves the ilspy-wasm-cache worker and .NET runtime at `<base>decompiler/`. */
export function decompilerAssets(): Plugin {
	const pkg = createRequire(import.meta.url).resolve('ilspy-wasm-cache');
	const root = join(dirname(pkg), 'assets');
	let base = '/';
	return {
		name: 'decompiler-assets',
		configResolved(config) {
			base = config.base;
		},
		configureServer(server) {
			const prefix = base + DECOMPILER_PATH;
			server.middlewares.use(async (req, res, next) => {
				const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
				if (!pathname.startsWith(prefix)) return next();
				const path = resolve(root, decodeURIComponent(pathname.slice(prefix.length)));
				if (relative(root, path).startsWith('..')) return next();
				try {
					const body = await readFile(path);
					res.writeHead(200, {
						'Content-Type': MIME[extname(path)] ?? 'application/octet-stream'
					});
					res.end(body);
				} catch {
					next();
				}
			});
		},
		async generateBundle() {
			// only the browser loads the worker
			if (this.environment.config.build.ssr) return;
			for (const file of await readdir(root, {
				recursive: true,
				withFileTypes: true
			})) {
				if (!file.isFile()) continue;
				const path = join(file.parentPath, file.name);
				this.emitFile({
					type: 'asset',
					fileName: DECOMPILER_PATH + relative(root, path),
					source: await readFile(path)
				});
			}
		}
	};
}
