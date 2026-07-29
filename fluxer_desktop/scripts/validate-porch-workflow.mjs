// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const desktopDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repositoryDir = path.resolve(desktopDir, '..');
const workflow = fs.readFileSync(path.join(repositoryDir, '.github', 'workflows', 'build-porch-desktop.yaml'), 'utf8');

for (const forbidden of [
	'api.fluxer.app',
	'canary.fluxer.app',
	'fluxer-downloads',
	'AWS_ACCESS_KEY_ID',
	'APPLE_CERTIFICATE',
]) {
	assert.ok(!workflow.includes(forbidden), `Active Porch workflow must not reference ${forbidden}`);
}

assert.ok(workflow.includes('actions/upload-artifact@'), 'Porch workflow must retain artifacts for acceptance');
assert.ok(workflow.includes('permissions:\n  contents: read'), 'Porch workflow must remain read-only by default');
assert.ok(!workflow.includes('cargo run --locked --quiet'), 'Porch workflow must invoke the cached CI helper directly');
assert.equal(
	workflow.match(/- name: Set build metadata/g)?.length,
	1,
	'The workflow must generate one immutable version tuple before platform jobs fan out.',
);
for (const output of ['version', 'pub_date', 'source_sha']) {
	assert.ok(
		workflow.includes(`${output}: \${{ steps.metadata.outputs.${output} }}`),
		`Validation must export shared build metadata ${output}.`,
	);
	assert.ok(
		workflow.includes(`\${{ needs.validate.outputs.${output} }}`),
		`Platform jobs must consume shared build metadata ${output}.`,
	);
}
for (const required of [
	'Cache Cargo registries',
	'Cache Porch CI helper',
	'Cache native desktop builds',
	'FLUXER_CI_BIN',
	'node --test scripts/ci-helper-command.test.mjs',
]) {
	assert.ok(workflow.includes(required), `Active Porch workflow must include ${required}`);
}
const nativeCacheKey = workflow.split(/\r?\n/).find((line) => line.includes('key: windows-x64-porch-native-v2-'));
assert.ok(nativeCacheKey, 'Porch workflow must define an independently keyed native cache');
assert.ok(!nativeCacheKey.includes('_ci/'), 'Native cache key must not depend on CI helper sources');

console.log('Active Porch desktop workflow is isolated from Fluxer release infrastructure.');
