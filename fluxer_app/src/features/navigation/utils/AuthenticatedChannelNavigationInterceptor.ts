// SPDX-License-Identifier: AGPL-3.0-or-later

import * as LinkChannelCommands from '@app/features/channel/commands/LinkChannelCommands';
import Channels from '@app/features/channel/state/Channels';
import {
	type ChannelNavigationTarget,
	setAuthenticatedChannelNavigationInterceptor,
} from '@app/features/navigation/utils/ChannelNavigationGuard';
import {ME} from '@fluxer/constants/src/AppConstants';
import {ChannelTypes} from '@fluxer/constants/src/ChannelConstants';

function interceptAuthenticatedChannelNavigation(target: ChannelNavigationTarget): boolean {
	const channel = Channels.getChannel(target.channelId);
	if (!channel || channel.isPrivate()) return false;
	if (
		target.guildId !== '@favorites' &&
		target.guildId !== ME &&
		channel.guildId &&
		channel.guildId !== target.guildId
	) {
		return false;
	}
	if (channel.type === ChannelTypes.GUILD_CATEGORY) return false;
	if (channel.type === ChannelTypes.GUILD_LINK) {
		return LinkChannelCommands.openLinkChannel(channel);
	}
	return false;
}

export function installAuthenticatedChannelNavigationInterceptor(): void {
	setAuthenticatedChannelNavigationInterceptor(interceptAuthenticatedChannelNavigation);
}
