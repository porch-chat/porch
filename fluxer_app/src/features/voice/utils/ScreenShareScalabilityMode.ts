// SPDX-License-Identifier: AGPL-3.0-or-later

import type {StreamingMode} from '@app/features/voice/state/VoiceSettings';
import type {
	ScreenShareEncoderMode,
	ScreenShareScalabilityModePreference,
	ScreenShareSoftwareQuality,
} from '@app/features/voice/utils/CodecCapabilityDetector';
import type {HardwareEncodeAnswer} from '@app/features/voice/utils/GpuEncoderCapabilities';
import type {TrackPublishOptions, VideoCodec} from 'livekit-client';

export interface ScreenShareScalabilityModeOptions {
	codec: VideoCodec;
	preference: ScreenShareScalabilityModePreference;
	streamingMode: StreamingMode;
	softwareQuality?: ScreenShareSoftwareQuality;
	encoderMode: ScreenShareEncoderMode;
	hardwareAcceleration: HardwareEncodeAnswer;
}

export function resolveScreenShareScalabilityMode({
	codec,
	preference,
	streamingMode,
	softwareQuality,
	encoderMode,
	hardwareAcceleration,
}: ScreenShareScalabilityModeOptions): TrackPublishOptions['scalabilityMode'] | undefined {
	if (codec !== 'av1' && codec !== 'vp9') return undefined;
	if (preference === 'single_layer') return 'L1T1';
	if (preference === 'temporal') return 'L1T3';
	if (preference === 'spatial') return 'L3T3_KEY';

	const hardwareBiased = encoderMode === 'hardware' || (encoderMode === 'auto' && hardwareAcceleration === 'hardware');
	if (hardwareBiased) return 'L1T1';

	if (streamingMode === 'gaming') return 'L1T3';
	if (streamingMode === 'screenshare') return 'L3T3_KEY';
	if (!softwareQuality) return undefined;
	const softwareBiased = encoderMode === 'software' || hardwareAcceleration === 'software';
	if (!softwareBiased) return undefined;
	if (softwareQuality === 'realtime') return 'L1T1';
	if (softwareQuality === 'balanced') return 'L1T3';
	return 'L3T3_KEY';
}
