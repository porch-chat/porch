// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'node:assert/strict';
import Users from '@app/features/user/state/Users';
import NativeVideoTileManager from '@app/features/voice/engine/native_voice_engine/NativeVideoTileManager';
import {
	getVoiceConnectionContextFromMediaEngine,
	getVoiceEngineV2SnapshotFromMediaEngine,
} from '@app/features/voice/engine/VoiceMediaEngineBridge';
import {VoiceTrackSource} from '@app/features/voice/engine/VoiceTrackSource';
import voiceEngineV2AppConnectionHostAdapter from '@app/features/voice/engine/v2/VoiceEngineV2AppConnectionHostAdapter';
import type {VoiceEngineV2AppScreenShareExecutionAdapter} from '@app/features/voice/engine/v2/VoiceEngineV2AppScreenShareExecutionAdapter';
import {selectVoiceEngineV2AppParticipants} from '@app/features/voice/engine/v2/VoiceEngineV2AppSelectors';
import type {NativeEngineScreenCapture} from '@app/features/voice/engine/voice_screen_share_manager/DisplayMediaCapture';
import {
	type DeviceScreenShareCaptureOptions,
	logger,
} from '@app/features/voice/engine/voice_screen_share_manager/shared';
import {buildVoiceParticipantIdentity} from '@app/features/voice/utils/VoiceParticipantIdentity';

const NATIVE_SCREEN_SHARE_PREVIEW_RETRY_DELAY_MS = 250;
const NATIVE_SCREEN_SHARE_PREVIEW_MAX_ATTEMPTS = 8;
const NATIVE_SCREEN_SHARE_PREVIEW_READY_TIMEOUT_MS = 2000;

interface NativeScreenSharePreviewParticipant {
	identity: string;
	sid: string;
}

type NativeScreenSharePreviewParticipantCandidate = NativeScreenSharePreviewParticipant & {
	isLocal?: boolean;
};

