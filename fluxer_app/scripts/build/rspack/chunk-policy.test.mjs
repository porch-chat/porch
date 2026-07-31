// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'node:assert/strict';
import test from 'node:test';
import createRspackConfig from '../../../rspack.config.mjs';

test('shared extraction does not promote lazy feature dependencies to startup', () => {
	const config = createRspackConfig();
	const splitChunks = config.optimization?.splitChunks;
	assert.ok(splitChunks && typeof splitChunks === 'object');
	assert.equal(typeof splitChunks.chunks, 'function');
	assert.equal(splitChunks.chunks({runtime: 'main', canBeInitial: () => true}), true);
	assert.equal(splitChunks.chunks({runtime: 'main', canBeInitial: () => false}), false);
	assert.equal(splitChunks.chunks({runtime: 'sw', canBeInitial: () => true}), false);
	assert.equal(splitChunks.cacheGroups?.highlight?.chunks, 'async');
	assert.equal(splitChunks.cacheGroups?.katex?.chunks, undefined);
});
