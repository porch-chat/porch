// SPDX-License-Identifier: AGPL-3.0-or-later

import {spawnSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const FETCH_URL = 'https://github.com/fluxerapp/fluxer.git';
const BLOCKED_PUSH_URL = 'no_push://fluxer-upstream-is-read-only';
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const checkOnly = process.argv.includes('--check');

function git(args, {allowFailure = false} = {}) {
	const result = spawnSync('git', args, {
		cwd: repositoryRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
	});
	if (!allowFailure && result.status !== 0) {
		throw new Error(result.stderr.trim() || `git ${args.join(' ')} failed`);
	}
	return result;
}

const remotes = git(['remote'])
	.stdout.split(/\r?\n/u)
	.map((value) => value.trim())
	.filter(Boolean);

if (!remotes.includes('upstream')) {
	if (checkOnly) {
		throw new Error('The read-only upstream remote is not configured');
	}
	git(['remote', 'add', 'upstream', FETCH_URL]);
}

const fetchUrl = git(['remote', 'get-url', 'upstream']).stdout.trim();
if (fetchUrl !== FETCH_URL) {
	throw new Error(`Unexpected upstream fetch URL: ${fetchUrl}`);
}

if (!checkOnly) {
	git(['remote', 'set-url', '--push', 'upstream', BLOCKED_PUSH_URL]);
}

const pushUrls = git(['remote', 'get-url', '--push', '--all', 'upstream'])
	.stdout.split(/\r?\n/u)
	.map((value) => value.trim())
	.filter(Boolean);
if (pushUrls.length !== 1 || pushUrls[0] !== BLOCKED_PUSH_URL) {
	throw new Error(`Upstream push is not blocked: ${pushUrls.join(', ') || '(none)'}`);
}

console.log(`Fluxer upstream intake is read-only: fetch=${fetchUrl} push=${pushUrls[0]}`);
