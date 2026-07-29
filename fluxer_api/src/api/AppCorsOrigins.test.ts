// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, test} from 'vitest';
import type {APIConfig} from './config/APIConfig';
import {resolveCorsOrigins} from './config/CorsOrigins';

describe('resolveCorsOrigins', () => {
	test('keeps additional client origins independent from the marketing site', () => {
		const endpoints = {
			webApp: 'https://app.porch.chat',
			marketing: 'https://porch.chat',
		} as APIConfig['endpoints'];

		expect(
			resolveCorsOrigins({
				endpoints,
				corsAllowedOrigins: ['https://app.porch.chat', 'https://canary.porch.chat'],
			}),
		).toEqual(['https://app.porch.chat', 'https://porch.chat', 'https://canary.porch.chat']);
	});
});
