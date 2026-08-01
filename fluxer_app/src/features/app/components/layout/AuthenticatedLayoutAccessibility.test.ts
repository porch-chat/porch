// SPDX-License-Identifier: AGPL-3.0-or-later
// @vitest-environment node

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

describe('authenticated layout accessibility contract', () => {
	it('provides one shared main landmark and keeps channel content as a labeled region', () => {
		const guildsLayout = fs.readFileSync(
			path.join(APP_ROOT, 'src', 'features', 'app', 'components', 'layout', 'GuildsLayout.tsx'),
			'utf8',
		);
		const channelLayout = fs.readFileSync(
			path.join(APP_ROOT, 'src', 'features', 'channel', 'components', 'ChannelLayout.tsx'),
			'utf8',
		);

		expect(guildsLayout.match(/<main\s/g)).toHaveLength(1);
		expect(guildsLayout).toContain('id="main-content"');
		expect(guildsLayout).toContain('tabIndex={-1}');
		expect(channelLayout).not.toContain('<main');
		expect(channelLayout.match(/<section\s/g)).toHaveLength(2);
		expect(channelLayout.match(/aria-label=/g)).toHaveLength(2);
	});
});
