// SPDX-License-Identifier: AGPL-3.0-or-later

import {type AnimationFrameHost, scheduleAfterNextPaint} from '@app/features/ui/utils/AnimationFrameScheduling';
import {describe, expect, it, vi} from 'vitest';

function createFrameHost() {
	let nextId = 1;
	const callbacks = new Map<number, FrameRequestCallback>();
	const host: AnimationFrameHost = {
		requestAnimationFrame(callback) {
			const id = nextId++;
			callbacks.set(id, callback);
			return id;
		},
		cancelAnimationFrame(id) {
			callbacks.delete(id);
		},
	};
	const flushFrame = (time: number) => {
		const pending = Array.from(callbacks.values());
		callbacks.clear();
		for (const callback of pending) callback(time);
	};
	return {callbacks, flushFrame, host};
}

describe('scheduleAfterNextPaint', () => {
	it('runs only after two animation frames', () => {
		const {flushFrame, host} = createFrameHost();
		const callback = vi.fn();
		scheduleAfterNextPaint(host, callback);

		flushFrame(10);
		expect(callback).not.toHaveBeenCalled();
		flushFrame(20);
		expect(callback).toHaveBeenCalledOnce();
		expect(callback).toHaveBeenCalledWith(20);
	});

	it('cancels either stage without invoking the callback', () => {
		const first = createFrameHost();
		const firstCallback = vi.fn();
		const cancelFirst = scheduleAfterNextPaint(first.host, firstCallback);
		cancelFirst();
		first.flushFrame(10);
		first.flushFrame(20);
		expect(firstCallback).not.toHaveBeenCalled();

		const second = createFrameHost();
		const secondCallback = vi.fn();
		const cancelSecond = scheduleAfterNextPaint(second.host, secondCallback);
		second.flushFrame(10);
		cancelSecond();
		second.flushFrame(20);
		expect(secondCallback).not.toHaveBeenCalled();
	});
});
