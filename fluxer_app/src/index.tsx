// SPDX-License-Identifier: AGPL-3.0-or-later

import {installBrowserStorageAccessProtection} from '@app/features/platform/state/ProtectedWebStorage';
import 'urlpattern-polyfill';
import '@app/app/globals.css';
import '@app/features/theme/styles/generated/color-system.css';
import '@app/features/theme/styles/generated/message-layout.css';
import '@app/features/theme/styles/preflight.css';
import {bootstrapSyntheticHistory} from '@app/app/HistoryBootstrap';
import reactiveI18n, {initI18n} from '@app/app/I18n';
import {Routes} from '@app/app/Routes';
import {AppErrorBoundary} from '@app/features/app/components/AppErrorBoundary';
import {BootstrapErrorScreen} from '@app/features/app/components/BootstrapErrorScreen';
import {ErrorFallback} from '@app/features/app/components/ErrorFallback';
import {installSelfXssNotice} from '@app/features/devtools/utils/SelfXssNotice';
import {installLocaleSwitchWatchdog} from '@app/features/i18n/utils/LocaleSwitchWatchdog';
import {installScrollRestoration} from '@app/features/platform/components/router/ScrollRestoration';
import {Logger} from '@app/features/platform/utils/AppLogger';
import {
	getFormattedClientInfo,
	getFormattedClientInfoSync,
	installFluxerConfigDebugApi,
	preloadClientInfo,
} from '@app/features/platform/utils/ClientInfo';
import {loadLazyModule} from '@app/features/platform/utils/LazyModuleLoader';
import {i18n} from '@lingui/core';
import {I18nProvider} from '@lingui/react';
import {configure} from 'mobx';
import type {ReactNode} from 'react';
import ReactDOM from 'react-dom/client';

type AuthenticationCommandsModule = typeof import('@app/features/auth/commands/AuthenticationCommands');
type NativeUtilsModule = typeof import('@app/features/ui/utils/NativeUtils');

const logger = new Logger('index');

configure({disableErrorBoundaries: true, enforceActions: 'observed'});

installBrowserStorageAccessProtection();

if (typeof window !== 'undefined' && window.history) {
	bootstrapSyntheticHistory();
	installScrollRestoration();
}

installFluxerConfigDebugApi();

function createRoot(): ReactDOM.Root {
	const container = document.getElementById('root');
	if (!container) {
		throw new Error('Missing #root element');
	}
	return ReactDOM.createRoot(container);
}

function mountRoot(content: ReactNode, dataFlxScope: string): void {
	createRoot().render(
		<AppErrorBoundary
			fallback={(error) => (
				<I18nProvider i18n={i18n}>
					<ErrorFallback error={error ?? undefined} data-flx={`${dataFlxScope}.error-fallback`} />
				</I18nProvider>
			)}
			data-flx={`${dataFlxScope}.app-error-boundary`}
		>
			{content}
		</AppErrorBoundary>,
	);
}

async function logClientInfo(): Promise<void> {
	try {
		const info = await getFormattedClientInfo();
		logger.info(`[CLIENT INFO] ${info}`);
	} catch (error) {
		logger.warn('Failed to load full client info:', error);
		logger.info(`[CLIENT INFO] ${getFormattedClientInfoSync()}`);
	}
}

async function resumePendingDesktopHandoffLogin(
	getElectronAPI: NativeUtilsModule['getElectronAPI'],
	authenticationCommands: AuthenticationCommandsModule,
): Promise<void> {
	const electronApi = getElectronAPI();
	if (!electronApi || typeof electronApi.consumeDesktopHandoffCode !== 'function') {
		return;
	}
	let handoffCode: string | null = null;
	try {
		handoffCode = await electronApi.consumeDesktopHandoffCode();
	} catch (error) {
		logger.warn('Failed to consume pending desktop handoff code:', error);
		return;
	}
	if (!handoffCode) {
		return;
	}
	try {
		const result = await authenticationCommands.pollDesktopHandoffStatus(handoffCode);
		if (result.status === 'completed' && result.token && result.user_id) {
			const userData = authenticationCommands.authResponseUserToUserData(result.user);
			await authenticationCommands.completeLogin({
				token: result.token,
				userId: result.user_id,
				...(userData ? {userData} : {}),
			});
		} else {
			logger.warn('Pending desktop handoff not completed:', {status: result.status});
		}
	} catch (error) {
		logger.warn('Failed to resume pending desktop handoff login:', error);
	}
}

async function bootstrapThemeStudio(): Promise<void> {
	const {ThemeStudioStandaloneApp} = await loadLazyModule(
		() => import('@app/features/theme_studio/ThemeStudioStandaloneApp'),
	);
	mountRoot(
		<I18nProvider i18n={i18n}>
			<ThemeStudioStandaloneApp data-flx="index.render-theme-studio.theme-studio-standalone-app" />
		</I18nProvider>,
		'index.render-theme-studio',
	);
}

async function bootstrapApp(): Promise<void> {
	const [
		{AppBootstrap},
		authenticationCommands,
		{setupHttp},
		{default: CaptchaInterceptor},
		{registerServiceWorker},
		{default: AccountManager},
		_runtimeConfig,
		{getElectronAPI},
	] = await Promise.all([
		loadLazyModule(() => import('@app/app/AppBootstrap')),
		loadLazyModule(() => import('@app/features/auth/commands/AuthenticationCommands')),
		loadLazyModule(() => import('@app/app/SetupHttp')),
		loadLazyModule(() => import('@app/features/auth/components/CaptchaInterceptor')),
		loadLazyModule(() => import('@app/features/platform/service_worker/Register')),
		loadLazyModule(() => import('@app/features/auth/state/AccountManager')),
		loadLazyModule(() => import('@app/features/app/state/RuntimeConfig')),
		loadLazyModule(() => import('@app/features/ui/utils/NativeUtils')),
	]);
	void preloadClientInfo();
	CaptchaInterceptor.setI18n(reactiveI18n);
	await AccountManager.bootstrap();
	setupHttp();
	await resumePendingDesktopHandoffLogin(getElectronAPI, authenticationCommands);
	mountRoot(<AppBootstrap data-flx="index.bootstrap.app" />, 'index.bootstrap');
	registerServiceWorker();
}

async function bootstrap(): Promise<void> {
	await initI18n();
	installLocaleSwitchWatchdog();
	installSelfXssNotice();
	void logClientInfo();
	if (window.location.pathname === Routes.THEME_STUDIO) {
		await bootstrapThemeStudio();
	} else {
		await bootstrapApp();
	}
}

bootstrap().catch((error: unknown) => {
	const normalized = error instanceof Error ? error : new Error(String(error));
	logger.error('Failed to bootstrap app:', normalized);
	createRoot().render(
		<I18nProvider i18n={i18n}>
			<BootstrapErrorScreen error={normalized} data-flx="index.bootstrap-error-screen" />
		</I18nProvider>,
	);
});
