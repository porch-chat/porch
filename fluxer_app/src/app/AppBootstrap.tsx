// SPDX-License-Identifier: AGPL-3.0-or-later

import {PublicApp} from '@app/app/PublicApp';
import Authentication from '@app/features/auth/state/Authentication';
import {observer} from 'mobx-react-lite';
import {lazy, Suspense} from 'react';

const AuthenticatedApp = lazy(async () => {
	const {loadAuthenticatedRuntime} = await import('@app/app/AuthenticatedRuntime');
	const {App} = await loadAuthenticatedRuntime();
	return {default: App};
});

export const AppBootstrap = observer(function AppBootstrap(): React.ReactElement {
	if (!Authentication.isAuthenticated) {
		return <PublicApp data-flx="app.bootstrap.public-app" />;
	}
	return (
		<Suspense fallback={null} data-flx="app.bootstrap.authenticated-suspense">
			<AuthenticatedApp data-flx="app.bootstrap.authenticated-app" />
		</Suspense>
	);
});
