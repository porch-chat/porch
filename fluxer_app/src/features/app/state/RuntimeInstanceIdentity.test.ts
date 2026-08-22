// SPDX-License-Identifier: AGPL-3.0-or-later

import {
	runtimeConfigSnapshotsAreSameInstance,
	runtimeInstanceKey,
} from '@app/features/app/state/RuntimeInstanceIdentity';
import {describe, expect, it} from 'vitest';

describe('runtime instance identity', () => {
	it('resolves a relative client endpoint through the absolute public API endpoint', () => {
		expect(
			runtimeInstanceKey({
				apiEndpoint: '/api',
				apiPublicEndpoint: 'https://api.porch.chat/api',
			}),
		).toBe('https://api.porch.chat/api');
	});

	it('treats relative and absolute routes to the same API as one instance', () => {
		expect(
			runtimeConfigSnapshotsAreSameInstance(
				{
					apiEndpoint: '/api',
					apiPublicEndpoint: 'https://api.porch.chat/api',
				},
				{
					apiEndpoint: 'https://api.porch.chat/api/',
					apiPublicEndpoint: 'https://api.porch.chat/api',
				},
			),
		).toBe(true);
	});

	it('normalizes an absolute endpoint without requiring a public fallback', () => {
		expect(
			runtimeInstanceKey({
				apiEndpoint: 'https://api.porch.chat/api/',
				apiPublicEndpoint: '',
			}),
		).toBe('https://api.porch.chat/api');
	});

	it('keeps relative endpoints on different public APIs isolated', () => {
		expect(
			runtimeConfigSnapshotsAreSameInstance(
				{apiEndpoint: '/api', apiPublicEndpoint: 'https://api.porch.chat/api'},
				{apiEndpoint: '/api', apiPublicEndpoint: 'https://api.example.test/api'},
			),
		).toBe(false);
	});

	it('rejects malformed and credential-bearing endpoints', () => {
		expect(runtimeInstanceKey({apiEndpoint: '/api', apiPublicEndpoint: 'not a URL'})).toBeNull();
		expect(
			runtimeInstanceKey({
				apiEndpoint: 'https://user:password@api.porch.chat/api',
				apiPublicEndpoint: 'https://api.porch.chat/api',
			}),
		).toBeNull();
	});
});
