// SPDX-License-Identifier: AGPL-3.0-or-later

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workflowsRoot = path.join(root, '.github', 'workflows');
const failures = [];

const requiredWorkflows = new Map([
	['build-porch-admin.yaml', ['name: build Porch admin', 'image: fluxer-admin', 'moving-tags: canary']],
	['build-porch-api.yaml', ['name: build Porch API', 'image: fluxer-api', 'moving-tags: canary']],
	[
		'build-porch-app-proxy.yaml',
		['name: build Porch app proxy', 'image: fluxer-app-proxy-self-hosted', 'moving-tags: canary'],
	],
	['build-porch-desktop.yaml', ['name: build Porch desktop']],
	['build-porch-static.yaml', ['name: build Porch static assets', 'image: fluxer-static', 'moving-tags: canary']],
	[
		'check-upstream-intake.yaml',
		[
			'name: Check Fluxer upstream intake',
			'schedule:',
			'permissions:',
			'contents: read',
			'node .porch/configure-readonly-upstream.mjs',
			'node .porch/check-upstream-intake.mjs',
		],
	],
	['validate-porch-automation.yaml', ['name: Validate Porch automation isolation']],
]);

const retiredWorkflows = [
	'build-api.yaml',
	'build-app-proxy-self-hosted.yaml',
	'build-app-proxy.yaml',
	'build-static.yaml',
	'dart-sdk-validation.yaml',
	'deploy-service.yaml',
	'dispatch-dart-sdk-regeneration.yaml',
	'i18n-source-sync.yaml',
	'i18n-weblate-pr.yaml',
	'labeller.yaml',
	'lock-closed-conversations.yaml',
	'pr-template-honeypot.yaml',
	'release-all.yaml',
	'repair-static-asset-metadata.yaml',
	'sync-static-bucket.yaml',
];

const forbiddenText = [
	'FLUXER_CI_APP',
	'AWS_ACCESS_KEY_ID',
	'AWS_SECRET_ACCESS_KEY',
	'KUBE_CONFIG',
	'pull_request_target',
	'repos/fluxerapp/',
	'orgs/fluxerapp/',
	'owner: fluxerapp',
	'vultrobjects.com',
];

const workflowFiles = fs
	.readdirSync(workflowsRoot)
	.filter((name) => name.endsWith('.yaml') || name.endsWith('.yml'))
	.toSorted();

for (const [name, requiredText] of requiredWorkflows) {
	const relativePath = path.join('.github', 'workflows', name);
	const absolutePath = path.join(workflowsRoot, name);
	if (!fs.existsSync(absolutePath)) {
		failures.push(`${relativePath} is required`);
		continue;
	}
	const content = fs.readFileSync(absolutePath, 'utf8');
	for (const expected of requiredText) {
		if (!content.includes(expected)) {
			failures.push(`${relativePath} is missing ${JSON.stringify(expected)}`);
		}
	}
}

for (const name of retiredWorkflows) {
	if (workflowFiles.includes(name)) {
		failures.push(`.github/workflows/${name} is retired from Porch and must not return`);
	}
}

for (const name of workflowFiles) {
	const relativePath = path.join('.github', 'workflows', name);
	const content = fs.readFileSync(path.join(workflowsRoot, name), 'utf8');
	for (const forbidden of forbiddenText) {
		if (content.includes(forbidden)) {
			failures.push(`${relativePath} contains forbidden external automation text ${JSON.stringify(forbidden)}`);
		}
	}
	if (name !== 'validate-porch-automation.yaml' && content.includes('  push:') && content.includes('      - main')) {
		failures.push(`${relativePath} must build from canary, not push-trigger from main`);
	}
}

if (failures.length > 0) {
	for (const failure of failures) {
		console.error(`- ${failure}`);
	}
	process.exit(1);
}

console.log(`Porch automation isolation passed for ${workflowFiles.length} workflows.`);
