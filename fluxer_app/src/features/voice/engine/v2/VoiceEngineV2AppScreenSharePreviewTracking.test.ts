// SPDX-License-Identifier: AGPL-3.0-or-later

import {beforeEach, describe, expect, it, vi} from 'vitest';

const mocks = vi.hoisted(() => {
	const tracks: Record<string, unknown> = {};
	return {
		tracks,
		registerTrack: vi.fn((participantSid: string, trackSid: string, source: string, participantIdentity?: string) => {
			tracks[trackSid] = {
				participantSid,
				participantIdentity,
				trackSid,
				source,
				width: 0,
				height: 0,
				stream: {},
			};
		}),
		registerLocalPreviewTrack: vi.fn(),
		unregisterTrack: vi.fn((trackSid: string) => {
			delete tracks[trackSid];
		}),
	};
});

vi.mock('@app/features/user/state/Users', () => ({
	default: {
		getCurrentUser: () => ({id: '100'}),
	},
}));

vi.mock('@app/features/voice/engine/native_voice_engine/NativeVideoTileManager', () => ({
	default: {
		tracks: mocks.tracks,
		registerTrack: mocks.registerTrack,
		registerLocalPreviewTrack: mocks.registerLocalPreviewTrack,
		unregisterTrack: mocks.unregisterTrack,
	},
}));

vi.mock('@app/features/voice/engine/VoiceMediaEngineBridge', () => ({
	getVoiceConnectionContextFromMediaEngine: () => ({connectionId: 'connection-1'}),
	getVoiceEngineV2SnapshotFromMediaEngine: () => ({}),
}));

vi.mock('@app/features/voice/engine/v2/VoiceEngineV2AppConnectionHostAdapter', () => ({
	default: {
		subscribe: vi.fn(() => () => undefined),
	},
}));

vi.mock('@app/features/voice/engine/v2/VoiceEngineV2AppSelectors', () => ({
	selectVoiceEngineV2AppParticipants: () => ({
		participants: [
			{
				identity: 'user_100_connection-1',
				sid: 'PA_local',
				isLocal: true,
			},
		],
	}),
}));

vi.mock('@app/features/voice/engine/voice_screen_share_manager/shared', () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
	},
}));

import {VoiceEngineV2AppScreenSharePreviewTracking} from './VoiceEngineV2AppScreenSharePreviewTracking';

interface TestAdapter {
	captureCoordinator: {activeCapturePublishedTrackSid: string | null};
	nativeEngineScreenSharePreviewStartToken: number;
	nativeEngineScreenSharePreviewTrackSid: string | null;
}

function createAdapter(): TestAdapter {
	return {
		captureCoordinator: {activeCapturePublishedTrackSid: 'TR_device_screen'},
		nativeEngineScreenSharePreviewStartToken: 0,
		nativeEngineScreenSharePreviewTrackSid: null,
	};
}

describe('VoiceEngineV2AppScreenSharePreviewTracking device preview', () => {
	beforeEach(() => {
		for (const trackSid of Object.keys(mocks.tracks)) {
			delete mocks.tracks[trackSid];
		}
		mocks.registerTrack.mockClear();
		mocks.registerLocalPreviewTrack.mockClear();
		mocks.unregisterTrack.mockClear();
	});

	it('renders the native sender track instead of opening a second camera capture', async () => {
		const adapter = createAdapter();
		const preview = new VoiceEngineV2AppScreenSharePreviewTracking(adapter as never);

		preview.registerDevicePreview(
			{
				videoDeviceId: '\\\\?\\usb#vid_0fd9&pid_009c#capture-card',
				previewVideoDeviceId: 'browser-capture-card-id',
			},
			{width: 2560, height: 1440, frameRate: 60},
		);

		await vi.waitFor(() => {
			expect(adapter.nativeEngineScreenSharePreviewTrackSid).toBe('TR_device_screen');
		});
		expect(mocks.registerTrack).toHaveBeenCalledWith(
			'PA_local',
			'TR_device_screen',
			'screen_share',
			'user_100_connection-1',
		);
		expect(mocks.registerLocalPreviewTrack).not.toHaveBeenCalled();
	});

	it('unregisters the native sender preview track when the share ends', async () => {
		const adapter = createAdapter();
		const preview = new VoiceEngineV2AppScreenSharePreviewTracking(adapter as never);
		preview.registerDevicePreview(undefined, {width: 1920, height: 1080, frameRate: 60});
		await vi.waitFor(() => {
			expect(adapter.nativeEngineScreenSharePreviewTrackSid).toBe('TR_device_screen');
		});

		preview.clearPreview();

		expect(mocks.unregisterTrack).toHaveBeenCalledWith('TR_device_screen');
		expect(adapter.nativeEngineScreenSharePreviewTrackSid).toBeNull();
	});
});
