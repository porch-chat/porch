// SPDX-License-Identifier: AGPL-3.0-or-later

import * as fs from 'node:fs';
import * as path from 'node:path';

export function resolveNativeBuildCommand(
	command,
	{environment = process.env, platform = process.platform, pathExists = fs.existsSync} = {},
) {
	const [originalBin, ...originalArgs] = command;
	const cachedCiHelper = environment.FLUXER_CI_BIN?.trim();
	if (originalBin === 'pnpm' && originalArgs.length === 1 && originalArgs[0] === 'build' && cachedCiHelper) {
		const platformPath = platform === 'win32' ? path.win32 : path.posix;
		if (!platformPath.isAbsolute(cachedCiHelper) || !pathExists(cachedCiHelper)) {
			throw new Error(`FLUXER_CI_BIN does not resolve to an existing absolute path: ${cachedCiHelper}`);
		}
		return {
			bin: cachedCiHelper,
			args: ['build-desktop-native-addon'],
			shell: false,
		};
	}
	return {
		bin: originalBin,
		args: originalArgs,
		shell: platform === 'win32' && path.extname(originalBin).toLowerCase() !== '.exe',
	};
}
