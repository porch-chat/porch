// SPDX-License-Identifier: AGPL-3.0-or-later

interface ResolveBrowserHandoffWebAppUrlOptions {
	canSwitchInstanceUrl: boolean;
	currentOrigin: string;
	runtimeWebAppBaseUrl: string;
	targetWebAppUrl?: string;
}

export function resolveBrowserHandoffWebAppUrl({
	canSwitchInstanceUrl,
	currentOrigin,
	runtimeWebAppBaseUrl,
	targetWebAppUrl,
}: ResolveBrowserHandoffWebAppUrlOptions): string {
	if (targetWebAppUrl) return targetWebAppUrl;
	return canSwitchInstanceUrl ? currentOrigin : runtimeWebAppBaseUrl;
}
