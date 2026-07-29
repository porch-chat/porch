// SPDX-License-Identifier: AGPL-3.0-or-later

import * as Modal from '@app/features/app/components/dialogs/Modal';
import {Button} from '@app/features/ui/button/Button';
import * as ModalCommands from '@app/features/ui/commands/ModalCommands';
import {modal} from '@app/features/ui/commands/ModalCommands';
import {MemberRegistrationInvitesPanel} from '@app/features/user/components/member_registration_invites/MemberRegistrationInvitesPanel';
import {UserSettingsModal} from '@app/features/user/components/modals/UserSettingsModal';
import {Trans} from '@lingui/react/macro';

export function MemberRegistrationInviteModal() {
	const openSettings = () => {
		ModalCommands.pop();
		ModalCommands.push(
			modal(() => (
				<UserSettingsModal
					initialTab="registration_invites"
					data-flx="user.member-registration-invite-modal.user-settings-modal"
				/>
			)),
		);
	};
	return (
		<Modal.Root size="small" centered data-flx="user.member-registration-invite-modal.modal-root">
			<Modal.Header
				title={<Trans>Invite friends to Porch</Trans>}
				data-flx="user.member-registration-invite-modal.header"
			/>
			<Modal.Content data-flx="user.member-registration-invite-modal.content">
				<Modal.ContentLayout data-flx="user.member-registration-invite-modal.content-layout">
					<MemberRegistrationInvitesPanel showHistory={false} data-flx="user.member-registration-invite-modal.panel" />
				</Modal.ContentLayout>
			</Modal.Content>
			<Modal.Footer data-flx="user.member-registration-invite-modal.footer">
				<Button
					variant="secondary"
					onClick={openSettings}
					data-flx="user.member-registration-invite-modal.button.manage"
				>
					<Trans>Manage links</Trans>
				</Button>
				<Button onClick={() => ModalCommands.pop()} data-flx="user.member-registration-invite-modal.button.done">
					<Trans>Done</Trans>
				</Button>
			</Modal.Footer>
		</Modal.Root>
	);
}
