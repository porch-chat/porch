// SPDX-License-Identifier: AGPL-3.0-or-later

export interface RuntimeInstanceIdentitySnapshot {
	apiEndpoint: string;
	apiPublicEndpoint: string;
}

function parseEndpoint(snapshot: RuntimeInstanceIdentitySnapshot): URL | null {
	const endpoint = snapshot.apiEndpoint.trim();
	if (!endpoint) {
		return null;
	}
	try {
		return new URL(endpoint);
	} catch {
		try {
			return new URL(endpoint, snapshot.apiPublicEndpoint.trim());
		} catch {
			return null;
		}
	}
}

export function runtimeInstanceKey(snapshot: RuntimeInstanceIdentitySnapshot): string | null {
	const url = parseEndpoint(snapshot);
	if (
		url == null ||
		(url.protocol !== 'https:' && url.protocol !== 'http:') ||
		url.username ||
		url.password ||
		url.search ||
		url.hash
	) {
		return null;
	}
	const path = url.pathname.replace(/\/+$/u, '');
	return `${url.origin.toLowerCase()}${path}`;
}

export function runtimeConfigSnapshotsAreSameInstance(
	left: RuntimeInstanceIdentitySnapshot | undefined,
	right: RuntimeInstanceIdentitySnapshot,
): boolean {
	if (!left) {
		return false;
	}
	const leftKey = runtimeInstanceKey(left);
	const rightKey = runtimeInstanceKey(right);
	return leftKey !== null && leftKey === rightKey;
}
