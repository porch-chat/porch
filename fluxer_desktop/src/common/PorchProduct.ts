// SPDX-License-Identifier: AGPL-3.0-or-later

import {BUILD_CHANNEL, type BuildChannel} from '@electron/common/BuildChannel';
import product from '../../porch-product.json';

export type PorchDesktopChannelConfig = {
	readonly appName: string;
	readonly defaultAppUrl: string;
	readonly protocol: string;
	readonly appId: string;
	readonly packageName: string;
	readonly linuxPackageName: string;
	readonly userDataDirectory: string;
	readonly windowsAppUserModelId: string;
	readonly windowsToastActivatorClsid: string;
};

export type PorchDesktopProductConfig = {
	readonly schemaVersion: number;
	readonly brandName: string;
	readonly companyName: string;
	readonly homepageUrl: string;
	readonly repositoryUrl: string;
	readonly issuesUrl: string;
	readonly downloadPageUrl: string;
	readonly updateBaseUrl: string;
	readonly copyright: string;
	readonly channels: Readonly<Record<BuildChannel, PorchDesktopChannelConfig>>;
};

export const PORCH_DESKTOP_PRODUCT = product satisfies PorchDesktopProductConfig;
export const PORCH_DESKTOP_CHANNEL = PORCH_DESKTOP_PRODUCT.channels[BUILD_CHANNEL];
