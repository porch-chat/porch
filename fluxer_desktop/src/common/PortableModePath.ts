// SPDX-License-Identifier: AGPL-3.0-or-later

import path from 'node:path';

export interface PortableMarkerContext {
	readonly appImage?: string;
	readonly execPath: string;
	readonly platform: NodeJS.Platform;
}

export function getPortableMarkerLocations(context: PortableMarkerContext): Array<string> {
	const executableDir = path.dirname(context.execPath);
	const locations = new Set<string>([path.join(executableDir, '.portable')]);

	if (path.basename(executableDir).toLowerCase() === 'current') {
		locations.add(path.join(path.dirname(executableDir), '.portable'));
	}
	if (context.platform === 'darwin') {
		const match = context.execPath.match(/^(.+?)\.app\//);
		if (match) {
			locations.add(path.join(path.dirname(`${match[1]}.app`), '.portable'));
		}
	}
	if (context.appImage) {
		locations.add(path.join(path.dirname(context.appImage), '.portable'));
	}

	return [...locations];
}
