// SPDX-License-Identifier: AGPL-3.0-or-later

import {getElectronAPI} from '@app/features/ui/utils/NativeUtils';
import {useStatsForNerds} from '@app/features/voice/components/useStatsForNerds';
import {
	isBrowserVoiceDebugEventSinkPopoutOpen,
	setBrowserVoiceDebugEventSinkStatsHtml,
} from '@app/features/voice/diagnostics/VoiceDebugBrowserEventSinkPopout';
import type {StatsForNerdsData} from '@app/features/voice/utils/VoiceStatsForNerdsPresenter';
import {useEffect, useRef, useState} from 'react';

const VOICE_DEBUG_STATS_FORWARD_INTERVAL_MS = 2000;
const VOICE_DEBUG_POPOUT_STATE_POLL_INTERVAL_MS = 1000;

let activeForwarderCount = 0;

function getGeneratedAtIso(): string {
	return new Date().toISOString();
}

async function publishStatsHtml(data: StatsForNerdsData): Promise<void> {
	const {renderVoiceDebugStatsHtml} = await import('@app/features/voice/diagnostics/VoiceDebugStatsHtml');
	const electron = getElectronAPI();
	const html = renderVoiceDebugStatsHtml(data, getGeneratedAtIso());
	electron?.setVoiceDebugEventSinkStatsHtml?.(html);
	setBrowserVoiceDebugEventSinkStatsHtml(html);
}

async function publishUnavailableStatsHtml(): Promise<void> {
	const {renderVoiceDebugStatsUnavailableHtml} = await import('@app/features/voice/diagnostics/VoiceDebugStatsHtml');
	const electron = getElectronAPI();
	const html = renderVoiceDebugStatsUnavailableHtml(
		'No active voice call stats snapshot is available.',
		getGeneratedAtIso(),
	);
	electron?.setVoiceDebugEventSinkStatsHtml?.(html);
	setBrowserVoiceDebugEventSinkStatsHtml(html);
}

function useVoiceDebugEventSinkPopoutOpen(): boolean {
	const [isOpen, setIsOpen] = useState(() => isBrowserVoiceDebugEventSinkPopoutOpen());
	useEffect(() => {
		let disposed = false;
		const refresh = async () => {
			const electron = getElectronAPI();
			const desktopOpen = (await electron?.isVoiceDebugEventSinkPopoutOpen?.().catch(() => false)) ?? false;
			if (disposed) return;
			const nextOpen = desktopOpen || isBrowserVoiceDebugEventSinkPopoutOpen();
			setIsOpen((current) => (current === nextOpen ? current : nextOpen));
		};
		void refresh();
		const intervalId = window.setInterval(() => void refresh(), VOICE_DEBUG_POPOUT_STATE_POLL_INTERVAL_MS);
		return () => {
			disposed = true;
			window.clearInterval(intervalId);
		};
	}, []);
	return isOpen;
}

export function VoiceDebugStatsForwarder(): null {
	const enabled = useVoiceDebugEventSinkPopoutOpen();
	const data = useStatsForNerds({enabled});
	const dataRef = useRef(data);
	dataRef.current = data;
	useEffect(() => {
		if (!enabled) return;
		activeForwarderCount += 1;
		void publishStatsHtml(dataRef.current);
		const intervalId = window.setInterval(() => {
			void publishStatsHtml(dataRef.current);
		}, VOICE_DEBUG_STATS_FORWARD_INTERVAL_MS);
		return () => {
			window.clearInterval(intervalId);
			activeForwarderCount -= 1;
			if (activeForwarderCount === 0) {
				void publishUnavailableStatsHtml();
			}
		};
	}, [enabled]);
	return null;
}
