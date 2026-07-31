// SPDX-License-Identifier: AGPL-3.0-or-later

import type {GatewaySessionRetirementReason} from '@app/features/gateway/transport/GatewaySessionRetirement';

interface AuthenticatedSessionRuntimeTarget {
	closeLayers: () => void;
	clearSudoToken: () => void;
	sendInvisiblePresence: (reason: GatewaySessionRetirementReason) => void;
	cleanupGatewaySession: () => void;
}

let target: AuthenticatedSessionRuntimeTarget | null = null;

export function registerAuthenticatedSessionRuntimeTarget(nextTarget: AuthenticatedSessionRuntimeTarget): void {
	target = nextTarget;
}

export function closeAuthenticatedLayers(): void {
	target?.closeLayers();
}

export function clearAuthenticatedSudoToken(): void {
	target?.clearSudoToken();
}

export function sendAuthenticatedInvisiblePresence(reason: GatewaySessionRetirementReason): void {
	target?.sendInvisiblePresence(reason);
}

export function cleanupAuthenticatedGatewaySession(): void {
	target?.cleanupGatewaySession();
}