function delay(ms: number): Promise<void> {
	assert.ok(Number.isFinite(ms) && ms >= 0, 'ms must be non-negative finite');
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export class VoiceEngineV2AppScreenSharePreviewTracking {
	private readonly adapter: VoiceEngineV2AppScreenShareExecutionAdapter;

	constructor(adapter: VoiceEngineV2AppScreenShareExecutionAdapter) {
		this.adapter = adapter;
	}

	registerCapturePreview(capture: NativeEngineScreenCapture): void {
		assert.ok(capture, 'capture required');
		assert.equal(typeof capture.captureId, 'string', 'capture.captureId must be string');
		this.clearPreview();
		if (!capture.previewBridge) {
			logger.warn('Native-engine screen share has no local preview track; outgoing capture remains active', {
				captureId: capture.captureId,
			});
			return;
		}
		const token = this.adapter.nativeEngineScreenSharePreviewStartToken;
		void this.attachCapturePreview(capture, token);
	}

	registerDevicePreview(
		_options: DeviceScreenShareCaptureOptions | undefined,
		_dimensions: {width: number; height: number; frameRate: number},
	): void {
		this.clearPreview();
		const token = this.adapter.nativeEngineScreenSharePreviewStartToken;
		void this.attachDevicePreview(token);
	}

	clearPreview(): void {
		this.adapter.nativeEngineScreenSharePreviewStartToken++;
		const trackSid = this.adapter.nativeEngineScreenSharePreviewTrackSid;
		this.adapter.nativeEngineScreenSharePreviewTrackSid = null;
		assert.equal(this.adapter.nativeEngineScreenSharePreviewTrackSid, null, 'trackSid must be null after clearPreview');
		if (trackSid) {
			NativeVideoTileManager.unregisterTrack(trackSid);
		}
	}

	private async cleanupUnattachedPreview(capture: NativeEngineScreenCapture, reason: string): Promise<void> {
		if (!capture.previewBridge) return;
		await capture.previewBridge.cleanup(false).catch((error) => {
			logger.warn('Failed to clean up unattached native-engine screen-share preview', {
				captureId: capture.captureId,
				reason,
				error,
			});
		});
	}

	private resolveLocalParticipant(): NativeScreenSharePreviewParticipant | null {
		const snapshot = getVoiceEngineV2SnapshotFromMediaEngine();
		const participants: ReadonlyArray<NativeScreenSharePreviewParticipantCandidate> = snapshot
			? selectVoiceEngineV2AppParticipants(snapshot).participants
			: [];
		const connectionId = getVoiceConnectionContextFromMediaEngine()?.connectionId ?? null;
		const currentUserId = Users.getCurrentUser()?.id;
		const fallbackIdentity =
			currentUserId && connectionId ? buildVoiceParticipantIdentity(currentUserId, connectionId) : null;
		const localParticipant =
			participants.find((participant) => participant.isLocal && participant.identity) ??
			(fallbackIdentity ? participants.find((participant) => participant.identity === fallbackIdentity) : undefined);
		if (localParticipant?.identity) {
			return {
				identity: localParticipant.identity,
				sid: localParticipant.sid || localParticipant.identity,
			};
		}
		if (!fallbackIdentity) return null;
		return {
			identity: fallbackIdentity,
			sid: fallbackIdentity,
		};
	}

	private waitForLocalParticipant(token: number): Promise<NativeScreenSharePreviewParticipant | null> {
		assert.ok(Number.isInteger(token), 'token must be an integer');
		assert.ok(token >= 0, 'token must be non-negative');
		const immediate = this.resolveLocalParticipant();
		if (immediate) {
			return Promise.resolve(immediate);
		}
		return new Promise((resolve) => {
			let settled = false;
			let unsubscribe: (() => void) | null = null;
			let timeoutId: NodeJS.Timeout | null = null;
			const settle = (participant: NativeScreenSharePreviewParticipant | null): void => {
				if (settled) return;
				settled = true;
				unsubscribe?.();
				if (timeoutId != null) {
					clearTimeout(timeoutId);
				}
				resolve(participant);
			};
			const check = (): void => {
				if (token !== this.adapter.nativeEngineScreenSharePreviewStartToken) {
					settle(null);
					return;
				}
				const participant = this.resolveLocalParticipant();
				if (participant) {
					settle(participant);
				}
			};
			unsubscribe = voiceEngineV2AppConnectionHostAdapter.subscribe(check);
			timeoutId = setTimeout(
				() => settle(this.resolveLocalParticipant()),
				NATIVE_SCREEN_SHARE_PREVIEW_READY_TIMEOUT_MS,
			);
			check();
		});
	}

	private async attachCapturePreview(capture: NativeEngineScreenCapture, token: number): Promise<void> {
		const previewBridge = capture.previewBridge;
		if (!previewBridge) return;
		const localParticipant = await this.waitForLocalParticipant(token);
		if (token !== this.adapter.nativeEngineScreenSharePreviewStartToken) {
			await this.cleanupUnattachedPreview(capture, 'stale-preview-registration');
			return;
		}
		if (!localParticipant?.identity) {
			await this.cleanupUnattachedPreview(capture, 'missing-local-participant');
			logger.warn('Cannot attach native-engine screen-share preview without local participant', {
				captureId: capture.captureId,
			});
			return;
		}
		const trackSid = `native-local-screen:${capture.captureId}`;
		this.adapter.nativeEngineScreenSharePreviewTrackSid = trackSid;
		NativeVideoTileManager.registerLocalPreviewTrack({
			participantSid: localParticipant.sid,
			participantIdentity: localParticipant.identity,
			trackSid,
			source: VoiceTrackSource.ScreenShare,
			width: capture.width,
			height: capture.height,
			stream: new MediaStream([previewBridge.track]),
			cleanup: () => previewBridge.cleanup(false),
		});
	}

	private async attachDevicePreview(token: number): Promise<void> {
		const [localParticipant, trackSid] = await Promise.all([
			this.waitForLocalParticipant(token),
			this.waitForPublishedDeviceTrackSid(token),
		]);
		if (token !== this.adapter.nativeEngineScreenSharePreviewStartToken) return;
		if (!localParticipant?.identity) {
			logger.warn('Cannot attach native-engine device screen-share preview without local participant');
			return;
		}
		if (!trackSid) {
			logger.warn('Cannot attach native-engine device screen-share preview without published track SID');
			return;
		}
		NativeVideoTileManager.registerTrack(
			localParticipant.sid,
			trackSid,
			VoiceTrackSource.ScreenShare,
			localParticipant.identity,
		);
		const registered = NativeVideoTileManager.tracks[trackSid];
		if (!registered) {
			logger.warn('Native-engine device screen-share preview registration was refused', {
				participantSid: localParticipant.sid,
				participantIdentity: localParticipant.identity,
				trackSid,
			});
			return;
		}
		this.adapter.nativeEngineScreenSharePreviewTrackSid = trackSid;
		logger.info('Attached native-engine device screen-share preview to sender frames', {
			participantSid: localParticipant.sid,
			participantIdentity: localParticipant.identity,
			trackSid,
		});
	}

	private async waitForPublishedDeviceTrackSid(token: number): Promise<string | null> {
		for (let attempt = 1; attempt <= NATIVE_SCREEN_SHARE_PREVIEW_MAX_ATTEMPTS; attempt++) {
			if (token !== this.adapter.nativeEngineScreenSharePreviewStartToken) return null;
			const trackSid = this.adapter.captureCoordinator.activeCapturePublishedTrackSid;
			if (trackSid) return trackSid;
			if (attempt >= NATIVE_SCREEN_SHARE_PREVIEW_MAX_ATTEMPTS) break;
			await delay(NATIVE_SCREEN_SHARE_PREVIEW_RETRY_DELAY_MS);
		}
		return null;
	}
}
