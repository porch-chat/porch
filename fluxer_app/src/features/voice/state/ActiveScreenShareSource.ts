// SPDX-License-Identifier: AGPL-3.0-or-later

import {makeAutoObservable} from 'mobx';

export interface ActiveScreenShareSourceOptions {
	readonly isOwnWindow?: boolean;
	readonly sourceDimensions?: {
		readonly width: number;
		readonly height: number;
	};
}

class ActiveScreenShareSource {
	sourceId: string | null = null;
	ownWindow = false;
	sourceWidth: number | null = null;
	sourceHeight: number | null = null;

	constructor() {
		makeAutoObservable(this, {}, {autoBind: true});
	}

	setSourceId(sourceId: string | null, options: ActiveScreenShareSourceOptions = {}): void {
		this.sourceId = sourceId;
		this.ownWindow = sourceId !== null && options.isOwnWindow === true;
		const width = options.sourceDimensions?.width;
		const height = options.sourceDimensions?.height;
		this.sourceWidth =
			sourceId !== null && typeof width === 'number' && Number.isFinite(width) && width > 0
				? Math.max(2, Math.floor(width) & ~1)
				: null;
		this.sourceHeight =
			sourceId !== null && typeof height === 'number' && Number.isFinite(height) && height > 0
				? Math.max(2, Math.floor(height) & ~1)
				: null;
	}

	getSourceId(): string | null {
		return this.sourceId;
	}

	isOwnWindow(): boolean {
		return this.ownWindow;
	}

	getSourceDimensions(): {width: number; height: number} | undefined {
		if (this.sourceWidth === null || this.sourceHeight === null) return undefined;
		return {width: this.sourceWidth, height: this.sourceHeight};
	}

	clear(): void {
		this.sourceId = null;
		this.ownWindow = false;
		this.sourceWidth = null;
		this.sourceHeight = null;
	}
}

export default new ActiveScreenShareSource();
