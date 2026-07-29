// SPDX-License-Identifier: AGPL-3.0-or-later

interface CorsOriginConfig {
	endpoints: {
		webApp: string;
		marketing: string;
	};
	corsAllowedOrigins: Array<string>;
}

export function resolveCorsOrigins(config: CorsOriginConfig): Array<string> {
	return [...new Set([config.endpoints.webApp, config.endpoints.marketing, ...config.corsAllowedOrigins])];
}
