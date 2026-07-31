// SPDX-License-Identifier: AGPL-3.0-or-later

import {makeAutoObservable} from 'mobx';

interface WindowSize {
	width: number;
	height: number;
}

const getWindowSize = (): WindowSize => ({
	width: window.innerWidth,
	height: window.innerHeight,
});
const getInitialFocused = (): boolean => document.hasFocus();
const getInitialVisible = (): boolean => !document.hidden;

function generateWindowId(): string {
	return `window-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

class Window {
	focused = getInitialFocused();
	visible = getInitialVisible();
	windowSize: WindowSize = getWindowSize();
	windowId: string = generateWindowId();
	lastFocusedAt: number = Date.now();
	createdAt: number = Date.now();

	constructor() {
		makeAutoObservable(this, {}, {autoBind: true});
	}

	setFocused(focused: boolean): void {
		if (this.focused !== focused) {
			this.focused = focused;
			if (focused) {
				this.lastFocusedAt = Date.now();
			}
		}
	}

	setVisible(visible: boolean): void {
		if (this.visible !== visible) {
			this.visible = visible;
		}
	}

	updateWindowSize(): void {
		const nextSize = getWindowSize();
		if (this.windowSize.width === nextSize.width && this.windowSize.height === nextSize.height) {
			return;
		}
		this.windowSize = nextSize;
	}

	isFocused(): boolean {
		return this.focused;
	}

	isVisible(): boolean {
		return this.visible;
	}

	getWindowSize(): WindowSize {
		return this.windowSize;
	}
}

export default new Window();
