// SPDX-License-Identifier: AGPL-3.0-or-later

export type MemberListScrollerResizeType = 'container' | 'content';

export function getMemberListViewportHeight(
	entry: ResizeObserverEntry,
	type: MemberListScrollerResizeType,
): number | null {
	if (type !== 'container') return null;
	return entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
}
