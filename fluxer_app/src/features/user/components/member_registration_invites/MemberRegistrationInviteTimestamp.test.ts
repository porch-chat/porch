// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {formatMemberRegistrationInviteTimestamp} from './MemberRegistrationInviteTimestamp';

describe('formatMemberRegistrationInviteTimestamp', () => {
	it('renders the translated label and date without leaking a positional placeholder', () => {
		const rendered = formatMemberRegistrationInviteTimestamp('Expires', 'Jul 29, 2026, 8:15 PM');

		expect(rendered).toBe('Expires Jul 29, 2026, 8:15 PM');
		expect(rendered).not.toContain('{0}');
	});
});
