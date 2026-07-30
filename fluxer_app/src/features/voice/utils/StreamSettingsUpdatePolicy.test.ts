// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {
	buildActiveDeviceScreenShareReplacement,
	isLinuxDesktopAudioShare,
	resolveActiveStreamSettingsShareContext,
	shouldReconfigureLinuxAudioForActiveStreamSettings,
} from './StreamSettingsUpdatePolicy';

describe('StreamSettingsUpdatePolicy', () => {
	it('classifies active app, capture-card, and display sources for live settings', () => {
		const deviceSource = {
			kind: 'device' as const,
			sourceId: 'elgato-4k-x',
			title: 'Elgato 4K X',
			updatedAt: 1,
			sourceWidth: 3440,
			sourceHeight: 1440,
			sourceFrameRate: 60,
		};
		expect(resolveActiveStreamSettingsShareContext('window:42:0', null)).toBe('app');
		expect(resolveActiveStreamSettingsShareContext('elgato-4k-x', deviceSource)).toBe('device');
		expect(resolveActiveStreamSettingsShareContext('screen:1:0', deviceSource)).toBe('display');
		expect(resolveActiveStreamSettingsShareContext('another-device', deviceSource)).toBe('display');
		expect(resolveActiveStreamSettingsShareContext(null, deviceSource)).toBe('display');
	});

	it('recognizes Linux app and display streams as desktop-audio shares', () => {
		expect(isLinuxDesktopAudioShare({platform: 'linux', shareContext: 'display'})).toBe(true);
		expect(isLinuxDesktopAudioShare({platform: 'linux', shareContext: 'app'})).toBe(true);
		expect(isLinuxDesktopAudioShare({platform: 'linux', shareContext: 'device'})).toBe(false);
		expect(isLinuxDesktopAudioShare({platform: 'win32', shareContext: 'display'})).toBe(false);
	});
	it('does not reconfigure Linux audio for video-only stream settings', () => {
		expect(
			shouldReconfigureLinuxAudioForActiveStreamSettings({
				platform: 'linux',
				shareContext: 'display',
				audioSettingsChanged: false,
			}),
		).toBe(false);
	});
	it('reconfigures Linux audio only when an audio setting changed', () => {
		expect(
			shouldReconfigureLinuxAudioForActiveStreamSettings({
				platform: 'linux',
				shareContext: 'display',
				audioSettingsChanged: true,
			}),
		).toBe(true);
		expect(
			shouldReconfigureLinuxAudioForActiveStreamSettings({
				platform: 'linux',
				shareContext: 'device',
				audioSettingsChanged: true,
			}),
		).toBe(false);
	});

	it('restarts an active ultrawide device share with separate source and output dimensions', () => {
		expect(
			buildActiveDeviceScreenShareReplacement({
				videoDeviceId: 'elgato-4k-x',
				sourceDimensions: {width: 3440, height: 1440},
				lastSource: {
					kind: 'device',
					sourceId: 'elgato-4k-x',
					title: 'Elgato 4K X',
					updatedAt: 1,
					sourceWidth: 3440,
					sourceHeight: 1440,
					sourceFrameRate: 60,
				},
				outputResolution: {width: 2580, height: 1080, frameRate: 60},
				includeAudio: false,
				audioDeviceId: 'default',
			}),
		).toEqual({
			videoDeviceId: 'elgato-4k-x',
			sourceResolution: {width: 3440, height: 1440, frameRate: 60},
			resolution: {width: 2580, height: 1080, frameRate: 60},
		});
	});

	it('uses native output dimensions for Source and preserves selected device audio', () => {
		expect(
			buildActiveDeviceScreenShareReplacement({
				videoDeviceId: 'elgato-4k-x',
				sourceDimensions: {width: 3440, height: 1440},
				lastSource: {
					kind: 'device',
					sourceId: 'elgato-4k-x',
					title: 'Elgato 4K X',
					updatedAt: 1,
					sourceFrameRate: 60,
				},
				outputResolution: {width: 3440, height: 1440, frameRate: 60},
				includeAudio: true,
				audioDeviceId: 'capture-card-audio',
			}),
		).toEqual({
			videoDeviceId: 'elgato-4k-x',
			audioDeviceId: 'capture-card-audio',
			sourceResolution: {width: 3440, height: 1440, frameRate: 60},
			resolution: {width: 3440, height: 1440, frameRate: 60},
		});
	});

	it('refuses a device-share restart when the active source is unavailable', () => {
		expect(
			buildActiveDeviceScreenShareReplacement({
				videoDeviceId: null,
				sourceDimensions: {width: 3440, height: 1440},
				lastSource: null,
				outputResolution: {width: 3440, height: 1440, frameRate: 60},
				includeAudio: false,
				audioDeviceId: 'default',
			}),
		).toBeNull();
	});
});
