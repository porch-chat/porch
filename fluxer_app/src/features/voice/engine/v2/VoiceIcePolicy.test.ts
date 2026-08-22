// SPDX-License-Identifier: AGPL-3.0-or-later

import {shouldForceRelayIce} from '@app/features/voice/engine/v2/VoiceIcePolicy';
import {describe, expect, it} from 'vitest';

describe('voice ICE policy', () => {
	it('allows direct and fallback candidates for self-hosted Electron clients', () => {
		expect(shouldForceRelayIce(true, true)).toBe(false);
	});

	it('preserves relay-only Electron behavior for hosted infrastructure', () => {
		expect(shouldForceRelayIce(true, false)).toBe(true);
	});

	it('does not force relay in browsers', () => {
		expect(shouldForceRelayIce(false, false)).toBe(false);
		expect(shouldForceRelayIce(false, true)).toBe(false);
	});
});
