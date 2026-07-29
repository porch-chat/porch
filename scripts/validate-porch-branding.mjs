// SPDX-License-Identifier: AGPL-3.0-or-later

import {createHash} from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

function read(relativePath) {
	return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function requireText(relativePath, expected) {
	const content = read(relativePath);
	if (!content.includes(expected)) {
		failures.push(`${relativePath} is missing ${JSON.stringify(expected)}`);
	}
}

function forbidText(relativePath, forbidden) {
	const content = read(relativePath);
	if (content.includes(forbidden)) {
		failures.push(`${relativePath} still contains ${JSON.stringify(forbidden)}`);
	}
}

function requirePng(relativePath, width, height) {
	const bytes = fs.readFileSync(path.join(root, relativePath));
	const signature = '89504e470d0a1a0a';
	if (bytes.subarray(0, 8).toString('hex') !== signature) {
		failures.push(`${relativePath} is not a PNG`);
		return;
	}
	const actualWidth = bytes.readUInt32BE(16);
	const actualHeight = bytes.readUInt32BE(20);
	if (actualWidth !== width || actualHeight !== height) {
		failures.push(`${relativePath} is ${actualWidth}x${actualHeight}; expected ${width}x${height}`);
	}
}

function requireSameBytes(leftPath, rightPath) {
	const left = fs.readFileSync(path.join(root, leftPath));
	const right = fs.readFileSync(path.join(root, rightPath));
	if (!left.equals(right)) {
		failures.push(`${leftPath} does not match ${rightPath}`);
	}
}

function requireSha256(relativePath, expected) {
	const bytes = fs.readFileSync(path.join(root, relativePath));
	const actual = createHash('sha256').update(bytes).digest('hex');
	if (actual !== expected) {
		failures.push(`${relativePath} has SHA-256 ${actual}; expected Porch asset ${expected}`);
	}
}

requireText('fluxer_app/index.html', '<title>Porch</title>');
requireText('fluxer_app/index.html', 'content="Porch"');
requireText('fluxer_app/index.html', 'content="#14B8A6"');
forbidText('fluxer_app/index.html', '<title>Fluxer</title>');
forbidText('fluxer_app/index.html', 'content="Fluxer"');
forbidText('fluxer_app/index.html', 'content="#4641D9"');

requireText('fluxer_app/scripts/build/rspack/static-files.mjs', "name: 'Porch'");
requireText('fluxer_app/scripts/build/rspack/static-files.mjs', "short_name: 'Porch'");
requireText('fluxer_app/scripts/build/rspack/static-files.mjs', "theme_color: '#14B8A6'");
forbidText('fluxer_app/scripts/build/rspack/static-files.mjs', "name: 'Fluxer'");
forbidText('fluxer_app/scripts/build/rspack/static-files.mjs', '#4641D9');

requireText('fluxer_app/src/features/app/state/RuntimeConfig.ts', "product_name: 'Porch'");
requireText('fluxer_app/src/features/app/config/ProductConstants.ts', "return 'Porch'");
requireText('fluxer_app/scripts/GenerateColorSystem.ts', 'brand: {hue: 174, saturation: 72');
forbidText('fluxer_app/scripts/GenerateColorSystem.ts', 'brand: {hue: 242, saturation: 70');
requireText(
	'fluxer_app/src/features/theme/variables/ThemeVariableManifest.ts',
	'"--brand-primary": "hsl(174, calc(72% * var(--saturation-factor)), 40%)"',
);
forbidText(
	'fluxer_app/src/features/theme/variables/ThemeVariableManifest.ts',
	'"--brand-primary": "hsl(242, calc(70% * var(--saturation-factor)), 55%)"',
);
requireText('fluxer_app/src/media/images/porch-pattern.svg', 'M31 97V51l33-24 33 24v46');
for (const relativePath of [
	'fluxer_app/src/features/app/components/layout/AuthLayout.tsx',
	'fluxer_app/src/features/invite/components/modals/InvitePagePreviewModal.tsx',
	'fluxer_app/src/features/invite/components/modals/InviteAcceptModalPreview.tsx',
	'fluxer_app/src/features/invite/components/modals/InviteAcceptModal.tsx',
]) {
	requireText(relativePath, 'porch-pattern.svg');
	forbidText(relativePath, 'i-like-food.svg');
}
requireText('fluxer_app/src/features/app/config/I18nDisplayConstants.ts', "EXAMPLE_INSTANCE_DOMAIN = 'api.porch.chat'");
forbidText('fluxer_app/src/features/app/config/I18nDisplayConstants.ts', "EXAMPLE_INSTANCE_DOMAIN = 'fluxer.app'");
for (const expected of [
	"SUPPORT_EMAIL = 'admin@porch.chat'",
	"I18N_EMAIL = 'admin@porch.chat'",
	"FLUXER_TAG_LABEL = 'PorchTag'",
	"API_DOCUMENTATION_DOMAIN = 'api.porch.chat'",
	'API_DOCUMENTATION_URL = `https://${API_DOCUMENTATION_DOMAIN}/api/openapi.json`',
	"PORCH_HOME_URL = 'https://porch.chat'",
	"SPLASH_IRC_SERVER = 'irc.porch.chat:6667'",
]) {
	requireText('fluxer_app/src/features/app/config/I18nDisplayConstants.ts', expected);
}
for (const forbidden of [
	'support@fluxer.app',
	'i18n@fluxer.app',
	"FLUXER_DOCS_DOMAIN = 'fluxer.dev'",
	"FLUXER_BLUESKY_HANDLE = '@fluxer.app'",
	'irc.fluxer.com',
]) {
	forbidText('fluxer_app/src/features/app/config/I18nDisplayConstants.ts', forbidden);
}
requireText(
	'fluxer_app/src/features/user/components/modals/tabs/applications_tab/index.tsx',
	'href={API_DOCUMENTATION_URL}',
);
forbidText('fluxer_app/src/features/user/components/modals/tabs/applications_tab/index.tsx', 'FLUXER_DOCS_URL');
for (const relativePath of [
	'fluxer_app/src/features/app/components/BootstrapErrorScreen.tsx',
	'fluxer_app/src/features/app/components/whats_new/WhatsNewModal.tsx',
	'fluxer_app/src/features/app/components/ConnectionIssuesLinks.tsx',
	'packages/constants/src/ExternalUrls.ts',
]) {
	forbidText(relativePath, 'fluxerstatus.com');
	forbidText(relativePath, 'bsky.app/profile/fluxer.app');
}
requireText('packages/constants/src/ExternalUrls.ts', "PRODUCT_HOME: 'https://porch.chat'");
requireText('packages/constants/src/ExternalUrls.ts', "SERVICE_STATUS: 'https://porch.chat'");
requireText('fluxer_app_proxy/src/csp.rs', '"https://challenges.cloudflare.com"');
for (const relativePath of ['fluxer_api/src/api/openapi/openapi.json', 'fluxer_admin/openapi-admin.json']) {
	requireText(relativePath, '"title": "Porch API"');
	requireText(relativePath, '"url": "https://api.porch.chat/api"');
	requireText(relativePath, '"name": "Porch", "email": "admin@porch.chat"');
	for (const forbidden of [
		'"title": "Fluxer API"',
		'API for Fluxer',
		'Fluxer Platform AB',
		'support@fluxer.app',
		'https://api.fluxer.app',
		'Fluxer Testers',
		'Fluxer tag of',
		'send Fluxer an SMS',
	]) {
		forbidText(relativePath, forbidden);
	}
}
requireText('packages/errors/src/i18n/ErrorI18n.ts', ".replaceAll('Fluxer', 'Porch')");
requireText('packages/errors/src/i18n/ErrorI18n.ts', ".replaceAll('support@fluxer.app', 'admin@porch.chat')");
forbidText('packages/errors/src/i18n/ErrorI18nMessages.ts', 'Fluxer API');
forbidText('packages/errors/src/i18n/ErrorI18nMessages.ts', 'support@fluxer.app');
for (const [relativePath, expected] of [
	['fluxer_api/src/api/push/ApnsPushService.ts', "?? 'Porch'"],
	['fluxer_api/src/api/system/PneumaticPostNotices.ts', "productName: 'Porch'"],
	['fluxer_api/src/api/user/repositories/account/crud/UserDataRepository.ts', "username: 'Porch'"],
	['fluxer_api/src/api/oauth/repositories/ApplicationRepository.ts', "name: 'Porch Admin'"],
	['fluxer_api/pkgs/captcha/src/providers/HttpCaptchaProvider.ts', 'PorchBot/1.0; +https://porch.chat'],
]) {
	requireText(relativePath, expected);
}
for (const relativePath of [
	'fluxer_app/src/features/auth/flow/AuthLoginLayout.tsx',
	'fluxer_app/src/features/auth/flow/AuthSsoPanel.tsx',
]) {
	forbidText(relativePath, 'AuthInstanceSelectorControl');
}
requireText('fluxer_app/src/features/user/components/popouts/UserProfileBadges.tsx', 'url: Routes.marketingHome()');
forbidText('fluxer_app/src/features/user/components/popouts/UserProfileBadges.tsx', 'url: Routes.careers()');

for (const component of ['FluxerIcon.tsx', 'FluxerLogo.tsx']) {
	const relativePath = `fluxer_app/src/features/ui/components/icons/${component}`;
	requireText(relativePath, 'porch-icon.svg?react');
	forbidText(relativePath, '@app/media/images/fluxer-logo');
	forbidText(relativePath, 'M121.272 233.143');
}
requireText('fluxer_app/src/features/ui/components/icons/FluxerSymbol.tsx', 'porch-symbol.svg?react');
forbidText('fluxer_app/src/features/ui/components/icons/FluxerSymbol.tsx', 'M121.272 233.143');
requireText('fluxer_app/src/features/ui/components/icons/FluxerWordmark.tsx', '{productName}');
forbidText('fluxer_app/src/features/ui/components/icons/FluxerWordmark.tsx', 'fluxer-wordmark.svg?react');
forbidText(
	'fluxer_app/src/features/ui/components/icons/FluxerWordmark.tsx',
	'fluxer-logo-wordmark-monochrome.svg?react',
);

for (const relativePath of [
	'fluxer_app/src/media/images/porch-icon.svg',
	'fluxer_static/web/porch-icon.svg',
	'fluxer_desktop/build_resources/porch/porch-chat-icon.svg',
]) {
	requireText(relativePath, 'M31 97V51l33-24 33 24v46');
	requireText(relativePath, '#14B8A6');
	forbidText(relativePath, 'M121.272 233.143');
}

for (const [name, width, height] of [
	['android-chrome-192x192.png', 192, 192],
	['android-chrome-512x512.png', 512, 512],
	['apple-touch-icon.png', 180, 180],
	['favicon-16x16.png', 16, 16],
	['favicon-32x32.png', 32, 32],
	['mstile-150x150.png', 150, 150],
	['og-image-default.png', 1200, 630],
]) {
	requirePng(`fluxer_static/web/${name}`, width, height);
}

for (const [name, sha256] of [
	['0.png', '15a26943b61d4ae4f592de40988cf6d95e83caf303e424db1171b35ad32877a5'],
	['1.png', 'ffb179ebbebef22a41c0bd0412b63aa286bb90becaaddf1f1c858f3e27276cc0'],
	['2.png', '0662f7cb01eb39a4b6e9a41d5ee0dd97068b2af70d0d32c5510ae15def326ce6'],
	['3.png', 'b78e22ae7ac6cd13812c33c72e48c1a2b60a947496ece73244638dcde6cdb49b'],
	['4.png', 'fd35dbb6320402366949074b105b021a4d87360aafed6c3e4d6cdf98f8e7968b'],
	['5.png', '909f71fd6b07f267b2d414080f36404428a6b4722489fe6ad08b5eb4942875c6'],
]) {
	requirePng(`fluxer_static/avatars/${name}`, 512, 512);
	requireSha256(`fluxer_static/avatars/${name}`, sha256);
}
requireText('fluxer_static/avatars/NOTICE.md', 'Porch-branded assets');
requireText(
	'fluxer_app/src/features/user/utils/AvatarMediaUtils.ts',
	'0x14b8a6, 0x2563eb, 0x7c3aed, 0xf97352, 0xf59e0b, 0x64748b',
);
forbidText('fluxer_app/src/features/user/utils/AvatarMediaUtils.ts', '0x4641d9');

requireText('fluxer_desktop/electron-builder.config.cjs', `icon: \`build_resources/\${iconDir}/icon.png\``);
forbidText(
	'fluxer_desktop/electron-builder.config.cjs',
	`icon: \`build_resources/\${iconDir}/_compiled/AppIcon.icns\``,
);

for (const channel of ['stable', 'canary']) {
	const iconRoot = `fluxer_desktop/build_resources/icons-${channel}`;
	requirePng(`${iconRoot}/icon.png`, 1024, 1024);
	requirePng(`${iconRoot}/FluxerTrayTemplate.png`, 16, 16);
	requirePng(`${iconRoot}/FluxerTrayTemplate@2x.png`, 32, 32);
	requireText(`${iconRoot}/AppIcon.icon/Assets/Vector.svg`, 'M31 97V51l33-24 33 24v46');
	forbidText(`${iconRoot}/AppIcon.icon/Assets/Vector.svg`, 'M46.3631 210.286');
	requireSameBytes(`${iconRoot}/icon.ico`, `fluxer_static/web/icons/desktop/${channel}/icon.ico`);
}

for (const relativePath of [
	'fluxer_desktop/packaging/linux/app.fluxer.Fluxer.desktop',
	'fluxer_desktop/packaging/linux/app.fluxer.Fluxer.metainfo.xml',
	'fluxer_desktop/packaging/linux/app.fluxer.FluxerCanary.desktop',
	'fluxer_desktop/packaging/linux/app.fluxer.FluxerCanary.metainfo.xml',
]) {
	requireText(relativePath, 'Porch');
	forbidText(relativePath, 'Name=Fluxer');
	forbidText(relativePath, '<name>Fluxer</name>');
	forbidText(relativePath, 'fluxerstatic.com');
	forbidText(relativePath, 'https://fluxer.app');
}

for (const relativePath of [
	'fluxer_static/marketing/branding/logo-black.svg',
	'fluxer_static/marketing/branding/logo-color.svg',
	'fluxer_static/marketing/branding/logo-white.svg',
	'fluxer_static/marketing/branding/symbol-black.svg',
	'fluxer_static/marketing/branding/symbol-color.svg',
	'fluxer_static/marketing/branding/symbol-white.svg',
]) {
	requireText(relativePath, 'M31 97V51l33-24 33 24v46');
	forbidText(relativePath, 'M187.53 266.057');
	forbidText(relativePath, '#4641D9');
}

if (fs.existsSync(path.join(root, 'fluxer_app/dist/manifest.json'))) {
	requireText('fluxer_app/dist/manifest.json', '"name": "Porch"');
	requireText('fluxer_app/dist/manifest.json', '"theme_color": "#14B8A6"');
	requireText('fluxer_app/dist/index.html', '<title>Porch</title>');
	forbidText('fluxer_app/dist/index.html', '<title>Fluxer</title>');
	for (const signature of ['M121.272 233.143', 'M46.3631 210.286', 'fluxer-logo-color']) {
		for (const entry of fs.readdirSync(path.join(root, 'fluxer_app/dist/assets'))) {
			if (!entry.endsWith('.js')) continue;
			forbidText(`fluxer_app/dist/assets/${entry}`, signature);
		}
	}
}

if (failures.length > 0) {
	for (const failure of failures) {
		console.error(`branding error: ${failure}`);
	}
	process.exit(1);
}

console.log('Porch branding contract passed.');
