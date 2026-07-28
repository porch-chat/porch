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

console.log('Active Porch desktop workflow is isolated from Fluxer release infrastructure.');
