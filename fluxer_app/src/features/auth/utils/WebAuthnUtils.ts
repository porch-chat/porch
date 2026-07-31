// SPDX-License-Identifier: AGPL-3.0-or-later

import {promptForSecurityKeyPin} from '@app/features/auth/components/modals/PasskeyPinModal';
import {parsePasskeyPinFailure} from '@app/features/auth/utils/PasskeyPinErrors';
import {Platform} from '@app/features/platform/types/Platform';
import {getElectronAPI} from '@app/features/ui/utils/NativeUtils';
import type {
	AuthenticationResponseJSON,
	PublicKeyCredentialCreationOptionsJSON,
	PublicKeyCredentialRequestOptionsJSON,
	RegistrationResponseJSON,
} from '@simplewebauthn/browser';

async function loadWebAuthn() {
	return import('@simplewebauthn/browser');
}

async function runNativeCeremonyWithPinSupport<T>(run: (requestContext?: {pin?: string}) => Promise<T>): Promise<T> {
	try {
		return await run();
	} catch (error) {
		if (parsePasskeyPinFailure(error)?.kind !== 'required') {
			throw error;
		}
	}
	return promptForSecurityKeyPin((pin) => run({pin}));
}

export async function assertWebAuthnSupported(): Promise<void> {
	const {browserSupportsWebAuthn} = await loadWebAuthn();
	if (Platform.isElectron) {
		const electronApi = getElectronAPI();
		const nativeSupported = electronApi && (await electronApi.passkeyIsSupported?.());
		if (nativeSupported) {
			return;
		}
		if (browserSupportsWebAuthn()) {
			return;
		}
		throw new Error('WebAuthn is not supported in this environment.');
	}
	if (!browserSupportsWebAuthn()) {
		throw new Error('WebAuthn is not supported in this environment.');
	}
}

export async function performRegistration(
	options: PublicKeyCredentialCreationOptionsJSON,
): Promise<RegistrationResponseJSON> {
	await assertWebAuthnSupported();
	if (Platform.isElectron) {
		const electronApi = getElectronAPI();
		const nativeSupported = electronApi && (await electronApi.passkeyIsSupported?.());
		const passkeyRegister = electronApi?.passkeyRegister;
		if (nativeSupported && passkeyRegister) {
			return runNativeCeremonyWithPinSupport((requestContext) => passkeyRegister(options, requestContext));
		}
	}
	const {startRegistration} = await loadWebAuthn();
	return await startRegistration({optionsJSON: options});
}

export async function performAuthentication(
	options: PublicKeyCredentialRequestOptionsJSON,
): Promise<AuthenticationResponseJSON> {
	await assertWebAuthnSupported();
	if (Platform.isElectron) {
		const electronApi = getElectronAPI();
		const nativeSupported = electronApi && (await electronApi.passkeyIsSupported?.());
		const passkeyAuthenticate = electronApi?.passkeyAuthenticate;
		if (nativeSupported && passkeyAuthenticate) {
			return runNativeCeremonyWithPinSupport((requestContext) => passkeyAuthenticate(options, requestContext));
		}
	}
	const {startAuthentication} = await loadWebAuthn();
	return await startAuthentication({optionsJSON: options});
}
