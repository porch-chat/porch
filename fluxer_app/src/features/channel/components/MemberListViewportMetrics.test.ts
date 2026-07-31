// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {getMemberListViewportHeight} from './MemberListViewportMetrics';

function resizeEntry({borderBoxHeight, contentHeight}: {borderBoxHeight?: number; contentHeight: number}) {
	return {
		borderBoxSize: borderBoxHeight == null ? [] : [{blockSize: borderBoxHeight}],
		contentRect: {height: contentHeight},
	} as unknown as ResizeObserverEntry;
}

describe('getMemberListViewportHeight', () => {
	it('uses observer-provided border-box geometry for container resizes', () => {
		expect(getMemberListViewportHeight(resizeEntry({borderBoxHeight: 720, contentHeight: 688}), 'container')).toBe(720);
	});

	it('falls back to observer-provided content geometry', () => {
		expect(getMemberListViewportHeight(resizeEntry({contentHeight: 688}), 'container')).toBe(688);
	});

	it('ignores content and child resize notifications', () => {
		expect(getMemberListViewportHeight(resizeEntry({borderBoxHeight: 720, contentHeight: 688}), 'content')).toBeNull();
	});
});
