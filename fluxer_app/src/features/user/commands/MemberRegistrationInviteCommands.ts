// SPDX-License-Identifier: AGPL-3.0-or-later

import {Endpoints} from '@app/features/app/constants/Endpoints';
import {http} from '@app/features/platform/transport/RestTransport';
import type {
	MemberRegistrationInviteResponse,
	MemberRegistrationInvitesResponse,
} from '@fluxer/schema/src/domains/user/UserResponseSchemas';

export type MemberRegistrationInvite = MemberRegistrationInviteResponse;

export async function list(): Promise<Array<MemberRegistrationInvite>> {
	const response = await http.get<MemberRegistrationInvitesResponse>(Endpoints.USER_REGISTRATION_INVITES);
	return response.body.invites;
}

export async function create(label: string | null): Promise<MemberRegistrationInvite> {
	const response = await http.post<MemberRegistrationInvite>(Endpoints.USER_REGISTRATION_INVITES, {
		body: {label},
	});
	return response.body;
}

export async function revoke(registrationInviteId: string): Promise<void> {
	await http.delete(Endpoints.USER_REGISTRATION_INVITE(registrationInviteId));
}
