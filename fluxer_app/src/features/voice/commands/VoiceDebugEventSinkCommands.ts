// SPDX-License-Identifier: AGPL-3.0-or-later

import {getElectronAPI} from '@app/features/ui/utils/NativeUtils';
import {
	canOpenBrowserVoiceDebugEventSinkPopout,
	setBrowserVoiceDebugEventSinkStatsHtml,
} from '@app/features/voice/diagnostics/VoiceDebugBrowserEventSinkPopout';
import voiceEngineV2AppDebugLoggingHostAdapter from '@app/features/voice/engine/v2/VoiceEngineV2AppDebugLoggingHostAdapter';
import {collectStatsForNerdsSnapshot} from '@app/features/voice/utils/StatsForNerdsCopy';

export function canOpenVoiceDebugEventSinkPopout(): boolean {
	return Boolean(getElectronAPI()?.openVoiceDebugEventSinkPopout) || canOpenBrowserVoiceDebugEventSinkPopout();
}

function getGeneratedAtIso(): string {
	return new Date().toISOString();
}

function describeStatsSnapshotError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

async function publishOpeningStatsSnapshot(): Promise<void> {
	const electron = getElectronAPI();
	if (!electron?.setVoiceDebugEventSinkStatsHtml && !canOpenBrowserVoiceDebugEventSinkPopout()) return;
	const {renderVoiceDebugStatsHtml, renderVoiceDebugStatsUnavailableHtml} = await import(
		'@app/features/voice/diagnostics/VoiceDebugStatsHtml'
	);
	const generatedAtIso = getGeneratedAtIso();
	let html: string;
	try {
		html = renderVoiceDebugStatsHtml(collectStatsForNerdsSnapshot(), generatedAtIso);
	} catch (error) {
		html = renderVoiceDebugStatsUnavailableHtml(
			`Failed to collect stats snapshot before opening event sink: ${describeStatsSnapshotError(error)}`,
			generatedAtIso,
		);
	}
	electron?.setVoiceDebugEventSinkStatsHtml?.(html);
	setBrowserVoiceDebugEventSinkStatsHtml(html);
}

export async function openVoiceDebugEventSinkPopout(): Promise<void> {
	await publishOpeningStatsSnapshot();
	await voiceEngineV2AppDebugLoggingHostAdapter.openEventSinkPopout();
}
