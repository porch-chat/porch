// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {formatDesktopBuildVersion} from './DesktopBuildVersion';

describe('formatDesktopBuildVersion', () => {
	it('renders the compact Porch timestamp version as a readable UTC build date', () => {
		expect(formatDesktopBuildVersion('2026.729.135314', 'en-US')).toBe(
			'Jul 29, 2026, 1:53:14 PM UTC · 2026.729.135314',
		);
	});

	it('also renders the legacy four-part timestamp version', () => {
		expect(formatDesktopBuildVersion('2026.7.29.135314', 'en-US')).toBe(
			'Jul 29, 2026, 1:53:14 PM UTC · 2026.7.29.135314',
		);
	});

	it('restores the leading clock zero stripped by the release workflow', () => {
		expect(formatDesktopBuildVersion('2026.730.42636', 'en-US')).toBe('Jul 30, 2026, 4:26:36 AM UTC · 2026.730.42636');
	});

	it('leaves normal semantic versions and invalid timestamps unchanged', () => {
		expect(formatDesktopBuildVersion('1.4.2', 'en-US')).toBe('1.4.2');
		expect(formatDesktopBuildVersion('2026.229.135314', 'en-US')).toBe('2026.229.135314');
		expect(formatDesktopBuildVersion(null, 'en-US')).toBeNull();
	});
});
