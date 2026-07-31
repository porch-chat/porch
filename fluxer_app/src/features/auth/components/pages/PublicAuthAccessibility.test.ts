// SPDX-License-Identifier: AGPL-3.0-or-later
// @vitest-environment node

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {describe, expect, it} from 'vitest';

const APP_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');

describe('public authentication accessibility contract', () => {
	it('keeps browser zoom available and exposes the auth content as a main landmark', () => {
		const indexHtml = fs.readFileSync(path.join(APP_ROOT, 'index.html'), 'utf8');
		const authLayout = fs.readFileSync(
			path.join(APP_ROOT, 'src', 'features', 'app', 'components', 'layout', 'AuthLayout.tsx'),
			'utf8',
		);
		const publicApp = fs.readFileSync(path.join(APP_ROOT, 'src', 'app', 'PublicApp.tsx'), 'utf8');

		expect(indexHtml).not.toMatch(/user-scalable\s*=\s*no/i);
		expect(indexHtml).not.toMatch(/maximum-scale\s*=\s*[0-4](?:\D|$)/i);
		expect(authLayout.match(/<main\s/g)).toHaveLength(2);
		expect(authLayout.match(/id="main-content"/g)).toHaveLength(2);
		expect(publicApp).toContain('<button');
		expect(publicApp).toContain('type="button"');
		expect(publicApp).toContain('onClick={focusMainContent}');
	});
});
