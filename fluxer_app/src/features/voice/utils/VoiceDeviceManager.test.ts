// SPDX-License-Identifier: AGPL-3.0-or-later
// @vitest-environment happy-dom

import {describe, expect, it} from 'vitest';
import {
	getVoiceAudioDeviceMetadata,
	resolveEffectiveDeviceId,
	resolveEffectiveDeviceRouteKey,
	shapeBrowserAudioDevices,
	shapeVideoDevices,
} from './VoiceDeviceManager';

function mediaDevice(kind: MediaDeviceKind, deviceId: string, label: string, groupId = ''): MediaDeviceInfo {
	return {
		kind,
		deviceId,
		label,
		groupId,
		toJSON: () => ({kind, deviceId, label, groupId}),
	} as MediaDeviceInfo;
}

describe('VoiceDeviceManager device routing', () => {
	it('preserves dynamic default and communications audio routes', () => {
		const devices = shapeBrowserAudioDevices([
			mediaDevice('audiooutput', 'default', 'Default - System (BEACN Studio)', 'system-group'),
			mediaDevice('audiooutput', 'communications', 'Communications - Chat (BEACN Studio)', 'chat-group'),
			mediaDevice('audiooutput', 'system-endpoint', 'System (BEACN Studio)', 'system-group'),
			mediaDevice('audiooutput', 'chat-endpoint', 'Chat (BEACN Studio)', 'chat-group'),
		]);

		expect(devices.map((device) => device.deviceId)).toEqual([
			'default',
			'communications',
			'chat-endpoint',
			'system-endpoint',
		]);
		expect(getVoiceAudioDeviceMetadata(devices[0]!)).toMatchObject({
			role: 'default',
			endpointLabel: 'System (BEACN Studio)',
		});
		expect(getVoiceAudioDeviceMetadata(devices[1]!)).toMatchObject({
			role: 'communications',
			endpointLabel: 'Chat (BEACN Studio)',
		});
	});

	it('changes the route key when a dynamic audio route moves without changing the stored selection', () => {
		const before = shapeBrowserAudioDevices([
			mediaDevice('audioinput', 'default', 'Default - Voice Chat Mic (BEACN Studio)', 'beacn-group'),
		]);
		const after = shapeBrowserAudioDevices([
			mediaDevice('audioinput', 'default', 'Default - Microphone (Anker PowerConf C200)', 'anker-group'),
		]);

		expect(resolveEffectiveDeviceId('default', before)).toBe('default');
		expect(resolveEffectiveDeviceId('default', after)).toBe('default');
		expect(resolveEffectiveDeviceRouteKey('default', before)).not.toBe(
			resolveEffectiveDeviceRouteKey('default', after),
		);
	});

	it('models automatic camera selection separately from physical camera ids', () => {
		const before = shapeVideoDevices([
			mediaDevice('videoinput', 'anker', 'Anker PowerConf C200', 'anker-group'),
			mediaDevice('videoinput', 'elgato', 'Elgato 4K X', 'elgato-group'),
		]);
		const after = shapeVideoDevices([mediaDevice('videoinput', 'elgato', 'Elgato 4K X', 'elgato-group')]);

		expect(before[0]).toMatchObject({deviceId: 'default', label: 'Anker PowerConf C200'});
		expect(after[0]).toMatchObject({deviceId: 'default', label: 'Elgato 4K X'});
		expect(resolveEffectiveDeviceRouteKey('default', before)).not.toBe(
			resolveEffectiveDeviceRouteKey('default', after),
		);
		expect(resolveEffectiveDeviceRouteKey('elgato', before)).toBe('endpoint:elgato');
	});

	it('falls back deterministically when a persisted endpoint disappears', () => {
		const devices = shapeVideoDevices([mediaDevice('videoinput', 'camera-a', 'Camera A', 'camera-a-group')]);

		expect(resolveEffectiveDeviceId('missing-camera', devices)).toBe('default');
		expect(resolveEffectiveDeviceRouteKey('missing-camera', devices)).toContain('Camera A');
	});
});
