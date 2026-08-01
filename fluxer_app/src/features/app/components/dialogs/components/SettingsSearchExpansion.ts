// SPDX-License-Identifier: AGPL-3.0-or-later

import type {UserSettingsTabType} from '@app/features/user/components/settings_utils/SettingsSectionRegistry';

export function getAutoExpandedSettingsSearchTabs(
	tabTypes: ReadonlyArray<UserSettingsTabType>,
): Set<UserSettingsTabType> {
	return tabTypes.length === 1 ? new Set([tabTypes[0]!]) : new Set();
}
