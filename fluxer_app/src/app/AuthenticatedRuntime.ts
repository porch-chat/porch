// SPDX-License-Identifier: AGPL-3.0-or-later

import reactiveI18n from '@app/app/I18n';
import {registerAuthenticatedSessionRuntimeTarget} from '@app/features/platform/state/AuthenticatedSessionRuntimeBridge';
import {loadLazyModule} from '@app/features/platform/utils/LazyModuleLoader';

type AuthenticatedAppModule = typeof import('@app/app/App');

let runtimePromise: Promise<AuthenticatedAppModule> | null = null;

/** Loads and initializes state that is meaningful only for an authenticated client. */
export function loadAuthenticatedRuntime(): Promise<AuthenticatedAppModule> {
	if (runtimePromise) return runtimePromise;
	runtimePromise = (async () => {
		const {initializeNativeVoiceEngineSelectionForStartup} = await loadLazyModule(
			() => import('@app/features/voice/engine/native_voice_engine/NativeVoiceEngineSelection'),
		);
		// MediaEngine construction reads this selection, so preserve the original
		// ordering and initialize it before importing the full application graph.
		await initializeNativeVoiceEngineSelectionForStartup();
		const [
			appModule,
			{ChannelSettingsModal},
			{GuildSettingsModal},
			{UserSettingsModal},
			{registerBackgroundModalTypes},
			{default: GatewayConnection},
			{default: LayerManager},
			{default: Sudo},
			{default: SudoPrompt},
			{default: ChannelDisplayName},
			_geoIp,
			{default: Keybind},
			{default: NewDeviceMonitoring},
			{default: Notification},
			{default: QuickSwitcher},
			{default: StatusPage},
			{initializeEmojiParser},
		] = await Promise.all([
			loadLazyModule(() => import('@app/app/App')),
			loadLazyModule(() => import('@app/features/channel/components/modals/ChannelSettingsModal')),
			loadLazyModule(() => import('@app/features/guild/components/modals/GuildSettingsModal')),
			loadLazyModule(() => import('@app/features/user/components/modals/UserSettingsModal')),
			loadLazyModule(() => import('@app/features/ui/commands/ModalCommands')),
			loadLazyModule(() => import('@app/features/gateway/transport/GatewayConnection')),
			loadLazyModule(() => import('@app/features/ui/state/LayerManager')),
			loadLazyModule(() => import('@app/features/auth/state/AuthSudo')),
			loadLazyModule(() => import('@app/features/auth/state/SudoPrompt')),
			loadLazyModule(() => import('@app/features/channel/state/ChannelDisplayName')),
			loadLazyModule(() => import('@app/features/app/state/GeoIP')),
			loadLazyModule(() => import('@app/features/input/state/InputKeybind')),
			loadLazyModule(() => import('@app/features/auth/state/NewDeviceMonitoring')),
			loadLazyModule(() => import('@app/features/ui/state/Notification')),
			loadLazyModule(() => import('@app/features/search/state/QuickSwitcher')),
			loadLazyModule(() => import('@app/features/user/state/StatusPage')),
			loadLazyModule(() => import('@app/features/messaging/utils/markdown/EmojiProviderSetup')),
		]);
		registerBackgroundModalTypes([UserSettingsModal, GuildSettingsModal, ChannelSettingsModal]);
		registerAuthenticatedSessionRuntimeTarget({
			closeLayers: () => LayerManager.closeAll(),
			clearSudoToken: () => Sudo.clearToken(),
			sendInvisiblePresence: (reason) => GatewayConnection.sendInvisiblePresenceForCurrentSession(reason),
			cleanupGatewaySession: () => GatewayConnection.logout(),
		});
		Sudo.init();
		SudoPrompt.init();
		QuickSwitcher.setI18n(reactiveI18n);
		ChannelDisplayName.setI18n(reactiveI18n);
		Keybind.setI18n(reactiveI18n);
		NewDeviceMonitoring.setI18n(reactiveI18n);
		Notification.setI18n(reactiveI18n);
		void StatusPage.checkIncidents();
		StatusPage.startPolling();
		initializeEmojiParser();
		QuickSwitcher.preloadModal();
		return appModule;
	})().catch((error) => {
		runtimePromise = null;
		throw error;
	});
	return runtimePromise;
}
