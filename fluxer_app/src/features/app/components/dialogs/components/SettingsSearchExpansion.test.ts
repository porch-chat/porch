// SPDX-License-Identifier: AGPL-3.0-or-later

import {getAutoExpandedSettingsSearchTabs} from '@app/features/app/components/dialogs/components/SettingsSearchExpansion';
import {describe, expect, it} from 'vitest';

describe('getAutoExpandedSettingsSearchTabs', () => {
	it('keeps empty search results collapsed', () => {
		expect([...getAutoExpandedSettingsSearchTabs([])]).toEqual([]);
	});

	it('expands a single unambiguous result category', () => {
		expect([...getAutoExpandedSettingsSearchTabs(['voice_video'])]).toEqual(['voice_video']);
	});

	it('keeps multi-category results summarized until the user chooses one', () => {
		expect([...getAutoExpandedSettingsSearchTabs(['appearance', 'accessibility', 'advanced_settings'])]).toEqual([]);
	});
});
