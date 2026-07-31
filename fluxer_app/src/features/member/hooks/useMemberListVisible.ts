// SPDX-License-Identifier: AGPL-3.0-or-later

import MemberList from '@app/features/member/state/MemberList';
import {useEffect, useState} from 'react';

const MIN_WIDTH_FOR_MEMBERS = 1024;
const MEMBER_LIST_WIDTH_QUERY = `(min-width: ${MIN_WIDTH_FOR_MEMBERS}px)`;

interface UseMemberListVisibleOptions {
	channelId?: string | null;
	defaultHiddenForChannel?: boolean;
}

export const useMemberListVisible = (options: UseMemberListVisibleOptions = {}): boolean => {
	const canFit = useCanFitMemberList();
	return canFit && MemberList.isMembersVisible(options);
};
export const useCanFitMemberList = (): boolean => {
	const [canFit, setCanFit] = useState(() => window.innerWidth >= MIN_WIDTH_FOR_MEMBERS);
	useEffect(() => {
		const mediaQuery = window.matchMedia(MEMBER_LIST_WIDTH_QUERY);
		const handleChange = (event: MediaQueryListEvent | MediaQueryList) => {
			setCanFit(event.matches);
		};
		handleChange(mediaQuery);
		if (typeof mediaQuery.addEventListener === 'function') {
			mediaQuery.addEventListener('change', handleChange);
			return () => mediaQuery.removeEventListener('change', handleChange);
		}
		mediaQuery.addListener(handleChange);
		return () => mediaQuery.removeListener(handleChange);
	}, []);
	return canFit;
};
