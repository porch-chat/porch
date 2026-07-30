// SPDX-License-Identifier: AGPL-3.0-or-later

import {describe, expect, it} from 'vitest';
import {isLocalMediaControlActive} from './LocalMediaControlState';

describe('isLocalMediaControlActive', () => {
	it.each([
		{local: false, participant: false, expected: false},
		{local: true, participant: false, expected: true},
		{local: false, participant: true, expected: true},
		{local: true, participant: true, expected: true},
		{local: true, participant: undefined, expected: true},
	])('merges local=$local and participant=$participant into active=$expected', ({local, participant, expected}) => {
		expect(isLocalMediaControlActive(local, participant)).toBe(expected);
	});
});
