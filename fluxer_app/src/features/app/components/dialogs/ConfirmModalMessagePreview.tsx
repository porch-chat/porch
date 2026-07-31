// SPDX-License-Identifier: AGPL-3.0-or-later

import styles from '@app/features/app/components/dialogs/ConfirmModal.module.css';
import {useElementOverflow} from '@app/features/app/hooks/useTextOverflow';
import {Message} from '@app/features/channel/components/ChannelMessage';
import Channels from '@app/features/channel/state/Channels';
import {Message as MessageModel} from '@app/features/messaging/models/MessagingMessage';
import {MessagePreviewContext} from '@fluxer/constants/src/ChannelConstants';
import {clsx} from 'clsx';
import {useMemo, useState} from 'react';

export function ConfirmModalMessagePreview({message}: {message: MessageModel}): React.ReactElement | null {
	const [element, setElement] = useState<HTMLDivElement | null>(null);
	const isOverflowing = useElementOverflow(element, 'vertical');
	const behaviorOverrides = useMemo(
		() => ({
			isEditing: false,
			isHighlight: false,
			disableContextMenu: true,
			disableContextMenuTracking: true,
			contextMenuOpen: false,
		}),
		[],
	);
	const snapshot = useMemo(
		() =>
			new MessageModel(message.toJSON(), {
				skipUserCache: true,
				missingReactions: 'preserve',
				skipReactionHydration: true,
				instanceId: message.instanceId,
			}),
		[message],
	);
	const channel = Channels.getChannel(snapshot.channelId);
	if (!channel) return null;
	return (
		<div
			ref={setElement}
			className={clsx(styles.messagePreview, isOverflowing && styles.messagePreviewOverflowing)}
			data-flx="app.confirm-modal.message-preview"
		>
			<Message
				channel={channel}
				message={snapshot}
				previewContext={MessagePreviewContext.LIST_POPOUT}
				removeTopSpacing
				behaviorOverrides={behaviorOverrides}
				data-flx="app.confirm-modal.message"
			/>
		</div>
	);
}
