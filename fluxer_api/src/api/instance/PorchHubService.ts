// SPDX-License-Identifier: AGPL-3.0-or-later

import {JoinSourceTypes} from '@fluxer/constants/src/GuildConstants';
import {createGuildID, type GuildID, type UserID} from '../BrandedTypes';
import type {GuildMemberService} from '../guild/services/GuildMemberService';
import {Logger} from '../Logger';
import {createRequestCache, type RequestCache} from '../middleware/RequestCacheMiddleware';
import type {User} from '../models/User';
import type {IUserRepository} from '../user/IUserRepository';
import {
	type InstanceConfigRepository,
	REGISTRATION_PENDING_APPROVAL_TRAIT,
	REGISTRATION_REJECTED_TRAIT,
} from './InstanceConfigRepository';

const BACKFILL_PAGE_SIZE = 100;
const PORCH_HUB_ENROLLED_TRAIT_PREFIX = 'porch_hub_enrolled:';

export type PorchHubEnrollmentOutcome = 'disabled' | 'already_enrolled' | 'enrolled' | 'ineligible' | 'failed';

export interface PorchHubBackfillResult {
	scanned: number;
	enrolled: number;
	already_enrolled: number;
	ineligible: number;
	failed: number;
}

export class PorchHubService {
	constructor(
		private readonly instanceConfigRepository: InstanceConfigRepository,
		private readonly guildMemberService: GuildMemberService,
		private readonly userRepository: IUserRepository,
	) {}

	async getHubCommunityId(): Promise<GuildID | null> {
		const policy = await this.instanceConfigRepository.getInstancePolicyConfig();
		if (!policy.porch_hub_enabled || !policy.porch_hub_guild_id) {
			return null;
		}
		try {
			return createGuildID(BigInt(policy.porch_hub_guild_id));
		} catch {
			return null;
		}
	}

	async ensureMember(
		userId: UserID,
		options: {sendJoinMessage?: boolean; requestCache?: RequestCache} = {},
	): Promise<PorchHubEnrollmentOutcome> {
		const guildId = await this.getHubCommunityId();
		if (!guildId) {
			return 'disabled';
		}
		const user = await this.userRepository.findUnique(userId);
		if (!user || !this.isEligibleUser(user)) {
			return 'ineligible';
		}
		const enrollmentTrait = this.getEnrollmentTrait(guildId);
		if (user.traits.has(enrollmentTrait)) {
			return 'already_enrolled';
		}
		try {
			await this.guildMemberService.addUserToGuild({
				userId,
				guildId,
				sendJoinMessage: options.sendJoinMessage ?? true,
				skipGuildLimitCheck: true,
				joinSourceType: JoinSourceTypes.ADMIN_FORCE_ADD,
				requestCache: options.requestCache ?? createRequestCache(),
			});
			await this.markEnrolled(userId, enrollmentTrait);
			Logger.info({userId: userId.toString(), guildId: guildId.toString()}, 'Enrolled user in Porch Hub');
			return 'enrolled';
		} catch (error) {
			Logger.warn(
				{userId: userId.toString(), guildId: guildId.toString(), error},
				'Failed to enroll user in Porch Hub',
			);
			return 'failed';
		}
	}

	async backfillExistingUsers(requestCache?: RequestCache): Promise<PorchHubBackfillResult> {
		const result: PorchHubBackfillResult = {
			scanned: 0,
			enrolled: 0,
			already_enrolled: 0,
			ineligible: 0,
			failed: 0,
		};
		if (!(await this.getHubCommunityId())) {
			return result;
		}
		let lastUserId: UserID | undefined;
		while (true) {
			const users = await this.userRepository.listAllUsersPaginated(BACKFILL_PAGE_SIZE, lastUserId);
			if (users.length === 0) {
				break;
			}
			for (const user of users) {
				result.scanned += 1;
				const outcome = await this.ensureMember(user.id, {
					sendJoinMessage: false,
					requestCache,
				});
				switch (outcome) {
					case 'enrolled':
						result.enrolled += 1;
						break;
					case 'already_enrolled':
						result.already_enrolled += 1;
						break;
					case 'failed':
						result.failed += 1;
						break;
					default:
						result.ineligible += 1;
						break;
				}
			}
			lastUserId = users.at(-1)?.id;
			if (users.length < BACKFILL_PAGE_SIZE || !lastUserId) {
				break;
			}
		}
		Logger.info(result, 'Completed Porch Hub member backfill');
		return result;
	}

	private isEligibleUser(user: User): boolean {
		if (user.isBot || user.isSystem || user.pendingDeletionAt) {
			return false;
		}
		if (user.tempBannedUntil && user.tempBannedUntil.getTime() > Date.now()) {
			return false;
		}
		const traits = user.traits;
		return !traits.has(REGISTRATION_PENDING_APPROVAL_TRAIT) && !traits.has(REGISTRATION_REJECTED_TRAIT);
	}

	private getEnrollmentTrait(guildId: GuildID): string {
		return `${PORCH_HUB_ENROLLED_TRAIT_PREFIX}${guildId.toString()}`;
	}

	private async markEnrolled(userId: UserID, enrollmentTrait: string): Promise<void> {
		const current = await this.userRepository.findUnique(userId);
		if (!current) {
			return;
		}
		const traits = current.traits;
		traits.add(enrollmentTrait);
		await this.userRepository.patchUpsert(userId, {traits}, current.toRow());
	}
}
