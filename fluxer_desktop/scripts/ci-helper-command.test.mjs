// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'node:assert/strict';
import test from 'node:test';
import {resolveNativeBuildCommand} from './ci-helper-command.mjs';

test('keeps the native package command when no cached helper is configured', () => {
	assert.deepEqual(resolveNativeBuildCommand(['pnpm', 'build'], {environment: {}, platform: 'win32'}), {
		bin: 'pnpm',
		args: ['build'],
		shell: true,
	});
});

test('uses an absolute cached helper directly for native package builds', () => {
	const helper = 'C:\\porch-ci-helper\\fluxer-ci.exe';
	assert.deepEqual(
		resolveNativeBuildCommand(['pnpm', 'build'], {
			environment: {FLUXER_CI_BIN: helper},
			platform: 'win32',
			pathExists: (candidate) => candidate === helper,
		}),
		{
			bin: helper,
			args: ['build-desktop-native-addon'],
			shell: false,
		},
	);
});

test('rejects a missing or relative cached helper', () => {
	assert.throws(
		() =>
			resolveNativeBuildCommand(['pnpm', 'build'], {
				environment: {FLUXER_CI_BIN: 'fluxer-ci.exe'},
				platform: 'win32',
				pathExists: () => true,
			}),
		/does not resolve to an existing absolute path/,
	);
	assert.throws(
		() =>
			resolveNativeBuildCommand(['pnpm', 'build'], {
				environment: {FLUXER_CI_BIN: 'C:\\porch-ci-helper\\fluxer-ci.exe'},
				platform: 'win32',
				pathExists: () => false,
			}),
		/does not resolve to an existing absolute path/,
	);
});
