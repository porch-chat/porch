// SPDX-License-Identifier: AGPL-3.0-or-later

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const velopackPackage = require('velopack/package.json');
const {VelopackApp} = require('velopack');

assert.equal(velopackPackage.version, '1.2.0', 'The runtime smoke must track the pinned stable Velopack release.');

const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '', 10);
assert.ok(
	nodeMajor >= 20 && nodeMajor < 26,
	`The packaged Electron Node ${process.versions.node} is outside Velopack ${velopackPackage.version}'s supported >=20 <26 range.`,
);

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'porch-velopack-runtime-'));
try {
	const current = path.join(root, 'current');
	const packages = path.join(root, 'packages');
	const updateExe = path.join(root, 'Update.exe');
	const manifest = path.join(current, 'sq.version');
	fs.mkdirSync(current, {recursive: true});
	fs.mkdirSync(packages, {recursive: true});
	fs.writeFileSync(updateExe, '');
	fs.writeFileSync(
		manifest,
		`<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://schemas.microsoft.com/packaging/2010/07/nuspec.xsd">
<metadata>
<id>porch_desktop_canary</id>
<title>Porch Canary</title>
<description>Porch Canary</description>
<authors>Porch</authors>
<version>1.0.0</version>
<channel>win</channel>
<mainExe>Porch Canary.exe</mainExe>
<os>win</os>
<rid>win-x64</rid>
<machineArchitecture>x64</machineArchitecture>
</metadata>
</package>
`,
	);

	VelopackApp.build()
		.onBeforeUninstallFastCallback(() => {})
		.setLocator({
			RootAppDir: root,
			UpdateExePath: updateExe,
			PackagesDir: packages,
			ManifestPath: manifest,
			CurrentBinaryDir: current,
			IsPortable: false,
		})
		.setAutoApplyOnStartup(false)
		.run();

	console.log(
		`Velopack ${velopackPackage.version} installed-mode runtime smoke passed under Electron Node ${process.versions.node}.`,
	);
} finally {
	fs.rmSync(root, {recursive: true, force: true});
}
