// SPDX-License-Identifier: AGPL-3.0-or-later

export interface DeepLinkRegistrationContext {
	readonly portable: boolean;
}

export function shouldRegisterDeepLinkProtocol(context: DeepLinkRegistrationContext): boolean {
	return !context.portable;
}
