// SPDX-License-Identifier: AGPL-3.0-or-later

import {Routes} from '@app/app/Routes';
import type {UserData} from '@app/features/auth/state/AccountStorage';
import * as RouterUtils from '@app/features/navigation/utils/RouterUtils';
import SessionManager, {type Account, SessionExpiredError} from '@app/features/platform/state/AuthSession';
import {Logger} from '@app/features/platform/utils/AppLogger';
import {isInstalledPwa} from '@app/features/ui/utils/PwaUtils';
import {computed, makeAutoObservable} from 'mobx';

const logger = new Logger('AccountManager');

class AccountManager {
	constructor() {
		makeAutoObservable(
			this,
			{
				currentUserId: computed,
				currentAccount: computed,
				orderedAccounts: computed,
				canSwitchAccounts: computed,
				isSwitching: computed,
				isLoading: computed,
			},
			{autoBind: true},
		);
	}

	private shouldManagePushSubscriptions(): boolean {
		return isInstalledPwa();
	}

	get currentUserId(): string | null {
		return SessionManager.userId;
	}

	get accounts(): Map<string, Account> {
		return new Map(SessionManager.accounts.map((a) => [a.userId, a]));
	}

	get isSwitching(): boolean {
		return SessionManager.isSwitching;
	}

	get isLoading(): boolean {
		return SessionManager.isLoggingOut || SessionManager.isSwitching;
	}

	get currentAccount(): Account | null {
		return SessionManager.currentAccount;
	}

	get orderedAccounts(): Array<Account> {
		return SessionManager.accounts;
	}

	get canSwitchAccounts(): boolean {
		return SessionManager.canSwitchAccount();
	}

	getAllAccounts(): Array<Account> {
		return this.orderedAccounts;
	}

	async bootstrap(): Promise<void> {
		await SessionManager.initialize();
	}

	async stashCurrentAccount(): Promise<void> {
		await SessionManager.stashCurrentAccount();
	}

	markAccountAsInvalid(userId: string): void {
		SessionManager.markAccountInvalid(userId);
	}

	async generateTokenForAccount(userId: string): Promise<{
		token: string;
		userId: string;
	}> {
		await SessionManager.initialize();
		const account = SessionManager.accounts.find((a) => a.userId === userId);
		if (!account) {
			throw new Error(`No stored data found for account ${userId}`);
		}
		const ok = await SessionManager.validateToken(account.token, account.instance);
		if (!ok) {
			SessionManager.markAccountInvalid(userId);
			throw new SessionExpiredError();
		}
		return {token: account.token, userId};
	}

	private async leaveActiveVoiceChannel(context: 'account switch' | 'logout'): Promise<void> {
		try {
			const {default: MediaEngine} = await import('@app/features/voice/engine/MediaEngineFacade');
			await MediaEngine.disconnectFromVoiceChannel('user');
		} catch (err) {
			logger.warn(`Failed to leave active voice channel before ${context}`, err);
		}
	}

	async switchToAccount(userId: string, redirectPath: string | null = Routes.ME): Promise<void> {
		if (userId !== SessionManager.userId && SessionManager.canSwitchAccount() && this.accounts.has(userId)) {
			SessionManager.prepareForAccountTransition('account-switch');
		}
		if (this.shouldManagePushSubscriptions()) {
			const PushSubscriptionService = await import('@app/features/platform/push/PushSubscriptionService');
			await PushSubscriptionService.unregisterAllPushSubscriptions();
		}
		await this.leaveActiveVoiceChannel('account switch');
		await SessionManager.switchAccount(userId);
		const {default: GatewayConnection} = await import('@app/features/gateway/transport/GatewayConnection');
		GatewayConnection.startSession(SessionManager.token ?? undefined);
		if (redirectPath !== null) {
			RouterUtils.replaceWith(redirectPath);
		}
		if (this.shouldManagePushSubscriptions()) {
			void (async () => {
				const [NotificationUtils, PushSubscriptionService] = await Promise.all([
					import('@app/features/notification/utils/NotificationUtils'),
					import('@app/features/platform/push/PushSubscriptionService'),
				]);
				if (await NotificationUtils.isGranted()) {
					await PushSubscriptionService.registerPushSubscription();
				}
			})();
		}
	}

	async switchToNewAccount(
		userId: string,
		token: string,
		userData?: UserData,
		redirectPath: string | null = Routes.ME,
	): Promise<void> {
		const hadActiveSession = SessionManager.isAuthenticated;
		if (SessionManager.userId && SessionManager.userId !== userId) {
			SessionManager.prepareForAccountTransition('account-switch');
		}
		if (hadActiveSession) {
			await this.leaveActiveVoiceChannel('account switch');
		}
		await SessionManager.login(token, userId, userData);
		if (hadActiveSession) {
			const {default: GatewayConnection} = await import('@app/features/gateway/transport/GatewayConnection');
			GatewayConnection.startSession(token);
		}
		if (redirectPath !== null) {
			RouterUtils.replaceWith(redirectPath);
		}
		if (this.shouldManagePushSubscriptions()) {
			void (async () => {
				const [NotificationUtils, PushSubscriptionService] = await Promise.all([
					import('@app/features/notification/utils/NotificationUtils'),
					import('@app/features/platform/push/PushSubscriptionService'),
				]);
				if (await NotificationUtils.isGranted()) {
					await PushSubscriptionService.registerPushSubscription();
				}
			})();
		}
	}

	async removeStoredAccount(userId: string): Promise<void> {
		await SessionManager.removeAccount(userId);
	}

	updateAccountUserData(userId: string, userData: UserData): void {
		SessionManager.updateAccountUserData(userId, userData);
	}

	async logout(): Promise<void> {
		await this.leaveActiveVoiceChannel('logout');
		await SessionManager.logout();
		RouterUtils.replaceWith('/login');
	}
}

export default new AccountManager();
