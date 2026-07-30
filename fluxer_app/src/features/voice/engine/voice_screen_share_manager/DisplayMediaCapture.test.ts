// SPDX-License-Identifier: AGPL-3.0-or-later

import {beforeEach, describe, expect, test, vi} from 'vitest';

const mocks = vi.hoisted(() => ({
	nativeScreenCaptureStart: vi.fn(),
	nativeScreenCaptureStop: vi.fn(),
	createScreenChromiumPreviewBridge: vi.fn(),
}));

vi.mock('@app/features/devtools/state/DeveloperOptions', () => ({
	default: {gameCaptureInjectionMethod: 'auto'},
}));

vi.mock('@app/features/platform/utils/AppLogger', () => ({
	Logger: class {
		debug = vi.fn();
		warn = vi.fn();
	},
}));

vi.mock('@app/features/ui/utils/NativeUtils', () => ({
	getElectronAPI: () => ({
		platform: 'win32',
		nativeScreenCapture: {
			getAvailability: async () => ({available: true, backend: 'windows-dxgi'}),
			start: mocks.nativeScreenCaptureStart,
			stop: mocks.nativeScreenCaptureStop,
		},
	}),
}));

vi.mock('@app/features/voice/engine/ScreenShareCaptureDiagnostics', () => ({
	markScreenShareCaptureActive: vi.fn(),
	markScreenShareCaptureEnded: vi.fn(),
	updateScreenShareDisplayMediaSettings: vi.fn(),
}));

vi.mock('@app/features/voice/engine/voice_screen_share_manager/shared', () => ({
	stopMediaTrack: vi.fn(),
	stopUnselectedStreamTracks: vi.fn(),
}));

vi.mock('@app/features/voice/state/ActiveScreenShareSource', () => ({
	default: {getSourceId: () => null},
}));

vi.mock('@app/features/voice/utils/native_screen_capture_bridge/createChromiumPreviewBridge', () => ({
	createScreenChromiumPreviewBridge: mocks.createScreenChromiumPreviewBridge,
}));

vi.mock('@app/features/voice/utils/native_screen_capture_bridge/shared', () => ({
	getNativeScreenCaptureApi: () => ({
		getAvailability: async () => ({available: true, backend: 'windows-dxgi'}),
		start: mocks.nativeScreenCaptureStart,
		stop: mocks.nativeScreenCaptureStop,
	}),
	markNativeScreenShareTrack: vi.fn(),
	normalizeNativeScreenCaptureResolution: (
		resolution: {width?: number; height?: number} | undefined,
	): {width?: number; height?: number} | undefined => resolution,
}));

import {startNativeCaptureForEngine} from './DisplayMediaCapture';

describe('startNativeCaptureForEngine', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mocks.nativeScreenCaptureStart.mockResolvedValue({
			captureId: 'capture-1',
			width: 2560,
			height: 1440,
			frameRate: 60,
			pixelFormat: 'nv12',
		});
	});

	test('keeps outgoing native capture active when the local Chromium preview fails', async () => {
		mocks.createScreenChromiumPreviewBridge.mockRejectedValue(
			new DOMException('Could not start video source', 'NotReadableError'),
		);

		const capture = await startNativeCaptureForEngine({
			source: {
				kind: 'screen',
				id: 'display:69733632',
				name: 'Display 1',
				width: 2560,
				height: 1440,
			},
			desktopCaptureSourceId: 'screen:0:0',
			captureId: 'capture-1',
			resolution: {width: 2560, height: 1440, frameRate: 60},
		});

		expect(capture).toMatchObject({
			captureId: 'capture-1',
			width: 2560,
			height: 1440,
			previewBridge: null,
		});
		expect(mocks.nativeScreenCaptureStart).toHaveBeenCalledOnce();
		expect(mocks.nativeScreenCaptureStop).not.toHaveBeenCalled();
	});

	test('keeps outgoing native capture active when no Chromium source id is available', async () => {
		const capture = await startNativeCaptureForEngine({
			source: {
				kind: 'screen',
				id: 'display:69733632',
				name: 'Display 1',
				width: 2560,
				height: 1440,
			},
			captureId: 'capture-1',
			resolution: {width: 2560, height: 1440, frameRate: 60},
		});

		expect(capture.previewBridge).toBeNull();
		expect(mocks.createScreenChromiumPreviewBridge).not.toHaveBeenCalled();
		expect(mocks.nativeScreenCaptureStop).not.toHaveBeenCalled();
	});
});
