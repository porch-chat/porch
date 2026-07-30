// SPDX-License-Identifier: AGPL-3.0-or-later

import type {ComboboxOption} from '@app/features/ui/components/form/FormCombobox';
import {hasDeviceLabels, type VoiceDeviceState} from '@app/features/voice/utils/VoiceDeviceManager';
import {formatVoiceAudioDeviceLabel} from '@app/features/voice/utils/VoiceMessageDescriptors';
import type {I18n} from '@lingui/core';
import {msg} from '@lingui/core/macro';

export type SettingsDeviceKind = 'audioinput' | 'audiooutput' | 'videoinput';

const DEFAULT_DEVICE_DESCRIPTOR = msg({
	message: 'Default',
	comment: 'Fallback device option shown before a microphone, speaker, or camera label is available.',
});
const MICROPHONE_DEVICE_DESCRIPTOR = msg({
	message: 'Microphone',
	comment: 'Fallback microphone option label when the operating system does not report a device name.',
});
const SPEAKER_DEVICE_DESCRIPTOR = msg({
	message: 'Speaker',
	comment: 'Fallback speaker option label when the operating system does not report a device name.',
});
const CAMERA_DEVICE_DESCRIPTOR = msg({
	message: 'Camera',
	comment: 'Fallback camera option label when the operating system does not report a device name.',
});
const AUTOMATIC_CAMERA_DESCRIPTOR = msg({
	message: 'Automatic',
	comment: 'Camera option that follows the first camera currently selected by the browser or operating system.',
});
const AUTOMATIC_CAMERA_WITH_DEVICE_DESCRIPTOR = msg({
	message: 'Automatic ({deviceLabel})',
	comment: 'Automatic camera option with the camera currently selected by the browser or operating system.',
});

function devicesForKind(deviceState: VoiceDeviceState, kind: SettingsDeviceKind): Array<MediaDeviceInfo> {
	switch (kind) {
		case 'audioinput':
			return deviceState.inputDevices;
		case 'audiooutput':
			return deviceState.outputDevices;
		case 'videoinput':
			return deviceState.videoDevices;
	}
}

function buildAudioDeviceOptions(
	devices: ReadonlyArray<MediaDeviceInfo>,
	fallbackLabel: string,
	i18n: I18n,
): Array<ComboboxOption> {
	return devices.map((device) => ({
		value: device.deviceId,
		label: formatVoiceAudioDeviceLabel(i18n, device, fallbackLabel),
	}));
}

function buildVideoDeviceOptions(
	devices: ReadonlyArray<MediaDeviceInfo>,
	automaticLabel: string,
	fallbackLabel: string,
	i18n: I18n,
): Array<ComboboxOption> {
	return devices.map((device) => ({
		value: device.deviceId,
		label:
			device.deviceId === 'default'
				? device.label
					? i18n._(AUTOMATIC_CAMERA_WITH_DEVICE_DESCRIPTOR, {deviceLabel: device.label})
					: automaticLabel
				: device.label || fallbackLabel,
	}));
}

export function buildSettingsDeviceOptions(
	deviceState: VoiceDeviceState,
	kind: SettingsDeviceKind,
	i18n: I18n,
): Array<ComboboxOption> {
	const defaultLabel = i18n._(DEFAULT_DEVICE_DESCRIPTOR);
	const lockedFallback: Array<ComboboxOption> = [{value: 'default', label: defaultLabel}];
	const devices = devicesForKind(deviceState, kind);
	if (devices.length === 0) {
		return lockedFallback;
	}
	if (kind === 'videoinput') {
		return buildVideoDeviceOptions(
			devices,
			i18n._(AUTOMATIC_CAMERA_DESCRIPTOR),
			i18n._(CAMERA_DEVICE_DESCRIPTOR),
			i18n,
		);
	}
	if (!hasDeviceLabels(devices)) {
		return lockedFallback;
	}
	const fallbackLabel = i18n._(kind === 'audioinput' ? MICROPHONE_DEVICE_DESCRIPTOR : SPEAKER_DEVICE_DESCRIPTOR);
	return buildAudioDeviceOptions(devices, fallbackLabel, i18n);
}
