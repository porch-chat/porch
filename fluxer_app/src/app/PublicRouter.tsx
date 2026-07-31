// SPDX-License-Identifier: AGPL-3.0-or-later

import {Routes} from '@app/app/Routes';
import {authRouteTree} from '@app/app/router/routes/AuthRoutes';
import {KeyboardModeListener} from '@app/features/app/components/layout/KeyboardModeListener';
import Authentication from '@app/features/auth/state/Authentication';
import {setPathQueryParams} from '@app/features/messaging/utils/MessagingUrlUtils';
import * as RouterUtils from '@app/features/navigation/utils/RouterUtils';
import {createRootRoute, createRoute} from '@app/features/platform/components/router/RouterBuilder';
import {createRouter} from '@app/features/platform/components/router/RouterCore';
import {Redirect} from '@app/features/platform/components/router/RouterTypes';
import {useEffect} from 'react';

function RedirectToLogin(): null {
	useEffect(() => {
		if (Authentication.isAuthenticated) return;
		const current = window.location.pathname + window.location.search + window.location.hash;
		RouterUtils.replaceWith(setPathQueryParams(Routes.LOGIN, {redirect_to: current}));
	}, []);
	return null;
}

const publicRootRoute = createRootRoute({
	layout: ({children}) => (
		<>
			<KeyboardModeListener data-flx="app.public-router.keyboard-mode-listener" />
			{children}
		</>
	),
});
const publicHomeRoute = createRoute({
	id: 'publicHome',
	path: '/',
	onEnter: () => new Redirect(Routes.LOGIN),
});
const publicNotFoundRoute = createRoute({
	id: '__notFound',
	path: '/__notfound',
	component: () => <RedirectToLogin data-flx="app.public-router.redirect-to-login" />,
});

const routes = publicRootRoute.addChildren([publicHomeRoute, publicNotFoundRoute, authRouteTree]).build();

export const publicRouter = createRouter({
	routes,
	history: RouterUtils.getHistory() ?? undefined,
	notFoundRouteId: '__notFound',
	scrollRestoration: 'top',
});
