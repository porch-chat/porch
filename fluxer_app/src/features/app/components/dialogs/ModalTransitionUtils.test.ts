// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {resolveModalExitTransition} from './ModalTransitionUtils';

describe('resolveModalExitTransition', () => {
	it('uses a short deterministic exit instead of waiting for the opening spring to settle', () => {
		expect(
			resolveModalExitTransition({
				prefersReducedMotion: false,
				isFullscreenOnMobile: false,
				transitionPreset: 'default',
			}),
		).toEqual({duration: 0.12, ease: 'easeIn'});
	});

	it('keeps profile exits compact', () => {
		expect(
			resolveModalExitTransition({
				prefersReducedMotion: false,
				isFullscreenOnMobile: false,
				transitionPreset: 'profile-slide',
			}),
		).toEqual({duration: 0.1, ease: 'easeIn'});
	});

	it.each([
		{prefersReducedMotion: true, transitionPreset: 'default' as const},
		{prefersReducedMotion: false, transitionPreset: 'instant' as const},
	])('disables exit motion for $transitionPreset reduced=$prefersReducedMotion', ({
		prefersReducedMotion,
		transitionPreset,
	}) => {
		expect(resolveModalExitTransition({prefersReducedMotion, isFullscreenOnMobile: false, transitionPreset})).toEqual({
			duration: 0,
		});
	});
});
