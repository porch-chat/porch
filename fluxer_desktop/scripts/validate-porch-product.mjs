// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const product = JSON.parse(fs.readFileSync(path.join(desktopDir, 'porch-product.json'), 'utf8'));
const {stable, canary} = product.channels;

assert.equal(product.schemaVersion, 1);
assert.equal(product.brandName, 'Porch');
assert.deepEqual(Object.keys(product.channels).sort(), ['canary', 'stable']);

for (const [channel, config] of Object.entries(product.channels)) {
	for (const key of [
		'appName',
		'defaultAppUrl',
		'protocol',
		'appId',
		'packageName',
		'linuxPackageName',
		'userDataDirectory',
		'windowsAppUserModelId',
		'windowsToastActivatorClsid',
	]) {
		assert.equal(typeof config[key], 'string', `${channel}.${key} must be a string`);
		assert.ok(config[key].length > 0, `${channel}.${key} must not be empty`);
	}
	assert.equal(new URL(config.defaultAppUrl).protocol, 'https:');
	assert.match(config.windowsToastActivatorClsid, /^\{[0-9A-F]{8}(?:-[0-9A-F]{4}){3}-[0-9A-F]{12}\}$/);
}

for (const key of [
	'appName',
	'defaultAppUrl',
	'protocol',
	'appId',
	'packageName',
	'linuxPackageName',
	'userDataDirectory',
	'windowsAppUserModelId',
	'windowsToastActivatorClsid',
]) {
	assert.notEqual(stable[key], canary[key], `Stable and Canary must have distinct ${key}`);
}

assert.equal(stable.defaultAppUrl, 'https://app.porch.chat');
assert.equal(canary.defaultAppUrl, 'https://canary.porch.chat');
assert.equal(new URL(product.updateBaseUrl).hostname, 'releases.porch.chat');
assert.equal(new URL(product.downloadPageUrl).hostname, 'porch.chat');

const serialized = JSON.stringify(product).toLowerCase();
assert.ok(!serialized.includes('fluxer.app'), 'Porch product contract must not target Fluxer services');
assert.ok(!serialized.includes('fluxerapp/fluxer'), 'Porch product contract must not target the Fluxer repository');

console.log('Porch desktop product contract is valid.');
