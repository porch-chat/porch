// SPDX-License-Identifier: AGPL-3.0-or-later

import {
	type DeviceSourceMode,
	formatDeviceSourceModeLabel,
} from '@app/features/voice/components/modals/screen_share_picker_modal/DeviceSourceModeLabel';
import {describe, expect, it} from 'vitest';

function mode(width: number, height: number, maxFrameRate: number): DeviceSourceMode {
	return {
		key: `${width}x${height}`,
		width,
		height,
		maxFrameRate,
	};
}

describe('formatDeviceSourceModeLabel', () => {
	it('renders the real capture dimensions and frame rate', () => {
		expect(formatDeviceSourceModeLabel(mode(3440, 1440, 60))).toBe('3440 × 1440 · up to 60 FPS');
	});

	it('caps the advertised rate at the supported 60 FPS maximum', () => {
		expect(formatDeviceSourceModeLabel(mode(3840, 2160, 120))).toBe('3840 × 2160 · up to 60 FPS');
	});
});
