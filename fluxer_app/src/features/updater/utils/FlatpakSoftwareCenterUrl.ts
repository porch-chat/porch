// SPDX-License-Identifier: AGPL-3.0-or-later

const FLATPAK_APP_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,254}$/;

export function resolveManagedPackageUpdateUrl(flatpakAppId: string | null | undefined, fallbackUrl: string): string {
	const normalizedAppId = flatpakAppId?.trim();
	if (!normalizedAppId || !FLATPAK_APP_ID_PATTERN.test(normalizedAppId)) {
		return fallbackUrl;
	}
	return `appstream://${normalizedAppId}`;
}
