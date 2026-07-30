// SPDX-License-Identifier: AGPL-3.0-or-later

import type {GuildResponse} from '@fluxer/schema/src/domains/guild/GuildResponseSchemas';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {createTestGuild} from '../../emoji/tests/EmojiTestUtils';
import {getInstanceConfigRepository} from '../../middleware/ServiceSingletons';
import type {ApiTestHarness} from '../../test/ApiTestHarness';
import {createBuilder, createBuilderWithoutAuth} from '../../test/TestRequestBuilder';
import {
	createAuthHarness,
	createTestAccount,
	createUniqueEmail,
	createUniqueUsername,
	loginAccount,
	loginUser,
} from './AuthTestUtils';

interface PendingRegistrationResponse {
	registration_pending_approval: true;
	user_id: string;
}

function registrationBody(prefix: string): Record<string, unknown> {
	return {
		email: createUniqueEmail(prefix),
		username: createUniqueUsername(prefix),
		global_name: 'Porch Hub Test',
		password: 'a-strong-password',
		date_of_birth: '2000-01-01',
		consent: true,
	};
}

async function createHub(harness: ApiTestHarness): Promise<{
	admin: Awaited<ReturnType<typeof createTestAccount>>;
	guild: GuildResponse;
}> {
	let admin = await createTestAccount(harness);
	await createBuilderWithoutAuth(harness)
		.post(`/test/users/${admin.userId}/acls`)
		.body({acls: ['*']})
		.expect(200)
		.execute();
	admin = await loginAccount(harness, admin);
	const guild = await createTestGuild(harness, admin.token, 'Porch Hub');
	return {admin, guild};
}

async function listGuilds(harness: ApiTestHarness, token: string): Promise<Array<GuildResponse>> {
	return createBuilder<Array<GuildResponse>>(harness, token).get('/users/@me/guilds').execute();
}

describe('Porch Hub enrollment', () => {
	let harness: ApiTestHarness;

	beforeAll(async () => {
		harness = await createAuthHarness();
	});

	beforeEach(async () => {
		await harness.reset();
	});

	afterAll(async () => {
		await harness?.shutdown();
	});

	it('enrolls a new account but respects a later voluntary leave', async () => {
		const {guild} = await createHub(harness);
		await getInstanceConfigRepository().setInstancePolicyConfig({
			porch_hub_enabled: true,
			porch_hub_guild_id: guild.id,
		});
		const member = await createTestAccount(harness);
		expect((await listGuilds(harness, member.token)).some((entry) => entry.id === guild.id)).toBe(true);

		await createBuilder(harness, member.token).delete(`/users/@me/guilds/${guild.id}`).expect(204).execute();
		const login = await loginUser(harness, {email: member.email, password: member.password});
		if ('mfa' in login) {
			throw new Error('Expected non-MFA login');
		}
		expect((await listGuilds(harness, login.token)).some((entry) => entry.id === guild.id)).toBe(false);
	});

	it('backfills eligible existing accounts when an admin enables the Hub', async () => {
		const {admin, guild} = await createHub(harness);
		const existing = await createTestAccount(harness);

		await createBuilder(harness, admin.token)
			.post('/admin/instance-config/update')
			.body({
				policy: {
					porch_hub_enabled: true,
					porch_hub_guild_id: guild.id,
				},
			})
			.execute();

		expect((await listGuilds(harness, existing.token)).some((entry) => entry.id === guild.id)).toBe(true);
	});

	it('enrolls an approval-mode account only after an admin approves it', async () => {
		const {admin, guild} = await createHub(harness);
		const repository = getInstanceConfigRepository();
		await repository.setInstancePolicyConfig({
			porch_hub_enabled: true,
			porch_hub_guild_id: guild.id,
		});
		await repository.setRegistrationConfig({mode: 'approval'});
		const body = registrationBody('porch_hub_approval');
		const registration = await createBuilderWithoutAuth<PendingRegistrationResponse>(harness)
			.post('/auth/register')
			.body(body)
			.execute();

		await createBuilder(harness, admin.token)
			.post('/admin/instance-config/pending-registrations/approve')
			.body({user_id: registration.user_id})
			.execute();
		const login = await loginUser(harness, {
			email: body.email as string,
			password: body.password as string,
		});
		if ('mfa' in login) {
			throw new Error('Expected non-MFA login');
		}
		expect((await listGuilds(harness, login.token)).some((entry) => entry.id === guild.id)).toBe(true);
	});
});
