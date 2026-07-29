// SPDX-License-Identifier: AGPL-3.0-or-later

import {showGenericErrorModal} from '@app/features/app/components/alerts/GenericErrorModalCommands';
import {ConfirmModal} from '@app/features/app/components/dialogs/ConfirmModal';
import {CopyLinkSection} from '@app/features/app/components/dialogs/shared/CopyLinkSection';
import {SOMETHING_WENT_WRONG_DESCRIPTOR} from '@app/features/i18n/utils/CommonMessageDescriptors';
import {Button} from '@app/features/ui/button/Button';
import * as ModalCommands from '@app/features/ui/commands/ModalCommands';
import {modal} from '@app/features/ui/commands/ModalCommands';
import * as TextCopyCommands from '@app/features/ui/commands/TextCopyCommands';
import {Input} from '@app/features/ui/components/form/FormInput';
import {Spinner} from '@app/features/ui/components/Spinner';
import type {MemberRegistrationInvite} from '@app/features/user/commands/MemberRegistrationInviteCommands';
import * as MemberRegistrationInviteCommands from '@app/features/user/commands/MemberRegistrationInviteCommands';
import styles from '@app/features/user/components/member_registration_invites/MemberRegistrationInvitesPanel.module.css';
import {formatMemberRegistrationInviteTimestamp} from '@app/features/user/components/member_registration_invites/MemberRegistrationInviteTimestamp';
import {msg} from '@lingui/core/macro';
import {Trans, useLingui} from '@lingui/react/macro';
import {ClockIcon, LinkSimpleIcon, ShieldCheckIcon, TrashIcon, UserPlusIcon} from '@phosphor-icons/react';
import {useCallback, useEffect, useMemo, useState} from 'react';

const COULD_NOT_LOAD_INVITES_DESCRIPTOR = msg({
	message: "We couldn't load your registration links. Try again.",
	comment: 'Error shown when the member registration invite list cannot be loaded.',
});
const COULD_NOT_CREATE_INVITE_DESCRIPTOR = msg({
	message: "We couldn't create a registration link. Try again.",
	comment: 'Error shown when a member registration invite cannot be created.',
});
const COULD_NOT_REVOKE_INVITE_DESCRIPTOR = msg({
	message: "We couldn't revoke this registration link. Try again.",
	comment: 'Error shown when a member registration invite cannot be revoked.',
});
const COPY_REGISTRATION_LINK_DESCRIPTOR = msg({
	message: 'Copy registration link',
	comment: 'Label above the copyable member registration URL.',
});

interface MemberRegistrationInvitesPanelProps {
	showHistory?: boolean;
}

function getInviteStatus(invite: MemberRegistrationInvite): 'used' | 'revoked' | 'expired' {
	if (invite.use_count >= invite.max_uses) return 'used';
	if (invite.revoked_at) return 'revoked';
	return 'expired';
}

