// SPDX-License-Identifier: AGPL-3.0-or-later

import Accessibility from '@app/features/accessibility/state/Accessibility';
import guildStyles from '@app/features/app/components/layout/GuildsLayout.module.css';
import styles from '@app/features/app/components/layout/sidebar_nav/MemberRegistrationInviteButton.module.css';
import {useHover} from '@app/features/app/hooks/useHover';
import {useMergeRefs} from '@app/features/app/hooks/useMergeRefs';
import RuntimeConfig from '@app/features/app/state/RuntimeConfig';
import * as ModalCommands from '@app/features/ui/commands/ModalCommands';
import {modal} from '@app/features/ui/commands/ModalCommands';
import FocusRing from '@app/features/ui/focus_ring/FocusRing';
import {Tooltip} from '@app/features/ui/tooltip/Tooltip';
import {MemberRegistrationInviteModal} from '@app/features/user/components/modals/MemberRegistrationInviteModal';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {UserPlusIcon} from '@phosphor-icons/react';
import {motion} from 'framer-motion';
import {observer} from 'mobx-react-lite';
import {useRef} from 'react';

const INVITE_FRIENDS_TO_PORCH_DESCRIPTOR = msg({
	message: 'Invite friends to Porch',
	comment: 'Short label in the server rail for creating standalone account registration links.',
});

export const MemberRegistrationInviteButton = observer(() => {
	const {i18n} = useLingui();
	const [hoverRef, isHovering] = useHover();
	const buttonRef = useRef<HTMLButtonElement | null>(null);
	const iconRef = useRef<HTMLDivElement | null>(null);
	const mergedButtonRef = useMergeRefs([hoverRef, buttonRef]);
	if (!RuntimeConfig.registration.admin_registration_urls_enabled) {
		return null;
	}
	const handleOpen = () => {
		ModalCommands.push(
			modal(() => <MemberRegistrationInviteModal data-flx="app.sidebar-nav.member-registration-invite-button.modal" />),
		);
	};
	const buttonLabel = i18n._(INVITE_FRIENDS_TO_PORCH_DESCRIPTOR);
	return (
		<div className={guildStyles.addGuildButton} data-flx="app.sidebar-nav.member-registration-invite-button.div">
			<Tooltip
				position="right"
				size="large"
				text={buttonLabel}
				data-flx="app.sidebar-nav.member-registration-invite-button.tooltip"
			>
				<FocusRing
					offset={-2}
					focusTarget={buttonRef}
					ringTarget={iconRef}
					data-flx="app.sidebar-nav.member-registration-invite-button.focus-ring"
				>
					<button
						type="button"
						aria-label={buttonLabel}
						aria-haspopup="dialog"
						data-guild-list-focus-item="true"
						onClick={handleOpen}
						className={styles.button}
						ref={mergedButtonRef}
						data-flx="app.sidebar-nav.member-registration-invite-button.button.open"
					>
						<motion.div
							ref={iconRef}
							className={guildStyles.addGuildButtonIcon}
							animate={{borderRadius: isHovering ? '30%' : '50%'}}
							initial={{borderRadius: isHovering ? '30%' : '50%'}}
							transition={{duration: Accessibility.useReducedMotion ? 0 : 0.07, ease: 'easeOut'}}
							data-flx="app.sidebar-nav.member-registration-invite-button.icon-shell"
						>
							<UserPlusIcon
								weight="bold"
								className={styles.iconText}
								data-flx="app.sidebar-nav.member-registration-invite-button.icon"
							/>
						</motion.div>
					</button>
				</FocusRing>
			</Tooltip>
		</div>
	);
});
