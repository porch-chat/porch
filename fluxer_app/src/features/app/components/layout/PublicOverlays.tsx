// SPDX-License-Identifier: AGPL-3.0-or-later

import {ModalStack} from '@app/features/app/components/dialogs/ModalStack';
import {Toasts} from '@app/features/ui/toast/Toasts';

/**
 * The logged-out surface only needs the modal stack for CAPTCHA/auth dialogs
 * and the toast host for request feedback. Media, profile, quick-switcher,
 * picture-in-picture, and voice overlays stay in the authenticated bundle.
 */
export function PublicOverlays(): React.ReactElement {
	return (
		<>
			<ModalStack data-flx="app.public-overlays.modal-stack" />
			<Toasts data-flx="app.public-overlays.toasts" />
		</>
	);
}
