// SPDX-License-Identifier: AGPL-3.0-or-later

import {
	AMD_RDNA3_PLUS,
	type HardwareEncodeReport,
	NVIDIA_AV1_FAMILIES,
	PCI_VENDOR_AMD,
	PCI_VENDOR_NVIDIA,
	reconcileHardwareEncodeReport,
} from '@app/features/voice/utils/GpuEncoderCapabilities';
import {describe, expect, test} from 'vitest';

function reportFor(rule: typeof AMD_RDNA3_PLUS | typeof NVIDIA_AV1_FAMILIES): HardwareEncodeReport {
	return {...rule.caps, gpuFamily: rule.family};
}

describe('reconcileHardwareEncodeReport', () => {
	test('downgrades a statically capable Windows codec when the WebRTC probe reports software', () => {
		const report = reconcileHardwareEncodeReport(
			reportFor(AMD_RDNA3_PLUS),
			{av1: 'software', h265: 'hardware', h264: 'hardware', vp9: 'software', vp8: 'software'},
			'windows',
			PCI_VENDOR_AMD,
		);

		expect(report.av1).toBe('software');
		expect(report.h265).toBe('hardware');
		expect(report.h264).toBe('hardware');
	});

	test('keeps static Windows capability when the WebRTC probe is unavailable', () => {
		const report = reconcileHardwareEncodeReport(reportFor(AMD_RDNA3_PLUS), null, 'windows', PCI_VENDOR_AMD);

		expect(report.av1).toBe('hardware');
	});

	test('requires a positive WebRTC probe for Linux NVIDIA hardware encoding', () => {
		const report = reconcileHardwareEncodeReport(
			reportFor(NVIDIA_AV1_FAMILIES),
			{av1: 'unknown', h265: 'hardware', h264: 'software', vp9: 'unknown', vp8: 'unknown'},
			'linux',
			PCI_VENDOR_NVIDIA,
		);

		expect(report.av1).toBe('software');
		expect(report.h265).toBe('hardware');
		expect(report.h264).toBe('software');
	});
});
