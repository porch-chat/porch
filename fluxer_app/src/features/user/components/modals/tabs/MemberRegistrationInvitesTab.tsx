// SPDX-License-Identifier: AGPL-3.0-or-later

import {SettingsSection} from '@app/features/app/components/dialogs/shared/SettingsSection';
import {SettingsTabContainer, SettingsTabContent} from '@app/features/app/components/dialogs/shared/SettingsTabLayout';
import {MemberRegistrationInvitesPanel} from '@app/features/user/components/member_registration_invites/MemberRegistrationInvitesPanel';
import {Trans} from '@lingui/react/macro';

export default function MemberRegistrationInvitesTab() {
	return (
		<SettingsTabContainer data-flx="user.member-registration-invites-tab.container">
			<SettingsTabContent data-flx="user.member-registration-invites-tab.content">
				<SettingsSection
					id="registration-invites"
					title={<Trans>Invite friends to Porch</Trans>}
					description={
						<Trans>
							Create and manage one-person account registration links. Community and group invites remain separate.
						</Trans>
					}
					data-flx="user.member-registration-invites-tab.section"
				>
					<MemberRegistrationInvitesPanel data-flx="user.member-registration-invites-tab.panel" />
				</SettingsSection>
			</SettingsTabContent>
		</SettingsTabContainer>
	);
}
