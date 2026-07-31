// SPDX-License-Identifier: AGPL-3.0-or-later
// @vitest-environment happy-dom

import {afterEach, describe, expect, it, vi} from 'vitest';

function setViewport(width: number, height: number): void {
	Object.defineProperty(window, 'innerWidth', {configurable: true, value: width});
	Object.defineProperty(window, 'innerHeight', {configurable: true, value: height});
}

afterEach(() => {
	vi.restoreAllMocks();
	vi.resetModules();
});

describe('Window state', () => {
	it('does not install duplicate global DOM listeners when the singleton is created', async () => {
		const windowListener = vi.spyOn(window, 'addEventListener');
		const documentListener = vi.spyOn(document, 'addEventListener');

		await import('@app/features/window/state/Window');

		expect(windowListener).not.toHaveBeenCalled();
		expect(documentListener).not.toHaveBeenCalled();
	});

	it('preserves the observable size object when a resize reports identical dimensions', async () => {
		setViewport(1280, 720);
		const {default: Window} = await import('@app/features/window/state/Window');
		const initialSize = Window.windowSize;

		Window.updateWindowSize();

		expect(Window.windowSize).toBe(initialSize);
	});

	it('publishes one new size object when the viewport dimensions change', async () => {
		setViewport(1280, 720);
		const {default: Window} = await import('@app/features/window/state/Window');
		const initialSize = Window.windowSize;
		setViewport(1440, 900);

		Window.updateWindowSize();

		expect(Window.windowSize).not.toBe(initialSize);
		expect(Window.windowSize).toEqual({width: 1440, height: 900});
	});
});
