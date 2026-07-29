// SPDX-License-Identifier: AGPL-3.0-or-later

import fs from 'node:fs';
import path from 'node:path';
import {BUILD_CHANNEL, type BuildChannel} from '@electron/common/BuildChannel';
import {PORCH_DESKTOP_PRODUCT} from '@electron/common/PorchProduct';
import {getPortableDataBase, getPortableMarkerLocations} from '@electron/common/PortableModePath';
import {app} from 'electron';

interface UserDataPaths {
	readonly channel: BuildChannel;
	readonly directoryName: string;
	readonly base: string;
	readonly portable: boolean;
}

interface ChannelStorageDirectoryMap {
	stable: string;
	canary: string;
}

const channelStorageDirectoryMap: ChannelStorageDirectoryMap = {
	stable: PORCH_DESKTOP_PRODUCT.channels.stable.userDataDirectory,
	canary: PORCH_DESKTOP_PRODUCT.channels.canary.userDataDirectory,
};

let portableMode = false;

function getPortableMarkerLocation(): string | undefined {
	const envValue = process.env.FLUXER_PORTABLE;
	if (
		process.argv.includes('--fluxer-portable') ||
		(envValue && ['1', 'true', 'yes', 'on'].includes(envValue.trim().toLowerCase()))
	) {
		return '';
	}
	const markerLocations = getPortableMarkerLocations({
		appImage: process.env.APPIMAGE,
		execPath: process.execPath,
		platform: process.platform,
	});
	return markerLocations.find((location) => {
		try {
			return fs.existsSync(location);
		} catch {
			return false;
		}
	});
}

function resolveUserDataPaths(channel: BuildChannel): {
	directoryName: string;
	base: string;
	portable: boolean;
} {
	const directoryName = channelStorageDirectoryMap[channel];
	const markerLocation = getPortableMarkerLocation();
	const portable = markerLocation !== undefined;
	portableMode = portable;
	if (portable) {
		const portableDataBase = getPortableDataBase(
			{
				appImage: process.env.APPIMAGE,
				execPath: process.execPath,
				platform: process.platform,
			},
			markerLocation || undefined,
		);
		const base = path.join(portableDataBase, directoryName);
		fs.mkdirSync(base, {recursive: true});
		return {directoryName, base, portable};
	}
	const appDataPath = app.getPath('appData');
	const base = path.join(appDataPath, directoryName);
	return {directoryName, base, portable};
}

export function isPortableMode(): boolean {
	return portableMode;
}

export function configureUserDataPath(): UserDataPaths {
	const channel = BUILD_CHANNEL;
	const {directoryName, base, portable} = resolveUserDataPaths(channel);
	app.setPath('userData', base);
	if (portable) {
		try {
			app.setPath('sessionData', path.join(base, 'session'));
			fs.mkdirSync(path.join(base, 'session'), {recursive: true});
		} catch {}
		try {
			const logsPath = path.join(base, 'logs');
			app.setPath('logs', logsPath);
			fs.mkdirSync(logsPath, {recursive: true});
		} catch {}
		try {
			const crashDumpsPath = path.join(base, 'crash-dumps');
			app.setPath('crashDumps', crashDumpsPath);
			fs.mkdirSync(crashDumpsPath, {recursive: true});
		} catch {}
	}
	return {
		channel,
		directoryName,
		base,
		portable,
	};
}
