// SPDX-License-Identifier: AGPL-3.0-or-later

import path from 'node:path';

export interface PortableMarkerContext {
	readonly appImage?: string;
	readonly execPath: string;
	readonly platform: NodeJS.Platform;
}

function getPathApi(platform: NodeJS.Platform): typeof path.win32 | typeof path.posix {
	return platform === 'win32' ? path.win32 : path.posix;
}

export function getPortableMarkerLocations(context: PortableMarkerContext): Array<string> {
	const pathApi = getPathApi(context.platform);
	const executableDir = pathApi.dirname(context.execPath);
	const locations = new Set<string>([pathApi.join(executableDir, '.portable')]);

	if (pathApi.basename(executableDir).toLowerCase() === 'current') {
		locations.add(pathApi.join(pathApi.dirname(executableDir), '.portable'));
	}
	if (context.platform === 'darwin') {
		const match = context.execPath.match(/^(.+?)\.app\//);
		if (match) {
			locations.add(pathApi.join(pathApi.dirname(`${match[1]}.app`), '.portable'));
		}
	}
	if (context.appImage) {
		locations.add(pathApi.join(pathApi.dirname(context.appImage), '.portable'));
	}

	return [...locations];
}

export function getPortableDataBase(context: PortableMarkerContext, markerLocation?: string): string {
	const pathApi = getPathApi(context.platform);
	if (markerLocation) {
		return pathApi.join(pathApi.dirname(markerLocation), 'data');
	}
	if (context.platform === 'darwin') {
		const match = context.execPath.match(/^(.+?)\.app\//);
		if (match) {
			return pathApi.join(pathApi.dirname(`${match[1]}.app`), 'data');
		}
	}
	if (context.appImage) {
		return pathApi.join(pathApi.dirname(context.appImage), 'data');
	}
	return pathApi.join(pathApi.dirname(context.execPath), 'data');
}
