// SPDX-License-Identifier: AGPL-3.0-or-later

export interface AnimationFrameHost {
	requestAnimationFrame(callback: FrameRequestCallback): number;
	cancelAnimationFrame(handle: number): void;
}

export function scheduleAfterNextPaint(host: AnimationFrameHost, callback: FrameRequestCallback): () => void {
	let cancelled = false;
	let frameId = host.requestAnimationFrame((firstFrameTime) => {
		if (cancelled) return;
		frameId = host.requestAnimationFrame((secondFrameTime) => {
			if (!cancelled) callback(secondFrameTime || firstFrameTime);
		});
	});
	return () => {
		cancelled = true;
		host.cancelAnimationFrame(frameId);
	};
}
