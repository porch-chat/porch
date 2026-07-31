// SPDX-License-Identifier: AGPL-3.0-or-later
// @vitest-environment node

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

const SRC_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ENTRY = path.join(SRC_ROOT, 'index.tsx');
const PUBLIC_APP_ENTRY = path.join(SRC_ROOT, 'app', 'AppBootstrap.tsx');
const PUBLIC_AUTH_PAGE_ENTRIES = [
	'LoginPage.tsx',
	'RegisterPage.tsx',
	'ForgotPasswordPage.tsx',
	'ResetPasswordPage.tsx',
].map((filename) => path.join(SRC_ROOT, 'features', 'auth', 'components', 'pages', filename));
const STATIC_IMPORT_PATTERNS = [
	/^\s*import\s+(?!type\b).*?\s+from\s+['"]([^'"]+)['"]\s*;?/gms,
	/^\s*import\s+['"]([^'"]+)['"]\s*;?/gm,
	/^\s*export\s+(?!type\b).*?\s+from\s+['"]([^'"]+)['"]\s*;?/gms,
] as const;

function resolveAppImport(importer: string, specifier: string): string | null {
	let base: string;
	if (specifier.startsWith('@app/')) {
		base = path.join(SRC_ROOT, specifier.slice('@app/'.length));
	} else if (specifier.startsWith('.')) {
		base = path.resolve(path.dirname(importer), specifier);
	} else {
		return null;
	}
	for (const candidate of [
		base,
		`${base}.ts`,
		`${base}.tsx`,
		`${base}.js`,
		`${base}.jsx`,
		path.join(base, 'index.ts'),
		path.join(base, 'index.tsx'),
	]) {
		if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return path.normalize(candidate);
	}
	return null;
}

function collectStaticAppGraph(entry: string): Set<string> {
	const visited = new Set<string>([path.normalize(entry)]);
	const queue = [path.normalize(entry)];
	while (queue.length > 0) {
		const current = queue.shift();
		if (!current) break;
		const source = fs.readFileSync(current, 'utf8');
		const specifiers = new Set<string>();
		for (const pattern of STATIC_IMPORT_PATTERNS) {
			pattern.lastIndex = 0;
			for (const match of source.matchAll(pattern)) {
				if (match[1]) specifiers.add(match[1]);
			}
		}
		for (const specifier of specifiers) {
			const resolved = resolveAppImport(current, specifier);
			if (!resolved || visited.has(resolved)) continue;
			visited.add(resolved);
			queue.push(resolved);
		}
	}
	return visited;
}

describe('public bootstrap isolation', () => {
	it('keeps authenticated communication and media modules behind dynamic boundaries', () => {
		const graph = new Set(
			[ENTRY, PUBLIC_APP_ENTRY, ...PUBLIC_AUTH_PAGE_ENTRIES].flatMap((entry) => [...collectStaticAppGraph(entry)]),
		);
		const relativePaths = [...graph].map((file) => path.relative(SRC_ROOT, file).replaceAll('\\', '/'));
		const forbiddenPrefixes = [
			'app/App.tsx',
			'features/channel/',
			'features/gateway/',
			'features/guild/',
			'features/messaging/state/',
			'features/search/',
			'features/voice/commands/',
			'features/voice/components/',
			'features/voice/engine/',
			'features/voice/events/',
			'features/voice/hooks/',
			'features/voice/state/',
		];
		const forbidden = relativePaths.filter((file) =>
			forbiddenPrefixes.some((prefix) => file === prefix || file.startsWith(prefix)),
		);
		expect(forbidden).toEqual([]);
		// This is deliberately generous: it catches a broad registry leak while
		// allowing focused public-shell growth without snapshot churn.
		expect(graph.size).toBeLessThan(500);
	});
});
