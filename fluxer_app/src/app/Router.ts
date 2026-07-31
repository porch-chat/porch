// SPDX-License-Identifier: AGPL-3.0-or-later

import {buildRoutes} from '@app/app/router/routes/RouterRoutes';
import Navigation from '@app/features/navigation/state/Navigation';
import NavigationSideEffects from '@app/features/navigation/state/NavigationSideEffects';
import {installAuthenticatedChannelNavigationInterceptor} from '@app/features/navigation/utils/AuthenticatedChannelNavigationInterceptor';
import * as RouterUtils from '@app/features/navigation/utils/RouterUtils';
import {createRouter} from '@app/features/platform/components/router/RouterCore';

const routes = buildRoutes();
installAuthenticatedChannelNavigationInterceptor();
export const router = createRouter({
	routes,
	history: RouterUtils.getHistory() ?? undefined,
	notFoundRouteId: '__notFound',
	scrollRestoration: 'top',
});

Navigation.initialize(router);

NavigationSideEffects.initialize();
