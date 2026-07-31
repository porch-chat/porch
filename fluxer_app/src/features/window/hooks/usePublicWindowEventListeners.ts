// SPDX-License-Identifier: AGPL-3.0-or-later

import FocusManager from '@app/features/platform/utils/FocusManager';
import {createWindowFocusInteractionGuard} from '@app/features/ui/utils/WindowFocusInteractionGuard';
import {useEffect} from 'react';

/**
 * Installs only the browser-level safeguards required by public auth pages.
 * Authenticated resize, read-state, activity, and voice bookkeeping belongs to
 * useWindowEventListeners and must not pull the communication runtime into the
 * logged-out bundle.
 */
export function usePublicWindowEventListeners({preventDocumentScroll}: {preventDocumentScroll: boolean}): void {
	useEffect(() => {
		FocusManager.init();
		const guard = createWindowFocusInteractionGuard({initiallyFocused: document.hasFocus()});
		guard.setFocused(document.hasFocus());
		const handleFocus = () => guard.setFocused(true);
		const handleBlur = () => {
			if (!document.hasFocus()) guard.setFocused(false);
		};
		const preventPinchZoom = (event: TouchEvent) => {
			if (event.touches.length > 1) event.preventDefault();
		};
		const preventScroll = (event: Event) => event.preventDefault();
		window.addEventListener('focus', handleFocus);
		window.addEventListener('blur', handleBlur);
		document.addEventListener('touchstart', preventPinchZoom, {passive: false});
		document.addEventListener('touchmove', preventPinchZoom, {passive: false});
		if (preventDocumentScroll) document.addEventListener('scroll', preventScroll);
		return () => {
			FocusManager.destroy();
			guard.destroy();
			window.removeEventListener('focus', handleFocus);
			window.removeEventListener('blur', handleBlur);
			document.removeEventListener('touchstart', preventPinchZoom);
			document.removeEventListener('touchmove', preventPinchZoom);
			if (preventDocumentScroll) document.removeEventListener('scroll', preventScroll);
		};
	}, [preventDocumentScroll]);
}
