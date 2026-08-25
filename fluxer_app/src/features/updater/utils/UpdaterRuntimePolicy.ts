// SPDX-License-Identifier: AGPL-3.0-or-later

import type {UpdaterEvent} from '@app/features/platform/types/Electron';
import type {UpdaterEvent as NativeUpdaterEvent} from '@app/types/electron.d';

const WEB_UPDATE_HOSTS = new Set(['app.porch.chat', 'canary.porch.chat', 'web.fluxer.app', 'web.canary.fluxer.app']);

export function isWebUpdateHost(hostname: string): boolean {
	return WEB_UPDATE_HOSTS.has(hostname.trim().toLowerCase().replace(/\.$/, ''));
}

function normalizeUpdaterContext(context: NativeUpdaterEvent['context']): UpdaterEvent['context'] {
	switch (context) {
		case 'user':
		case 'background':
		case 'focus':
			return context;
		default:
			return 'background';
	}
}

export function normalizeUpdaterEvent(event: NativeUpdaterEvent): UpdaterEvent | null {
	const context = normalizeUpdaterContext(event.context);
	switch (event.type) {
		case 'checking':
			return {type: 'checking', context};
		case 'available':
			return {
				type: 'available',
				context,
				version: event.version ?? null,
				downloadSize: event.downloadSize ?? null,
				downloadStarted: event.downloadStarted ?? true,
				downloadUrl: event.downloadUrl,
				downloadOptions: event.downloadOptions,
			};
		case 'not-available':
			return {type: 'not-available', context};
		case 'downloaded':
			return {type: 'downloaded', context, version: event.version ?? null};
		case 'progress':
			if (
				typeof event.percent !== 'number' ||
				typeof event.transferred !== 'number' ||
				typeof event.total !== 'number' ||
				typeof event.bytesPerSecond !== 'number'
			) {
				return null;
			}
			return {
				type: 'progress',
				context,
				percent: event.percent,
				transferred: event.transferred,
				total: event.total,
				bytesPerSecond: event.bytesPerSecond,
			};
		case 'error':
			return {
				type: 'error',
				context,
				message: event.message ?? 'Unknown updater error',
				phase: event.phase,
			};
		case 'unsupported':
			if (event.reason !== 'platform' && event.reason !== 'unpackaged' && event.reason !== 'managed-package') {
				return null;
			}
			return {
				type: 'unsupported',
				context,
				reason: event.reason,
				downloadUrl: event.downloadUrl,
			};
	}
}
