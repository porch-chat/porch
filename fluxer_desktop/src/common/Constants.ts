// SPDX-License-Identifier: AGPL-3.0-or-later

import {PORCH_DESKTOP_CHANNEL, PORCH_DESKTOP_PRODUCT} from '@electron/common/PorchProduct';

export const APP_PROTOCOL = PORCH_DESKTOP_CHANNEL.protocol;
export const STABLE_APP_URL = PORCH_DESKTOP_PRODUCT.channels.stable.defaultAppUrl;
export const CANARY_APP_URL = PORCH_DESKTOP_PRODUCT.channels.canary.defaultAppUrl;
export const DEFAULT_WINDOW_WIDTH = 1280;
export const DEFAULT_WINDOW_HEIGHT = 800;
export const MIN_WINDOW_WIDTH = 800;
export const MIN_WINDOW_HEIGHT = 600;
