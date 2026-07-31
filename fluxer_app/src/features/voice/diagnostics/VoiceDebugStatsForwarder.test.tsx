// SPDX-License-Identifier: AGPL-3.0-or-later
// @vitest-environment happy-dom

import {act} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

(globalThis as {IS_REACT_ACT_ENVIRONMENT?: boolean}).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
	browserOpen: false,
	desktopOpen: false,
	forwardedHtml: vi.fn(),
	renderStats: vi.fn(() => '<section>stats</section>'),
	renderUnavailable: vi.fn(() => '<section>unavailable</section>'),
	statsEnabled: [] as Array<boolean>,
}));

vi.mock('@app/features/ui/utils/NativeUtils', () => ({
	getElectronAPI: () => ({
		isVoiceDebugEventSinkPopoutOpen: async () => mocks.desktopOpen,
		setVoiceDebugEventSinkStatsHtml: mocks.forwardedHtml,
	}),
}));

vi.mock('@app/features/voice/components/useStatsForNerds', () => ({
	useStatsForNerds: ({enabled}: {enabled: boolean}) => {
		mocks.statsEnabled.push(enabled);
		return {enabled};
	},
}));

vi.mock('@app/features/voice/diagnostics/VoiceDebugBrowserEventSinkPopout', () => ({
	isBrowserVoiceDebugEventSinkPopoutOpen: () => mocks.browserOpen,
	setBrowserVoiceDebugEventSinkStatsHtml: vi.fn(),
}));

vi.mock('@app/features/voice/diagnostics/VoiceDebugStatsHtml', () => ({
	renderVoiceDebugStatsHtml: mocks.renderStats,
	renderVoiceDebugStatsUnavailableHtml: mocks.renderUnavailable,
}));

import {VoiceDebugStatsForwarder} from '@app/features/voice/diagnostics/VoiceDebugStatsForwarder';

describe('VoiceDebugStatsForwarder', () => {
	let container: HTMLDivElement;
	let root: Root;

	beforeEach(() => {
		vi.useFakeTimers();
		mocks.browserOpen = false;
		mocks.desktopOpen = false;
		mocks.forwardedHtml.mockClear();
		mocks.renderStats.mockClear();
		mocks.renderUnavailable.mockClear();
		mocks.statsEnabled.length = 0;
		container = document.createElement('div');
		document.body.appendChild(container);
		root = createRoot(container);
	});

	afterEach(() => {
		act(() => root.unmount());
		container.remove();
		vi.useRealTimers();
	});

	it('keeps expensive stats rendering dormant while the diagnostics popout is closed', async () => {
		await act(async () => {
			root.render(<VoiceDebugStatsForwarder />);
			await Promise.resolve();
		});

		await act(async () => vi.advanceTimersByTimeAsync(4000));
		expect(mocks.statsEnabled.at(-1)).toBe(false);
		expect(mocks.renderStats).not.toHaveBeenCalled();
	});

	it('starts stats rendering when the diagnostics popout is open', async () => {
		mocks.browserOpen = true;
		act(() => {
			root.render(<VoiceDebugStatsForwarder />);
		});
		await act(async () => {
			await vi.dynamicImportSettled();
		});
		expect(mocks.statsEnabled.at(-1)).toBe(true);
		expect(mocks.renderStats).toHaveBeenCalledTimes(1);
		expect(mocks.forwardedHtml).toHaveBeenCalledWith('<section>stats</section>');
	});
});