export function MemberRegistrationInvitesPanel({showHistory = true}: MemberRegistrationInvitesPanelProps) {
	const {i18n} = useLingui();
	const [invites, setInvites] = useState<Array<MemberRegistrationInvite>>([]);
	const [label, setLabel] = useState('');
	const [loading, setLoading] = useState(true);
	const [creating, setCreating] = useState(false);
	const activeInvite = invites.find((invite) => invite.active) ?? null;
	const previousInvites = useMemo(() => invites.filter((invite) => !invite.active), [invites]);
	const formatDate = useCallback(
		(value: string) =>
			new Intl.DateTimeFormat(i18n.locale, {
				dateStyle: 'medium',
				timeStyle: 'short',
			}).format(new Date(value)),
		[i18n.locale],
	);
	const showError = useCallback(
		(message: string) => {
			showGenericErrorModal({
				title: () => i18n._(SOMETHING_WENT_WRONG_DESCRIPTOR),
				message,
				dataFlx: 'user.member-registration-invites-panel.error-modal',
			});
		},
		[i18n],
	);
	const refresh = useCallback(async () => {
		try {
			setInvites(await MemberRegistrationInviteCommands.list());
		} catch {
			showError(i18n._(COULD_NOT_LOAD_INVITES_DESCRIPTOR));
		} finally {
			setLoading(false);
		}
	}, [i18n, showError]);
	useEffect(() => {
		void refresh();
	}, [refresh]);
	const handleCreate = useCallback(async () => {
		setCreating(true);
		try {
			const created = await MemberRegistrationInviteCommands.create(label.trim() || null);
			setInvites((current) => [created, ...current.filter((invite) => invite.id !== created.id)]);
			setLabel('');
		} catch {
			showError(i18n._(COULD_NOT_CREATE_INVITE_DESCRIPTOR));
		} finally {
			setCreating(false);
		}
	}, [i18n, label, showError]);
	const handleRevoke = useCallback(
		(invite: MemberRegistrationInvite) => {
			ModalCommands.push(
				modal(() => (
					<ConfirmModal
						title={<Trans>Revoke registration link?</Trans>}
						description={
							<Trans>
								This link will stop working immediately. It won&apos;t affect any account that already used it.
							</Trans>
						}
						primaryText={<Trans>Revoke link</Trans>}
						primaryVariant="danger"
						onPrimary={async () => {
							try {
								await MemberRegistrationInviteCommands.revoke(invite.id);
								await refresh();
							} catch {
								showError(i18n._(COULD_NOT_REVOKE_INVITE_DESCRIPTOR));
							}
						}}
						data-flx="user.member-registration-invites-panel.revoke-confirm-modal"
					/>
				)),
			);
		},
		[i18n, refresh, showError],
	);
	if (loading) {
		return (
			<div className={styles.loading} data-flx="user.member-registration-invites-panel.loading">
				<Spinner data-flx="user.member-registration-invites-panel.spinner" />
			</div>
		);
	}
	return (
		<div className={styles.panel} data-flx="user.member-registration-invites-panel.panel">
			<div className={styles.explainer} data-flx="user.member-registration-invites-panel.explainer">
				<div className={styles.explainerIcon} aria-hidden>
					<ShieldCheckIcon weight="fill" />
				</div>
				<div>
					<h3 className={styles.explainerTitle}>
						<Trans>A Porch account—not a community membership</Trans>
					</h3>
					<p className={styles.explainerText}>
						<Trans>
							Each link works for one person and expires after seven days. After they create an account, send a separate
							community or group invite wherever you want them to join.
						</Trans>
					</p>
				</div>
			</div>

			{activeInvite ? (
				<div className={styles.activeCard} data-flx="user.member-registration-invites-panel.active-card">
					<div className={styles.cardHeading}>
						<div>
							<p className={styles.eyebrow}>
								<Trans>Ready to share</Trans>
							</p>
							<h3 className={styles.cardTitle}>{activeInvite.label || <Trans>Friend registration link</Trans>}</h3>
						</div>
						<div className={styles.activeBadge}>
							<span className={styles.activeDot} />
							<Trans>Active</Trans>
						</div>
					</div>
					<CopyLinkSection
						label={i18n._(COPY_REGISTRATION_LINK_DESCRIPTOR)}
						value={activeInvite.url}
						onCopy={() => TextCopyCommands.copy(i18n, activeInvite.url, true)}
						inputProps={{leftIcon: <LinkSimpleIcon aria-hidden />}}
					/>
					<div className={styles.metaRow}>
						<span>
							<ClockIcon aria-hidden />
							{formatMemberRegistrationInviteTimestamp(i18n._(msg`Expires`), formatDate(activeInvite.expires_at))}
						</span>
						<span>
							<UserPlusIcon aria-hidden />
							<Trans>One person</Trans>
						</span>
					</div>
					<div className={styles.cardActions}>
						<Button
							variant="secondary"
							small
							leftIcon={<TrashIcon aria-hidden />}
							onClick={() => handleRevoke(activeInvite)}
							data-flx="user.member-registration-invites-panel.button.revoke"
						>
							<Trans>Revoke</Trans>
						</Button>
					</div>
				</div>
			) : (
				<div className={styles.createCard} data-flx="user.member-registration-invites-panel.create-card">
					<div>
						<h3 className={styles.cardTitle}>
							<Trans>Invite someone new to Porch</Trans>
						</h3>
						<p className={styles.createDescription}>
							<Trans>The private label is only visible to you and helps you remember who the link is for.</Trans>
						</p>
					</div>
					<Input
						label={<Trans>Who is this for? (optional)</Trans>}
						placeholder={i18n._(
							msg({
								message: "Friend's name",
								comment: 'Placeholder for the private label on a member registration link.',
							}),
						)}
						value={label}
						maxLength={80}
						onChange={(event) => setLabel(event.currentTarget.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter' && !creating) {
								event.preventDefault();
								void handleCreate();
							}
						}}
						data-flx="user.member-registration-invites-panel.input.label"
					/>
					<Button
						fitContent
						leftIcon={<UserPlusIcon weight="bold" aria-hidden />}
						onClick={() => void handleCreate()}
						submitting={creating}
						data-flx="user.member-registration-invites-panel.button.create"
					>
						<Trans>Create registration link</Trans>
					</Button>
				</div>
			)}

			{showHistory && previousInvites.length > 0 ? (
				<div className={styles.history} data-flx="user.member-registration-invites-panel.history">
					<div className={styles.historyHeader}>
						<h3>
							<Trans>Previous links</Trans>
						</h3>
						<span>
							<Trans>{previousInvites.length} total</Trans>
						</span>
					</div>
					<div className={styles.historyList}>
						{previousInvites.map((invite) => {
							const status = getInviteStatus(invite);
							return (
								<div
									key={invite.id}
									className={styles.historyItem}
									data-flx="user.member-registration-invites-panel.history-item"
								>
									<div className={styles.historyIcon}>
										<LinkSimpleIcon aria-hidden />
									</div>
									<div className={styles.historyInfo}>
										<span className={styles.historyLabel}>
											{invite.label || <Trans>Friend registration link</Trans>}
										</span>
										<span className={styles.historyDate}>
											{formatMemberRegistrationInviteTimestamp(i18n._(msg`Created`), formatDate(invite.created_at))}
										</span>
									</div>
									<span className={styles.statusBadge} data-status={status}>
										{status === 'used' ? <Trans>Used</Trans> : null}
										{status === 'revoked' ? <Trans>Revoked</Trans> : null}
										{status === 'expired' ? <Trans>Expired</Trans> : null}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			) : null}
		</div>
	);
}
