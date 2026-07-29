// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe, test} from 'node:test';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const sourcePath = fileURLToPath(new URL('./DeepLinkRegistrationPolicy.ts', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');
const transformedSource = esbuild.transformSync(source, {
	loader: 'ts',
	format: 'cjs',
	platform: 'node',
	target: 'node20',
}).code;

function loadPolicy() {
	const module = {exports: {}};
	const context = vm.createContext({
		module,
		exports: module.exports,
	});
	vm.runInContext(transformedSource, context, {filename: sourcePath});
	return module.exports;
}

describe('deep-link protocol registration', () => {
	test('installed clients own their channel protocol', () => {
		const {shouldRegisterDeepLinkProtocol} = loadPolicy();
		assert.equal(shouldRegisterDeepLinkProtocol({portable: false}), true);
	});

	test('portable clients never replace an installed or other portable protocol handler', () => {
		const {shouldRegisterDeepLinkProtocol} = loadPolicy();
		assert.equal(shouldRegisterDeepLinkProtocol({portable: true}), false);
	});
});
