// SPDX-License-Identifier: AGPL-3.0-or-later

import {createRequire} from 'node:module';
import {APP_PROTOCOL} from '@electron/common/Constants';
import {disableWindowsAutostartForUninstall} from '@electron/main/Autostart';
import {repairWindowsShortcuts} from '@electron/main/WindowsShortcuts';
import {app} from 'electron';

const requireModule = createRequire(import.meta.url);

if (process.platform === 'win32') {
	const {VelopackApp} = requireModule('velopack') as typeof import('velopack');
	VelopackApp.build()
		.onAfterInstallFastCallback(() => {
			repairWindowsShortcuts();
		})
		.onAfterUpdateFastCallback(() => {
			repairWindowsShortcuts();
		})
		.onBeforeUninstallFastCallback(() => {
			try {
				app.removeAsDefaultProtocolClient(APP_PROTOCOL);
			} catch (error) {
				console.warn('[Bootstrap] Failed to remove the protocol handler during uninstall', error);
			}
			disableWindowsAutostartForUninstall();
			try {
				app.setJumpList(null);
			} catch (error) {
				console.warn('[Bootstrap] Failed to clear the Jump List during uninstall', error);
			}
		})
		.onFirstRun(() => {
			repairWindowsShortcuts();
		})
		.onRestarted(() => {
			repairWindowsShortcuts();
		})
		.run();
	repairWindowsShortcuts();
}

await import(new URL('./MainApp.js', import.meta.url).href);
