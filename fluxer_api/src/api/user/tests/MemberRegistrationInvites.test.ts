// SPDX-License-Identifier: AGPL-3.0-or-later

import {APIErrorCodes} from '@fluxer/constants/src/ApiErrorCodes';
import type {GuildResponse} from '@fluxer/schema/src/domains/guild/GuildResponseSchemas';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {
	createAuthHarness,
	createTestAccount,
	createUniqueEmail,
	createUniqueUsername,
	loginAccount,
} from '../../auth/tests/AuthTestUtils';
import {getInstanceConfigRepository} from '../../middleware/ServiceSingletons';
import type {ApiTestHarness} from '../../test/ApiTestHarness';
import {createBuilder, createBuilderWithoutAuth} from '../../test/TestRequestBuilder';

interface MemberRegistrationInvite {
	id: string;
	label: string | null;
	created_at: string;
	expires_at: string;
	max_uses: 1;
	use_count: number;
	revoked_at: string | null;
	last_used_at: string | null;
	active: boolean;
	url: string;
}

interface RegistrationTokenResponse {
	user_id: string;
	token: string;
}

function registrationBody(prefix: string): Record<string, unknown> {
	return {
		email: createUniqueEmail(prefix),
		username: createUniqueUsername(prefix),
		global_name: 'Invited Friend',
		password: 'a-strong-password',
		date_of_birth: '2000-01-01',
		consent: true,
	};
}

describe('Member registration invites', () => {
	let harness: ApiTestHarness;

	beforeAll(async () => {
		harness = await createAuthHarness();
	});

	beforeEach(async () => {
		await harness.reset();
		await getInstanceConfigRepository().setRegistrationConfig({
			mode: 'open',
			admin_registration_urls_enabled: true,
		});
	});

	afterAll(async () => {
		await harness?.shutdown();
	});

	it('creates a seven-day one-person account link and returns the active link on repeated creation', async () => {
		const member = await loginAccount(harness, await createTestAccount(harness));
		await getInstanceConfigRepository().setRegistrationConfig({mode: 'closed'});
		const created = await createBuilder<MemberRegistrationInvite>(harness, member.token)
			.post('/users/@me/registration-invites')
			.body({label: 'Alex'})
			.execute();

		expect(created.label).toBe('Alex');
		expect(created.max_uses).toBe(1);
		expect(created.use_count).toBe(0);
		expect(created.active).toBe(true);
		expect(created.url).toContain(`/register?registration_url=${created.id}`);
		const lifetimeMs = Date.parse(created.expires_at) - Date.parse(created.created_at);
		expect(lifetimeMs).toBeGreaterThanOrEqual(7 * 24 * 60 * 60 * 1000 - 1000);
		expect(lifetimeMs).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);

		const repeated = await createBuilder<MemberRegistrationInvite>(harness, member.token)
			.post('/users/@me/registration-invites')
			.body({label: 'Someone else'})
			.execute();
		expect(repeated.id).toBe(created.id);

		const listed = await createBuilder<{invites: Array<MemberRegistrationInvite>}>(harness, member.token)
			.get('/users/@me/registration-invites')
			.execute();
		expect(listed.invites).toHaveLength(1);
		expect(listed.invites[0].id).toBe(created.id);
	});

	it('registers exactly one account without joining a community or group', async () => {
		const member = await loginAccount(harness, await createTestAccount(harness));
		const guild = await createBuilder<GuildResponse>(harness, member.token)
			.post('/guilds')
			.body({name: `SeparateInvite-${Date.now()}`})
			.execute();
		if (!guild.system_channel_id) {
			throw new Error('Guild creation did not return a system_channel_id');
		}
		const communityInvite = await createBuilder<{code: string}>(harness, member.token)
			.post(`/channels/${guild.system_channel_id}/invites`)
			.body({max_uses: 1, max_age: 3600, unique: true, temporary: false})
			.execute();
		await getInstanceConfigRepository().setRegistrationConfig({mode: 'closed'});
		const created = await createBuilder<MemberRegistrationInvite>(harness, member.token)
			.post('/users/@me/registration-invites')
			.body({label: 'Taylor'})
			.execute();

		const registration = await createBuilderWithoutAuth<RegistrationTokenResponse>(harness)
			.post('/auth/register')
			.body({
				...registrationBody('memberlink'),
				registration_url_code: created.id,
				invite_code: communityInvite.code,
			})
			.execute();
		const joinedGuilds = await createBuilder<Array<GuildResponse>>(harness, registration.token)
			.get('/users/@me/guilds')
			.execute();
		expect(joinedGuilds).toHaveLength(0);

		await createBuilderWithoutAuth(harness)
			.post('/auth/register')
			.body({...registrationBody('memberlinkreuse'), registration_url_code: created.id})
			.expect(400, APIErrorCodes.REGISTRATION_URL_INVALID)
			.execute();

		const listed = await createBuilder<{invites: Array<MemberRegistrationInvite>}>(harness, member.token)
			.get('/users/@me/registration-invites')
			.execute();
		expect(listed.invites[0]).toMatchObject({id: created.id, use_count: 1, active: false});
		expect(listed.invites[0].last_used_at).not.toBeNull();
	});

	it('only lets the creating member revoke a member registration link', async () => {
		const owner = await loginAccount(harness, await createTestAccount(harness));
		const otherMember = await loginAccount(harness, await createTestAccount(harness));
		await getInstanceConfigRepository().setRegistrationConfig({mode: 'closed'});
		const created = await createBuilder<MemberRegistrationInvite>(harness, owner.token)
			.post('/users/@me/registration-invites')
			.body({})
			.execute();

		await createBuilder(harness, otherMember.token)
			.delete(`/users/@me/registration-invites/${created.id}`)
			.expect(403, APIErrorCodes.MISSING_ACCESS)
			.execute();

		await createBuilder(harness, owner.token).delete(`/users/@me/registration-invites/${created.id}`).execute();
		const listed = await createBuilder<{invites: Array<MemberRegistrationInvite>}>(harness, owner.token)
			.get('/users/@me/registration-invites')
			.execute();
		expect(listed.invites[0]).toMatchObject({id: created.id, active: false});
		expect(listed.invites[0].revoked_at).not.toBeNull();
	});

	it('allows only one winner when the same link is used concurrently', async () => {
		const member = await loginAccount(harness, await createTestAccount(harness));
		await getInstanceConfigRepository().setRegistrationConfig({mode: 'closed'});
		const created = await createBuilder<MemberRegistrationInvite>(harness, member.token)
			.post('/users/@me/registration-invites')
			.body({label: 'Concurrent friend'})
			.execute();

		const attempts = await Promise.allSettled([
			createBuilderWithoutAuth<RegistrationTokenResponse>(harness)
				.post('/auth/register')
				.body({...registrationBody('concurrent_a'), registration_url_code: created.id})
				.execute(),
			createBuilderWithoutAuth<RegistrationTokenResponse>(harness)
				.post('/auth/register')
				.body({...registrationBody('concurrent_b'), registration_url_code: created.id})
				.execute(),
		]);

		expect(attempts.filter((attempt) => attempt.status === 'fulfilled')).toHaveLength(1);
		expect(attempts.filter((attempt) => attempt.status === 'rejected')).toHaveLength(1);
		const listed = await createBuilder<{invites: Array<MemberRegistrationInvite>}>(harness, member.token)
			.get('/users/@me/registration-invites')
			.execute();
		expect(listed.invites[0]).toMatchObject({id: created.id, use_count: 1, active: false});
	});
});
