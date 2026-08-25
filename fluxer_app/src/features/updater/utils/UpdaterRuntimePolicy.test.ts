// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {isWebUpdateHost, normalizeUpdaterEvent} from './UpdaterRuntimePolicy';

describe('isWebUpdateHost', () => {
	it.each([
		'app.porch.chat',
		'canary.porch.chat',
		'APP.PORCH.CHAT',
		'app.porch.chat.',
	])('allows Porch production web origins: %s', (hostname) => {
		expect(isWebUpdateHost(hostname)).toBe(true);
	});

	it.each([
		'porch.chat',
		'api.porch.chat',
		'localhost',
		'app.porch.chat.example.com',
	])('rejects non-client origins: %s', (hostname) => {
		expect(isWebUpdateHost(hostname)).toBe(false);
	});
});

describe('normalizeUpdaterEvent', () => {
	it('preserves download and install error phases from the native updater', () => {
		expect(
			normalizeUpdaterEvent({
				type: 'error',
				context: 'user',
				phase: 'download',
				message: 'network unavailable',
			}),
		).toEqual({
			type: 'error',
			context: 'user',
			phase: 'download',
			message: 'network unavailable',
		});
	});

	it('defaults missing native contexts to background', () => {
		expect(normalizeUpdaterEvent({type: 'checking'})).toEqual({type: 'checking', context: 'background'});
	});

	it('rejects malformed progress events', () => {
		expect(normalizeUpdaterEvent({type: 'progress', context: 'user', percent: 25})).toBeNull();
	});
});
