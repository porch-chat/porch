// SPDX-License-Identifier: AGPL-3.0-or-later

import type {VoiceEngine} from '@app/features/voice/engine/native_voice_engine/VoiceEngine';
import type {
	VoiceMediaGraphRemoteSubscriptionCommand,
	VoiceMediaGraphRemoteTrackSubscriptionController,
} from '@app/features/voice/engine/VoiceMediaGraph';

type NativeSubscriptionAppliedHandler = (options: VoiceMediaGraphRemoteSubscriptionCommand) => void;
type NativeSubscriptionFailedHandler = (options: VoiceMediaGraphRemoteSubscriptionCommand, error: unknown) => void;

function nativeSubscriptionTargetKey(options: VoiceMediaGraphRemoteSubscriptionCommand): string {
	return `${options.participantIdentity}\u0000${options.source}`;
}

export function createSerializedNativeSubscriptionController(
	engine: Pick<VoiceEngine, 'setRemoteTrackSubscription'>,
	onApplied: NativeSubscriptionAppliedHandler,
	onFailed: NativeSubscriptionFailedHandler,
): VoiceMediaGraphRemoteTrackSubscriptionController {
	const operationTails = new Map<string, Promise<void>>();
	return {
		setRemoteTrackSubscription: (options) => {
			const targetKey = nativeSubscriptionTargetKey(options);
			const previous = operationTails.get(targetKey) ?? Promise.resolve();
			const operation = previous
				.catch(() => undefined)
				.then(() => engine.setRemoteTrackSubscription(options))
				.then(
					() => onApplied(options),
					(error: unknown) => onFailed(options, error),
				);
			operationTails.set(targetKey, operation);
			void operation
				.finally(() => {
					if (operationTails.get(targetKey) === operation) {
						operationTails.delete(targetKey);
					}
				})
				.catch(() => undefined);
		},
	};
}
