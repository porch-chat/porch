// SPDX-License-Identifier: AGPL-3.0-or-later

import type {VoiceEngine} from '@app/features/voice/engine/native_voice_engine/VoiceEngine';
import type {VoiceMediaGraphRemoteSubscriptionCommand} from '@app/features/voice/engine/VoiceMediaGraph';
import {VoiceTrackSource} from '@app/features/voice/engine/VoiceTrackSource';
import {describe, expect, it, vi} from 'vitest';
import {createSerializedNativeSubscriptionController} from './SerializedRemoteTrackSubscriptionController';

async function flushPromises(): Promise<void> {
	for (let index = 0; index < 8; index += 1) {
		await Promise.resolve();
	}
}

describe('createSerializedNativeSubscriptionController', () => {
	it('finishes an unsubscribe before starting the matching republish subscribe', async () => {
		let finishUnsubscribe: (() => void) | null = null;
		const engine = {
			setRemoteTrackSubscription: vi.fn((options: VoiceMediaGraphRemoteSubscriptionCommand) => {
				if (!options.subscribed) {
					return new Promise<void>((resolve) => {
						finishUnsubscribe = resolve;
					});
				}
				return Promise.resolve();
			}),
		} satisfies Pick<VoiceEngine, 'setRemoteTrackSubscription'>;
		const applied: Array<VoiceMediaGraphRemoteSubscriptionCommand> = [];
		const failed: Array<unknown> = [];
		const controller = createSerializedNativeSubscriptionController(
			engine,
			(options) => applied.push(options),
			(_options, error) => failed.push(error),
		);
		const unsubscribe: VoiceMediaGraphRemoteSubscriptionCommand = {
			participantIdentity: 'remote:connection-1',
			source: VoiceTrackSource.ScreenShare,
			subscribed: false,
			enabled: false,
		};
		const subscribe: VoiceMediaGraphRemoteSubscriptionCommand = {
			participantIdentity: 'remote:connection-1',
			source: VoiceTrackSource.ScreenShare,
			subscribed: true,
			enabled: true,
			quality: 'high',
		};

		controller.setRemoteTrackSubscription(unsubscribe);
		controller.setRemoteTrackSubscription(subscribe);
		await flushPromises();

		expect(engine.setRemoteTrackSubscription).toHaveBeenCalledTimes(1);
		expect(engine.setRemoteTrackSubscription).toHaveBeenLastCalledWith(unsubscribe);
		expect(applied).toEqual([]);

		expect(finishUnsubscribe).not.toBeNull();
		finishUnsubscribe!();
		await flushPromises();

		expect(engine.setRemoteTrackSubscription).toHaveBeenCalledTimes(2);
		expect(engine.setRemoteTrackSubscription).toHaveBeenLastCalledWith(subscribe);
		expect(applied).toEqual([unsubscribe, subscribe]);
		expect(failed).toEqual([]);
	});

	it('keeps unrelated participant and source operations independent', async () => {
		let finishFirstScreen: (() => void) | null = null;
		const engine = {
			setRemoteTrackSubscription: vi.fn((options: VoiceMediaGraphRemoteSubscriptionCommand) => {
				if (options.participantIdentity === 'remote:connection-1' && options.source === VoiceTrackSource.ScreenShare) {
					return new Promise<void>((resolve) => {
						finishFirstScreen = resolve;
					});
				}
				return Promise.resolve();
			}),
		} satisfies Pick<VoiceEngine, 'setRemoteTrackSubscription'>;
		const controller = createSerializedNativeSubscriptionController(
			engine,
			() => undefined,
			() => undefined,
		);

		controller.setRemoteTrackSubscription({
			participantIdentity: 'remote:connection-1',
			source: VoiceTrackSource.ScreenShare,
			subscribed: false,
		});
		controller.setRemoteTrackSubscription({
			participantIdentity: 'remote:connection-1',
			source: VoiceTrackSource.ScreenShareAudio,
			subscribed: false,
		});
		controller.setRemoteTrackSubscription({
			participantIdentity: 'remote:connection-2',
			source: VoiceTrackSource.ScreenShare,
			subscribed: false,
		});
		await flushPromises();

		expect(engine.setRemoteTrackSubscription).toHaveBeenCalledTimes(3);
		expect(finishFirstScreen).not.toBeNull();
		finishFirstScreen!();
	});
});
