// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'node:assert/strict';
import test from 'node:test';
import createRspackConfig from '../../../rspack.config.mjs';

test('catch-all vendor extraction does not promote lazy feature dependencies to startup', () => {
	const config = createRspackConfig();
	const splitChunks = config.optimization?.splitChunks;
	assert.ok(splitChunks && typeof splitChunks === 'object');
	assert.equal(splitChunks.cacheGroups?.vendor?.chunks, 'initial');
});
