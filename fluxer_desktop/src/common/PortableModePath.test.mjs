// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {describe, test} from 'node:test';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const sourcePath = fileURLToPath(new URL('./PortableModePath.ts', import.meta.url));
const source = readFileSync(sourcePath, 'utf8');
const transformedSource = esbuild.transformSync(source, {
	loader: 'ts',
	format: 'cjs',
	platform: 'node',
	target: 'node20',
}).code;

function loadPolicy(platform) {
	const module = {exports: {}};
	const context = vm.createContext({
		module,
		exports: module.exports,
		require,
		process: {platform},
	});
	vm.runInContext(transformedSource, context, {filename: sourcePath});
	return module.exports;
}

describe('portable marker locations', () => {
	test('finds the marker beside a flat portable executable', () => {
		const {getPortableMarkerLocations} = loadPolicy('win32');
		const locations = getPortableMarkerLocations({
			execPath: 'T:\\Porch\\Porch.exe',
			platform: 'win32',
		});
		assert.ok(locations.includes('T:\\Porch\\.portable'));
	});

	test('finds the marker above Velopack canonical current directories', () => {
		const {getPortableDataBase, getPortableMarkerLocations} = loadPolicy('win32');
		const locations = getPortableMarkerLocations({
			execPath: 'T:\\Porch\\current\\Porch Canary.exe',
			platform: 'win32',
		});
		assert.ok(locations.includes('T:\\Porch\\.portable'));
		assert.equal(
			getPortableDataBase(
				{execPath: 'T:\\Porch\\current\\Porch Canary.exe', platform: 'win32'},
				'T:\\Porch\\.portable',
			),
			'T:\\Porch\\data',
		);
	});

	test('does not treat an unrelated ancestor marker as portable', () => {
		const {getPortableMarkerLocations} = loadPolicy('win32');
		const locations = getPortableMarkerLocations({
			execPath: 'T:\\Porch\\nested\\Porch.exe',
			platform: 'win32',
		});
		assert.equal(locations.length, 1);
		assert.equal(locations[0], 'T:\\Porch\\nested\\.portable');
	});

	test('uses AppImage location for Linux markers and data', () => {
		const {getPortableDataBase, getPortableMarkerLocations} = loadPolicy('linux');
		const context = {
			appImage: '/opt/porch/Porch.AppImage',
			execPath: '/tmp/.mount_porch/porch',
			platform: 'linux',
		};
		assert.ok(getPortableMarkerLocations(context).includes('/opt/porch/.portable'));
		assert.equal(getPortableDataBase(context, '/opt/porch/.portable'), '/opt/porch/data');
	});

	test('uses the macOS app bundle parent for markers and data', () => {
		const {getPortableDataBase, getPortableMarkerLocations} = loadPolicy('darwin');
		const context = {
			execPath: '/Applications/Porch/Porch.app/Contents/MacOS/Porch',
			platform: 'darwin',
		};
		assert.ok(getPortableMarkerLocations(context).includes('/Applications/Porch/.portable'));
		assert.equal(getPortableDataBase(context, '/Applications/Porch/.portable'), '/Applications/Porch/data');
	});
});
