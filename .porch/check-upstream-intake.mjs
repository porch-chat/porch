// SPDX-License-Identifier: AGPL-3.0-or-later

import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lockPath = path.join(root, '.porch', 'upstream-lock.json');
const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const expectedRepository = 'https://github.com/fluxerapp/fluxer.git';
const expectedBranch = 'main';

if (lock.upstream_repository !== expectedRepository) {
	throw new Error(`Unexpected upstream repository in lock: ${lock.upstream_repository}`);
}
if (lock.upstream_branch !== expectedBranch) {
	throw new Error(`Unexpected upstream branch in lock: ${lock.upstream_branch}`);
}
if (!/^[0-9a-f]{40}$/.test(lock.upstream_commit)) {
	throw new Error(`Invalid upstream commit in lock: ${lock.upstream_commit}`);
}

execFileSync('node', [path.join(root, '.porch', 'configure-readonly-upstream.mjs'), '--check'], {
	cwd: root,
	stdio: 'inherit',
});

const reference = `refs/heads/${lock.upstream_branch}`;
const output = execFileSync('git', ['ls-remote', lock.upstream_repository, reference], {
	cwd: root,
	encoding: 'utf8',
}).trim();
const [currentCommit, currentReference] = output.split(/\s+/);
if (currentReference !== reference || !/^[0-9a-f]{40}$/.test(currentCommit ?? '')) {
	throw new Error(`Could not resolve ${reference} from ${lock.upstream_repository}`);
}

const caughtUp = currentCommit === lock.upstream_commit;
const status = caughtUp ? 'Caught up' : 'Intake available';
const summary = [
	'## Fluxer upstream intake',
	'',
	`- Status: **${status}**`,
	`- Recorded: \`${lock.upstream_commit}\``,
	`- Current: \`${currentCommit}\``,
	`- Branch: \`${lock.upstream_branch}\``,
	'',
	caughtUp
		? 'Porch is pinned to the current Fluxer upstream head.'
		: 'Fluxer upstream moved. Review and integrate it explicitly; this check does not modify Porch or upstream.',
	'',
].join('\n');

if (process.env.GITHUB_STEP_SUMMARY) {
	fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
}
console.log(summary);

if (!caughtUp) {
	process.exitCode = 1;
}
