// SPDX-License-Identifier: AGPL-3.0-or-later

export function isLocalMediaControlActive(
	localStateEnabled: boolean,
	participantStateEnabled: boolean | null | undefined,
): boolean {
	return localStateEnabled || participantStateEnabled === true;
}
