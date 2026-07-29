// SPDX-License-Identifier: AGPL-3.0-or-later

import fs from 'node:fs';
import path from 'node:path';
import {
	DESKTOP_APP_NAME,
	WINDOWS_APP_USER_MODEL_ID,
	WINDOWS_LEGACY_APP_USER_MODEL_IDS,
	WINDOWS_SHORTCUT_AUTHOR,
	WINDOWS_TOAST_ACTIVATOR_CLSID,
} from '@electron/common/DesktopIdentity';
import {shell} from 'electron';

interface WindowsShortcutRepairPaths {
	authorShortcut: string;
	currentDir: string;
	currentExe: string;
	rootAppDir: string;
	rootShortcut: string;
}

function getProgramsDir(): string | null {
	const appData = process.env.APPDATA;
	if (!appData) return null;
	return path.join(appData, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
}

function getWindowsShortcutRepairPaths(): WindowsShortcutRepairPaths | null {
	const currentExe = process.execPath;
	const currentDir = path.dirname(currentExe);
	if (path.basename(currentDir).toLowerCase() !== 'current') {
		return null;
	}
	const rootAppDir = path.dirname(currentDir);
	if (!fs.existsSync(path.join(rootAppDir, 'Update.exe'))) {
		return null;
	}
	const programsDir = getProgramsDir();
	if (!programsDir) return null;
	const shortcutName = `${DESKTOP_APP_NAME}.lnk`;
	return {
		authorShortcut: path.join(programsDir, WINDOWS_SHORTCUT_AUTHOR, shortcutName),
		currentDir,
		currentExe,
		rootAppDir,
		rootShortcut: path.join(programsDir, shortcutName),
	};
}

function isInFluxerRoot(candidate: string, rootDir: string): boolean {
	if (!candidate) return false;
	let fullPath: string;
	try {
		fullPath = path.resolve(candidate);
	} catch {
		return false;
	}
	const normalized = fullPath.replace(/\\+$/, '');
	const normalizedRoot = rootDir.replace(/\\+$/, '');
	return (
		normalized.toLowerCase() === normalizedRoot.toLowerCase() ||
		normalized.toLowerCase().startsWith(normalizedRoot.toLowerCase() + path.sep)
	);
}

function lnkContainsString(lnkPath: string, needle: string): boolean {
	let buf: Buffer;
	try {
		buf = fs.readFileSync(lnkPath);
	} catch {
		return false;
	}
	const utf16 = Buffer.from(needle, 'utf16le');
	if (buf.includes(utf16)) return true;
	return buf.includes(Buffer.from(needle, 'utf8'));
}

function repairOneShortcut(shortcutPath: string, repair: WindowsShortcutRepairPaths): void {
	if (!fs.existsSync(shortcutPath)) return;
	const rootDir = path.resolve(repair.rootAppDir);
	const alreadyCurrent = lnkContainsString(shortcutPath, repair.currentExe);
	const pointsAtFluxer = lnkContainsString(shortcutPath, rootDir) || isInFluxerRoot(shortcutPath, rootDir);
	const hasLegacyAumid = WINDOWS_LEGACY_APP_USER_MODEL_IDS.some((legacyAumid) =>
		lnkContainsString(shortcutPath, legacyAumid),
	);
	if (!pointsAtFluxer) return;
	if (alreadyCurrent && !hasLegacyAumid) return;
	try {
		const repaired = shell.writeShortcutLink(shortcutPath, 'replace', {
			target: repair.currentExe,
			appUserModelId: WINDOWS_APP_USER_MODEL_ID,
			toastActivatorClsid: WINDOWS_TOAST_ACTIVATOR_CLSID,
			cwd: repair.currentDir,
			icon: repair.currentExe,
			iconIndex: 0,
		});
		if (!repaired) {
			console.warn('[WindowsShortcuts] Electron declined to rewrite shortcut', {shortcutPath});
		}
	} catch (error) {
		console.warn('[WindowsShortcuts] Failed to rewrite shortcut', {shortcutPath, error});
	}
}

function repairWindowsShortcutsSync(repairPaths: WindowsShortcutRepairPaths): void {
	try {
		if (fs.existsSync(repairPaths.rootShortcut)) {
			const authorDir = path.dirname(repairPaths.authorShortcut);
			fs.mkdirSync(authorDir, {recursive: true});
			if (fs.existsSync(repairPaths.authorShortcut)) {
				fs.rmSync(repairPaths.rootShortcut, {force: true});
			} else {
				fs.renameSync(repairPaths.rootShortcut, repairPaths.authorShortcut);
			}
		}
	} catch (error) {
		console.warn('[WindowsShortcuts] Failed to migrate root Start-Menu shortcut', error);
	}
	const shortcutPaths: Array<string> = [repairPaths.authorShortcut];
	const desktopDir = process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'Desktop') : '';
	if (desktopDir) shortcutPaths.push(path.join(desktopDir, `${DESKTOP_APP_NAME}.lnk`));
	if (process.env.APPDATA) {
		const pinnedDir = path.join(
			process.env.APPDATA,
			'Microsoft',
			'Internet Explorer',
			'Quick Launch',
			'User Pinned',
			'TaskBar',
		);
		shortcutPaths.push(path.join(pinnedDir, `${DESKTOP_APP_NAME}.lnk`));
	}
	for (const shortcutPath of shortcutPaths) {
		repairOneShortcut(shortcutPath, repairPaths);
	}
}

export function repairWindowsShortcuts(): void {
	if (process.platform !== 'win32') return;
	const repairPaths = getWindowsShortcutRepairPaths();
	if (!repairPaths) return;
	try {
		repairWindowsShortcutsSync(repairPaths);
	} catch (error) {
		console.warn('[WindowsShortcuts] Failed to repair Porch shortcuts', error);
	}
}
