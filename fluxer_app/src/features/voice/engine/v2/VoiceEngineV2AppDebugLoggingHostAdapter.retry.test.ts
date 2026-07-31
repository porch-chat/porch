// SPDX-License-Identifier: AGPL-3.0-or-later

import {HttpError} from '@app/features/platform/types/EndpointError';
import {
	getVoiceDebugUploadRetryDelayMs,
	isRetryableVoiceDebugUploadError,
} from '@app/features/voice/engine/v2/VoiceEngineV2AppDebugLoggingHostAdapter';
import {describe, expect, it} from 'vitest';

function httpError(status: number): HttpError {
	return new HttpError({method: 'POST', path: '/channels/12345/voice-debug-logging/events', status});
}

describe('voice debug upload retry policy', () => {
	it('retries network, server, timeout, and rate-limit failures', () => {
		expect(isRetryableVoiceDebugUploadError(new TypeError('network unavailable'))).toBe(true);
		expect(isRetryableVoiceDebugUploadError(httpError(500))).toBe(true);
		expect(isRetryableVoiceDebugUploadError(httpError(408))).toBe(true);
		expect(isRetryableVoiceDebugUploadError(httpError(425))).toBe(true);
		expect(isRetryableVoiceDebugUploadError(httpError(429))).toBe(true);
	});

	it('does not retain payloads rejected by other client-error responses', () => {
		expect(isRetryableVoiceDebugUploadError(httpError(400))).toBe(false);
		expect(isRetryableVoiceDebugUploadError(httpError(401))).toBe(false);
		expect(isRetryableVoiceDebugUploadError(httpError(403))).toBe(false);
		expect(isRetryableVoiceDebugUploadError(httpError(404))).toBe(false);
	});

	it('backs off exponentially and caps retries at one minute', () => {
		expect(getVoiceDebugUploadRetryDelayMs(1, 2000)).toBe(2000);
		expect(getVoiceDebugUploadRetryDelayMs(2, 2000)).toBe(4000);
		expect(getVoiceDebugUploadRetryDelayMs(5, 5000)).toBe(60_000);
		expect(getVoiceDebugUploadRetryDelayMs(20, 2000)).toBe(60_000);
	});
});
