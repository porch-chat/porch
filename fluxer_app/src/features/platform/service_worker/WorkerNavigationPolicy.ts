// SPDX-License-Identifier: AGPL-3.0-or-later

// Runtime discovery, CSP, and API routing live in the HTML shell and can change
// independently of the hashed app bundle. Prefer a fresh shell on real mobile
// networks before falling back to the offline cache so an old deployment
// contract cannot strand an authenticated client on the splash screen.
export const NAVIGATION_NETWORK_TIMEOUT_MS = 5000;

export function createNavigationNetworkRequest(request: Request): Request {
	return new Request(request, {cache: 'reload'});
}
