// SPDX-License-Identifier: AGPL-3.0-or-later

import type {AccountPresenceIntent} from '@app/features/auth/state/AccountStorage';

export interface LocalPresenceBridgeTarget {
	captureIntent(): AccountPresenceIntent | null;
	restoreIntent(intent: AccountPresenceIntent | null | undefined): void;
}

let target: LocalPresenceBridgeTarget | null = null;
let pendingRestore: AccountPresenceIntent | null | undefined;

export function registerLocalPresenceBridgeTarget(nextTarget: LocalPresenceBridgeTarget): void {
	target = nextTarget;
	if (pendingRestore !== undefined) {
		target.restoreIntent(pendingRestore);
		pendingRestore = undefined;
	}
}

export function captureLocalPresenceIntent(): AccountPresenceIntent | null {
	return target?.captureIntent() ?? null;
}

export function restoreLocalPresenceIntent(intent: AccountPresenceIntent | null | undefined): void {
	if (target) {
		target.restoreIntent(intent);
		return;
	}
	pendingRestore = intent ?? null;
}
