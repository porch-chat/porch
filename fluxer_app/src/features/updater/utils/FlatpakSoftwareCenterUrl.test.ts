// SPDX-License-Identifier: AGPL-3.0-or-later

import {resolveManagedPackageUpdateUrl} from '@app/features/updater/utils/FlatpakSoftwareCenterUrl';
import {describe, expect, it} from 'vitest';

const DOWNLOAD_URL = 'https://porch.chat/download';

describe('resolveManagedPackageUpdateUrl', () => {
	it('uses the runtime Flatpak app ID for Porch packages', () => {
		expect(resolveManagedPackageUpdateUrl('chat.porch.desktop', DOWNLOAD_URL)).toBe('appstream://chat.porch.desktop');
		expect(resolveManagedPackageUpdateUrl('chat.porch.desktop.canary', DOWNLOAD_URL)).toBe(
			'appstream://chat.porch.desktop.canary',
		);
	});

	it('trims a valid runtime app ID', () => {
		expect(resolveManagedPackageUpdateUrl('  chat.porch.desktop  ', DOWNLOAD_URL)).toBe(
			'appstream://chat.porch.desktop',
		);
	});

	it.each([
		null,
		undefined,
		'',
		'app.fluxer.Fluxer/path',
		'app:fluxer',
		'app?fluxer',
	])('falls back to the Porch download page for an unavailable or unsafe app ID: %s', (appId) => {
		expect(resolveManagedPackageUpdateUrl(appId, DOWNLOAD_URL)).toBe(DOWNLOAD_URL);
	});
});
