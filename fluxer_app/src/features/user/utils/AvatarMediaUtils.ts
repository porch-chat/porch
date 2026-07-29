// SPDX-License-Identifier: AGPL-3.0-or-later

import type {MediaProxyImageSize} from '@fluxer/constants/src/MediaProxyImageSizes';

const DEFAULT_AVATAR_PRIMARY_COLORS = [0x14b8a6, 0x2563eb, 0x7c3aed, 0xf97352, 0xf59e0b, 0x64748b];
export const DEFAULT_AVATAR_COUNT = BigInt(DEFAULT_AVATAR_PRIMARY_COLORS.length);
export const normalizeEndpoint = (endpoint: string): string => endpoint.replace(/\/$/, '');
export const parseAvatarHash = (value: string) => {
	const animated = value.startsWith('a_');
	const hash = animated ? value.slice(2) : value;
	return {animated, hash};
};
export const buildMediaUrl = ({
	endpoint,
	path,
	id,
	hash,
	size,
	animated,
}: {
	endpoint: string;
	path: string;
	id: string;
	hash: string;
	size: MediaProxyImageSize;
	animated?: boolean;
}) => {
	const normalizedEndpoint = normalizeEndpoint(endpoint);
	const query = animated ? `size=${size}&animated=true` : `size=${size}`;
	return `${normalizedEndpoint}/${path}/${id}/${hash}.webp?${query}`;
};
export const getDefaultAvatarIndex = (id: string): number => Number(BigInt(id) % DEFAULT_AVATAR_COUNT);
export const getDefaultAvatarPrimaryColor = (id: string): number =>
	DEFAULT_AVATAR_PRIMARY_COLORS[getDefaultAvatarIndex(id)];
