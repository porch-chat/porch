// SPDX-License-Identifier: AGPL-3.0-or-later

import SessionManager from '@app/features/platform/state/AuthSession';
import {http} from '@app/features/platform/transport/RestTransport';

export function setupHttp(): void {
	http.installAuth(() => SessionManager.token);
}
