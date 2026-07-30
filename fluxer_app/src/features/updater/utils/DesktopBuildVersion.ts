// SPDX-License-Identifier: AGPL-3.0-or-later

export function formatDesktopBuildVersion(version: string | null, locale: string): string | null {
	if (!version) return null;
	const compactMatch = /^(\d{4})\.(\d{3,4})\.(\d{1,6})$/.exec(version);
	const expandedMatch = /^(\d{4})\.(\d{1,2})\.(\d{1,2})\.(\d{1,6})$/.exec(version);
	const year = Number(compactMatch?.[1] ?? expandedMatch?.[1]);
	const compactMonthDay = compactMatch?.[2];
	const month = Number(
		expandedMatch?.[2] ?? (compactMonthDay ? compactMonthDay.slice(0, compactMonthDay.length - 2) : undefined),
	);
	const day = Number(expandedMatch?.[3] ?? compactMonthDay?.slice(-2));
	const rawClock = compactMatch?.[3] ?? expandedMatch?.[4];
	if (
		!rawClock ||
		!Number.isInteger(year) ||
		!Number.isInteger(month) ||
		!Number.isInteger(day) ||
		month < 1 ||
		month > 12 ||
		day < 1 ||
		day > 31
	) {
		return version;
	}
	const clock = rawClock.padStart(6, '0');
	const hour = Number(clock.slice(0, 2));
	const minute = Number(clock.slice(2, 4));
	const second = Number(clock.slice(4, 6));
	if (hour > 23 || minute > 59 || second > 59) return version;
	const timestamp = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
	if (timestamp.getUTCFullYear() !== year || timestamp.getUTCMonth() !== month - 1 || timestamp.getUTCDate() !== day) {
		return version;
	}
	return `${new Intl.DateTimeFormat(locale, {
		dateStyle: 'medium',
		timeStyle: 'medium',
		timeZone: 'UTC',
	}).format(timestamp)} UTC · ${version}`;
}
