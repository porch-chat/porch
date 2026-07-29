// SPDX-License-Identifier: AGPL-3.0-or-later

import {
	createNavigationNetworkRequest,
	NAVIGATION_NETWORK_TIMEOUT_MS,
} from '@app/features/platform/service_worker/WorkerNavigationPolicy';
import {describe, expect, test} from 'vitest';

describe('service worker navigation freshness policy', () => {
	test('gives mobile networks time to return a revalidated runtime shell', () => {
		const original = new Request('https://app.porch.chat/channels/@me');
		const network = createNavigationNetworkRequest(original);

		expect(NAVIGATION_NETWORK_TIMEOUT_MS).toBeGreaterThanOrEqual(5000);
		expect(network.cache).toBe('reload');
		expect(network.url).toBe(original.url);
	});
});
