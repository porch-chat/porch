// SPDX-License-Identifier: AGPL-3.0-or-later

export function shouldForceRelayIce(isElectron: boolean, isSelfHosted: boolean): boolean {
	return isElectron && !isSelfHosted;
}
