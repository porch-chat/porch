// SPDX-License-Identifier: AGPL-3.0-or-later

import type {ModalTransitionPreset} from '@app/features/ui/utils/ModalUtils';
import type {Transition} from 'framer-motion';

interface ModalExitTransitionOptions {
	prefersReducedMotion: boolean;
	isFullscreenOnMobile: boolean;
	transitionPreset: ModalTransitionPreset;
}

export function resolveModalExitTransition({
	prefersReducedMotion,
	isFullscreenOnMobile,
	transitionPreset,
}: ModalExitTransitionOptions): Transition {
	if (prefersReducedMotion || transitionPreset === 'instant') return {duration: 0};
	if (transitionPreset === 'profile-slide') return {duration: 0.1, ease: 'easeIn'};
	return {duration: isFullscreenOnMobile ? 0.1 : 0.12, ease: 'easeIn'};
}
