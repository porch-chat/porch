// SPDX-License-Identifier: AGPL-3.0-or-later

import {resolveScreenShareScalabilityMode} from '@app/features/voice/utils/ScreenShareScalabilityMode';
import {describe, expect, test} from 'vitest';

describe('resolveScreenShareScalabilityMode', () => {
	test.each([
		['gaming', 'L1T1'],
		['screenshare', 'L1T1'],
		['custom', 'L1T1'],
	] as const)('uses a single layer for automatic hardware %s sharing', (streamingMode, expected) => {
		expect(
			resolveScreenShareScalabilityMode({
				codec: 'av1',
				preference: 'auto',
				streamingMode,
				softwareQuality: 'quality',
				encoderMode: 'auto',
				hardwareAcceleration: 'hardware',
			}),
		).toBe(expected);
	});

	test('uses a single layer when hardware encoding is explicitly requested', () => {
		expect(
			resolveScreenShareScalabilityMode({
				codec: 'vp9',
				preference: 'auto',
				streamingMode: 'screenshare',
				encoderMode: 'hardware',
				hardwareAcceleration: 'unknown',
			}),
		).toBe('L1T1');
	});

	test.each([
		['single_layer', 'L1T1'],
		['temporal', 'L1T3'],
		['spatial', 'L3T3_KEY'],
	] as const)('respects the explicit %s preference', (preference, expected) => {
		expect(
			resolveScreenShareScalabilityMode({
				codec: 'av1',
				preference,
				streamingMode: 'screenshare',
				encoderMode: 'hardware',
				hardwareAcceleration: 'hardware',
			}),
		).toBe(expected);
	});

	test('preserves spatial scalability for automatic software screen sharing', () => {
		expect(
			resolveScreenShareScalabilityMode({
				codec: 'av1',
				preference: 'auto',
				streamingMode: 'screenshare',
				encoderMode: 'software',
				hardwareAcceleration: 'software',
			}),
		).toBe('L3T3_KEY');
	});

	test('does not apply SVC settings to H.264', () => {
		expect(
			resolveScreenShareScalabilityMode({
				codec: 'h264',
				preference: 'auto',
				streamingMode: 'screenshare',
				encoderMode: 'hardware',
				hardwareAcceleration: 'hardware',
			}),
		).toBeUndefined();
	});
});
