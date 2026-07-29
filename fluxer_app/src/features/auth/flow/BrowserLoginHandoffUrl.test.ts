// SPDX-License-Identifier: AGPL-3.0-or-later

import {resolveBrowserHandoffWebAppUrl} from '@app/features/auth/flow/BrowserLoginHandoffUrl';
import {describe, expect, test} from 'vitest';

describe('resolveBrowserHandoffWebAppUrl', () => {
	test('keeps a desktop channel on its current origin', () => {
		expect(
			resolveBrowserHandoffWebAppUrl({
				canSwitchInstanceUrl: true,
				currentOrigin: 'https://canary.porch.chat',
				runtimeWebAppBaseUrl: 'https://app.porch.chat',
			}),
		).toBe('https://canary.porch.chat');
	});

	test('uses runtime discovery for a browser client', () => {
		expect(
			resolveBrowserHandoffWebAppUrl({
				canSwitchInstanceUrl: false,
				currentOrigin: 'https://canary.porch.chat',
				runtimeWebAppBaseUrl: 'https://app.porch.chat',
			}),
		).toBe('https://app.porch.chat');
	});

	test('honors an explicit target before either default', () => {
		expect(
			resolveBrowserHandoffWebAppUrl({
				canSwitchInstanceUrl: true,
				currentOrigin: 'https://canary.porch.chat',
				runtimeWebAppBaseUrl: 'https://app.porch.chat',
				targetWebAppUrl: 'https://friends.example.com',
			}),
		).toBe('https://friends.example.com');
	});
});
