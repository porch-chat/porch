// SPDX-License-Identifier: AGPL-3.0-or-later

import type {DeviceScreenShareCaptureOptions} from '@app/features/voice/engine/voice_screen_share_manager/shared';
import type {LastScreenShareSource} from '@app/features/voice/state/VoiceSettings';
import {resolveDeviceSourceCaptureResolution} from '@app/features/voice/utils/ScreenShareOptions';
import type {ScreenShareCaptureOptions} from 'livekit-client';

export type StreamSettingsShareContext = 'app' | 'device' | 'display';

export function resolveActiveStreamSettingsShareContext(
	activeSourceId: string | null,
	lastSource: LastScreenShareSource | null,
): StreamSettingsShareContext {
	if (activeSourceId?.startsWith('window:')) return 'app';
	if (activeSourceId && lastSource?.kind === 'device' && lastSource.sourceId === activeSourceId) return 'device';
	return 'display';
}

export interface StreamSettingsUpdatePolicyInput {
	platform?: string | null;
	shareContext: StreamSettingsShareContext;
	audioSettingsChanged?: boolean;
}

export function isLinuxDesktopAudioShare(
	input: Pick<StreamSettingsUpdatePolicyInput, 'platform' | 'shareContext'>,
): boolean {
	return input.platform === 'linux' && input.shareContext !== 'device';
}

export function shouldReconfigureLinuxAudioForActiveStreamSettings(input: StreamSettingsUpdatePolicyInput): boolean {
	return isLinuxDesktopAudioShare(input) && input.audioSettingsChanged === true;
}

export interface ActiveDeviceScreenShareReplacementInput {
	videoDeviceId: string | null;
	sourceDimensions: {width: number; height: number} | undefined;
	lastSource: LastScreenShareSource | null;
	outputResolution: ScreenShareCaptureOptions['resolution'];
	includeAudio: boolean;
	audioDeviceId: string;
}

export function buildActiveDeviceScreenShareReplacement(
	input: ActiveDeviceScreenShareReplacementInput,
): DeviceScreenShareCaptureOptions | null {
	if (!input.videoDeviceId || !input.sourceDimensions) return null;
	const sourceFrameRate =
		input.lastSource?.kind === 'device' && input.lastSource.sourceId === input.videoDeviceId
			? input.lastSource.sourceFrameRate
			: undefined;
	const sourceResolution = resolveDeviceSourceCaptureResolution(
		input.outputResolution,
		input.sourceDimensions,
		sourceFrameRate,
	);
	if (!sourceResolution) return null;
	return {
		videoDeviceId: input.videoDeviceId,
		...(input.includeAudio ? {audioDeviceId: input.audioDeviceId} : {}),
		sourceResolution,
		resolution: input.outputResolution,
	};
}
