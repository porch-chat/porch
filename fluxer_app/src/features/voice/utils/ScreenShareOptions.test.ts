// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {
	buildScreenShareOptions,
	getScreenShareEncoding,
	resolveDeviceSourceCaptureResolution,
	resolveEffectiveScreenShareDimensions,
	resolveScreenShareFrameRate,
	resolveStreamingModeSettings,
} from './ScreenShareOptions';

describe('buildScreenShareOptions', () => {
	it('keeps capture-card source format separate from ultrawide output dimensions', () => {
		expect(
			resolveDeviceSourceCaptureResolution(
				{width: 2580, height: 1080, frameRate: 60},
				{width: 3440, height: 1440},
				59.94,
			),
		).toEqual({width: 3440, height: 1440, frameRate: 60});
	});

	it('caps capture-card source FPS at the selected outgoing FPS', () => {
		expect(
			resolveDeviceSourceCaptureResolution({width: 1720, height: 720, frameRate: 30}, {width: 3440, height: 1440}, 60),
		).toEqual({width: 3440, height: 1440, frameRate: 30});
	});

	it('asks display capture to omit the cursor for app windows', () => {
		const {captureOptions} = buildScreenShareOptions({
			resolution: 'medium',
			frameRate: 30,
			includeAudio: false,
			preferredDisplaySurface: 'window',
		});
		expect(captureOptions.video).toMatchObject({cursor: 'never'});
	});
	it('asks display capture to include the cursor for full displays', () => {
		const {captureOptions} = buildScreenShareOptions({
			resolution: 'medium',
			frameRate: 30,
			includeAudio: false,
			preferredDisplaySurface: 'monitor',
		});
		expect(captureOptions.video).toMatchObject({
			cursor: 'always',
			displaySurface: 'monitor',
		});
	});
	it('preserves the preferred app display surface while omitting the cursor', () => {
		const {captureOptions} = buildScreenShareOptions({
			resolution: 'medium',
			frameRate: 30,
			includeAudio: true,
			preferredDisplaySurface: 'window',
		});
		expect(captureOptions.video).toMatchObject({
			cursor: 'never',
			displaySurface: 'window',
		});
	});
	it('requests own-audio restriction without offering monitor system audio for app window shares', () => {
		const {captureOptions} = buildScreenShareOptions({
			resolution: 'medium',
			frameRate: 30,
			includeAudio: true,
			preferredDisplaySurface: 'window',
		});
		expect(captureOptions).toMatchObject({
			audio: true,
			restrictOwnAudio: true,
			systemAudio: 'exclude',
			windowAudio: 'window',
			monitorTypeSurfaces: 'exclude',
		});
	});
	it('does not offer system audio for full display shares', () => {
		const {captureOptions} = buildScreenShareOptions({
			resolution: 'medium',
			frameRate: 30,
			includeAudio: true,
			preferredDisplaySurface: 'monitor',
		});
		expect(captureOptions).toMatchObject({
			audio: true,
			restrictOwnAudio: true,
			systemAudio: 'exclude',
			windowAudio: 'window',
			monitorTypeSurfaces: 'include',
		});
	});
	it('excludes window and system audio hints when audio is disabled', () => {
		const {captureOptions} = buildScreenShareOptions({
			resolution: 'medium',
			frameRate: 30,
			includeAudio: false,
		});
		expect(captureOptions).toMatchObject({
			audio: false,
			systemAudio: 'exclude',
			windowAudio: 'exclude',
		});
	});
	it('prefers framerate for detail-oriented shares', () => {
		const {publishOptions} = buildScreenShareOptions({
			resolution: 'medium',
			frameRate: 30,
			includeAudio: true,
		});
		expect(publishOptions.degradationPreference).toBe('maintain-framerate');
	});
	it('prefers framerate for non-gaming high-framerate shares', () => {
		const {publishOptions} = buildScreenShareOptions({
			resolution: 'ultra',
			frameRate: 60,
			includeAudio: true,
			streamingMode: 'screenshare',
		});
		expect(publishOptions.degradationPreference).toBe('maintain-framerate');
	});
	it('prefers framerate degradation for gaming streams', () => {
		const {publishOptions} = buildScreenShareOptions({
			resolution: 'ultra',
			frameRate: 60,
			includeAudio: true,
			streamingMode: 'gaming',
		});
		expect(publishOptions.degradationPreference).toBe('maintain-framerate');
	});
	it('passes the selected content hint through capture options', () => {
		const {captureOptions} = buildScreenShareOptions({
			resolution: 'medium',
			frameRate: 30,
			includeAudio: false,
			contentHint: 'motion',
		});
		expect(captureOptions.contentHint).toBe('motion');
	});
	it('leaves screen share content hint unset by default', () => {
		const {captureOptions} = buildScreenShareOptions({
			resolution: 'medium',
			frameRate: 30,
			includeAudio: false,
		});
		expect(captureOptions.contentHint).toBeUndefined();
	});
	it('uses a caller supplied bitrate ceiling', () => {
		const {publishOptions} = buildScreenShareOptions({
			resolution: 'source',
			frameRate: 60,
			includeAudio: false,
			maxBitrateBps: 50000000,
		});
		expect(publishOptions.screenShareEncoding?.maxBitrate).toBe(50000000);
	});
	it('lets the preset ladder exceed the old 10 Mbps default cap', () => {
		const {publishOptions} = buildScreenShareOptions({
			resolution: 'ultra',
			frameRate: 60,
			includeAudio: false,
		});
		expect(publishOptions.screenShareEncoding?.maxBitrate).toBe(24000000);
	});
	it('keeps Source at the exact native ultrawide dimensions', () => {
		expect(resolveEffectiveScreenShareDimensions('source', {width: 3440, height: 1440})).toEqual({
			width: 3440,
			height: 1440,
		});
		expect(resolveEffectiveScreenShareDimensions('source', {width: 5120, height: 1440})).toEqual({
			width: 5120,
			height: 1440,
		});
	});
	it('uses resolution presets as height ceilings while preserving source aspect ratio', () => {
		expect(resolveEffectiveScreenShareDimensions('ultra', {width: 3440, height: 1440})).toEqual({
			width: 3440,
			height: 1440,
		});
		expect(resolveEffectiveScreenShareDimensions('high', {width: 3440, height: 1440})).toEqual({
			width: 2580,
			height: 1080,
		});
		expect(resolveEffectiveScreenShareDimensions('medium', {width: 5120, height: 1440})).toEqual({
			width: 2560,
			height: 720,
		});
	});
	it('never upscales a source below the selected height ceiling', () => {
		expect(resolveEffectiveScreenShareDimensions('uhd', {width: 1920, height: 1080})).toEqual({
			width: 1920,
			height: 1080,
		});
	});
	it('caps every requested frame rate at the supported 60 FPS ceiling', () => {
		expect(resolveScreenShareFrameRate(15)).toBe(15);
		expect(resolveScreenShareFrameRate(30)).toBe(30);
		expect(resolveScreenShareFrameRate(60)).toBe(60);
		expect(resolveScreenShareFrameRate(120)).toBe(60);
	});
	it('allocates additional bitrate to an ultrawide frame at the same height', () => {
		const standard = getScreenShareEncoding('high', 60, undefined, {width: 1920, height: 1080});
		const ultrawide = getScreenShareEncoding('high', 60, undefined, {width: 2580, height: 1080});
		expect(ultrawide.maxBitrate).toBeGreaterThan(standard.maxBitrate ?? 0);
	});
	it('builds the 4K option at 3840 by 2160', () => {
		const {captureOptions} = buildScreenShareOptions({
			resolution: 'uhd',
			frameRate: 60,
			includeAudio: false,
		});
		expect(captureOptions.resolution).toEqual({width: 3840, height: 2160, frameRate: 60});
	});
	it('defaults the high-tier gaming preset to 60 fps', () => {
		expect(resolveStreamingModeSettings('gaming', 'medium', 30, true)).toEqual({
			resolution: 'ultra',
			frameRate: 60,
		});
	});
	it('keeps free-tier gaming capped at 30 fps', () => {
		expect(resolveStreamingModeSettings('gaming', 'medium', 30, false)).toEqual({
			resolution: 'medium',
			frameRate: 30,
		});
	});
});
