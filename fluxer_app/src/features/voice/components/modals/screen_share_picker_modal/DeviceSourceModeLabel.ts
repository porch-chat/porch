// SPDX-License-Identifier: AGPL-3.0-or-later

export interface DeviceSourceMode {
	key: string;
	width: number;
	height: number;
	maxFrameRate: number;
}

export function formatDeviceSourceModeLabel(mode: DeviceSourceMode): string {
	const cappedFrameRate = Math.min(60, mode.maxFrameRate);
	return `${mode.width} × ${mode.height} · up to ${cappedFrameRate} FPS`;
}
