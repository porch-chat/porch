// SPDX-License-Identifier: AGPL-3.0-or-later

import {ME} from '@fluxer/constants/src/AppConstants';

export interface ChannelNavigationTarget {
	guildId: string | null;
	channelId: string;
	messageId: string | null;
}

export type ChannelNavigationInterceptor = (target: ChannelNavigationTarget) => boolean;

let authenticatedInterceptor: ChannelNavigationInterceptor | null = null;

export function setAuthenticatedChannelNavigationInterceptor(interceptor: ChannelNavigationInterceptor): void {
	authenticatedInterceptor = interceptor;
}

export function parseChannelNavigationPath(path: string): ChannelNavigationTarget | null {
	let url: URL;
	try {
		url = new URL(path, window.location.origin);
	} catch {
		return null;
	}
	const segments = url.pathname.split('/').filter(Boolean);
	if (segments[0] !== 'channels') {
		return null;
	}
	const [, guildId, channelId, messageId] = segments;
	if (!guildId || !channelId) {
		return null;
	}
	if (guildId === ME && segments.length > 4) {
		return null;
	}
	if (guildId !== ME && segments.length > 4) {
		return null;
	}
	return {
		guildId,
		channelId,
		messageId: messageId ?? null,
	};
}

export function tryInterceptChannelNavigationPath(path: string): boolean {
	const target = parseChannelNavigationPath(path);
	return target ? (authenticatedInterceptor?.(target) ?? false) : false;
}
