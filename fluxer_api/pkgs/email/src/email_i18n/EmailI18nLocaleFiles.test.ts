// SPDX-License-Identifier: AGPL-3.0-or-later

import {getEmailTemplate, resetEmailI18n} from '@pkgs/email/src/email_i18n/EmailI18n';
import {EMAIL_I18N_LOCALE_MESSAGES} from '@pkgs/email/src/email_i18n/EmailI18nLocales';
import {EMAIL_I18N_MESSAGES} from '@pkgs/email/src/email_i18n/EmailI18nMessages';
import {afterEach, describe, expect, it} from 'vitest';

const LOCALES = Object.keys(EMAIL_I18N_LOCALE_MESSAGES) as Array<keyof typeof EMAIL_I18N_LOCALE_MESSAGES>;

describe('EmailI18n locale files', () => {
	afterEach(() => {
		resetEmailI18n();
	});
	it.each(LOCALES)('%s loads without module errors', (locale) => {
		const template = getEmailTemplate('email_verification', locale, {
			username: 'testuser',
			verifyUrl: 'https://example.com/verify',
		});
		expect(template.ok).toBe(true);
	});
	it.each(LOCALES)('%s has the same translation keys as the source catalog', (locale) => {
		const messagesKeys = Object.keys(EMAIL_I18N_MESSAGES).sort();
		const localeKeys = Object.keys(EMAIL_I18N_LOCALE_MESSAGES[locale]).sort();
		expect(localeKeys).toEqual(messagesKeys);
	});
	it('uses Porch branding for password reset email content', () => {
		const template = getEmailTemplate('password_reset', 'en-US', {
			username: 'testuser',
			resetUrl: 'https://app.porch.chat/reset#token=redacted',
		});
		expect(template.ok).toBe(true);
		if (!template.ok) return;
		expect(template.value.subject).toBe('Reset your Porch password');
		expect(template.value.body).toContain('Porch password reset');
		expect(template.value.body).toContain('– Porch Team');
		expect(template.value.body).not.toContain('Fluxer');
	});
	it('uses Porch contact addresses in safety email content', () => {
		const template = getEmailTemplate('report_resolved', 'en-US', {
			username: 'testuser',
			reportId: '123',
			publicComment: '',
			hasComment: 'no',
		});
		expect(template.ok).toBe(true);
		if (!template.ok) return;
		expect(template.value.body).toContain('admin@porch.chat');
		expect(template.value.body).not.toContain('@fluxer.app');
		expect(template.value.body).not.toContain('Fluxer');
	});
	it('accepts runtime instance branding', () => {
		const template = getEmailTemplate(
			'password_reset',
			'en-US',
			{
				username: 'testuser',
				resetUrl: 'https://example.com/reset',
			},
			{
				product_name: 'Example Chat',
				appeals_email: 'appeals@example.com',
				safety_email: 'safety@example.com',
			},
		);
		expect(template.ok).toBe(true);
		if (!template.ok) return;
		expect(template.value.subject).toBe('Reset your Example Chat password');
		expect(template.value.body).toContain('– Example Chat Team');
	});
});
