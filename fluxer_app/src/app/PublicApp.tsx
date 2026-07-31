// SPDX-License-Identifier: AGPL-3.0-or-later

import styles from '@app/app/App.module.css';
import {publicRouter} from '@app/app/PublicRouter';
import {focusMainContent} from '@app/app/SkipLinkUtils';
import {NekoSprite} from '@app/features/accessibility/components/NekoSprite';
import Accessibility from '@app/features/accessibility/state/Accessibility';
import {NativeTitlebar} from '@app/features/app/components/layout/NativeTitlebar';
import {NativeTrafficLightsBackdrop} from '@app/features/app/components/layout/NativeTrafficLightsBackdrop';
import {PublicOverlays} from '@app/features/app/components/layout/PublicOverlays';
import {useDesktopAllowTransparency} from '@app/features/app/hooks/useDesktopAllowTransparency';
import {useDocumentClassToggle} from '@app/features/app/hooks/useDocumentClassToggle';
import {useInertBackground} from '@app/features/app/hooks/useInertBackground';
import {useIsRootDocumentFullscreen} from '@app/features/app/hooks/useIsRootDocumentFullscreen';
import {useNativePlatform} from '@app/features/app/hooks/useNativePlatform';
import {usePlatformClasses} from '@app/features/app/hooks/usePlatformClasses';
import {useTabKeyFocusGuard} from '@app/features/app/hooks/useTabKeyFocusGuard';
import {type LayoutVariant, LayoutVariantProvider} from '@app/features/app/state/LayoutVariantContext';
import {Outlet, RouterProvider} from '@app/features/platform/components/router/RouterReact';
import {useCustomThemeStyle} from '@app/features/theme/hooks/useCustomThemeStyle';
import {useThemeCssVariables} from '@app/features/theme/hooks/useThemeCssVariables';
import Theme from '@app/features/theme/state/Theme';
import ThemeLibrary from '@app/features/theme/state/ThemeLibrary';
import {SVGMasks} from '@app/features/ui/components/SVGMasks';
import FocusRingScope from '@app/features/ui/focus_ring/FocusRingScope';
import MobileLayout from '@app/features/ui/state/MobileLayout';
import Modal from '@app/features/ui/state/Modal';
import {attachExternalLinkInterceptor, isDesktop} from '@app/features/ui/utils/NativeUtils';
import {
	FIRST_CLICK_PASSTHROUGH_WHEN_UNFOCUSED_CLASS,
	UNFOCUSED_FULLY_INTERACTIVE_CLASS,
} from '@app/features/ui/utils/WindowFocusInteractionGuard';
import {useNativeTitleBar} from '@app/features/window/hooks/useNativeTitleBar';
import {usePublicWindowEventListeners} from '@app/features/window/hooks/usePublicWindowEventListeners';
import {useStopFlashFrameOnFocus} from '@app/features/window/hooks/useStopFlashFrameOnFocus';
import {i18n} from '@lingui/core';
import {msg} from '@lingui/core/macro';
import {I18nProvider} from '@lingui/react';
import {useLingui} from '@lingui/react/macro';
import {IconContext} from '@phosphor-icons/react';
import {observer} from 'mobx-react-lite';
import {useEffect, useMemo, useRef, useState} from 'react';

const SKIP_TO_CONTENT_DESCRIPTOR = msg({
	message: 'Skip to content',
	comment: 'Accessible skip-link label for keyboard users.',
});

const PublicAppShell = observer(function PublicAppShell(): React.ReactElement {
	const {i18n} = useLingui();
	const reducedMotion = Accessibility.useReducedMotion;
	const stayInteractiveWhenUnfocused = Accessibility.stayInteractiveWhenUnfocused;
	const firstClickPassThroughWhenUnfocused = Accessibility.firstClickPassThroughWhenUnfocused;
	const {platform, isNative, isMacOS} = useNativePlatform();
	const useSystemTitleBar = useNativeTitleBar();
	const isRootDocumentFullscreen = useIsRootDocumentFullscreen();
	const [layoutVariant, setLayoutVariant] = useState<LayoutVariant>('auth');
	const layoutVariantContextValue = useMemo(
		() => ({variant: layoutVariant, setVariant: setLayoutVariant}),
		[layoutVariant],
	);
	const ringsContainerRef = useRef<HTMLDivElement>(null);
	const overlayScopeRef = useRef<HTMLDivElement>(null);
	const handleSkipLinkFocus = useTabKeyFocusGuard();
	useInertBackground(ringsContainerRef, Modal.hasModalOpen());
	useDocumentClassToggle('reduced-motion', reducedMotion);
	useDocumentClassToggle('mobile-layout', MobileLayout.platformMobileDetected || MobileLayout.enabled);
	useDocumentClassToggle(UNFOCUSED_FULLY_INTERACTIVE_CLASS, stayInteractiveWhenUnfocused);
	useDocumentClassToggle(FIRST_CLICK_PASSTHROUGH_WHEN_UNFOCUSED_CLASS, firstClickPassThroughWhenUnfocused);
	useDesktopAllowTransparency(isNative);
	usePublicWindowEventListeners({preventDocumentScroll: !isNative});
	usePlatformClasses(platform, isNative);
	useThemeCssVariables({
		effectiveTheme: Theme.effectiveTheme,
		saturationFactor: Accessibility.saturationFactor,
		alwaysUnderlineLinks: Accessibility.alwaysUnderlineLinks,
		dimStrikethroughText: Accessibility.dimStrikethroughText,
		enableTextSelection: Accessibility.textSelectionEnabled,
		fontSize: Accessibility.fontSize,
		messageGutter: Accessibility.messageGutter,
		messageGroupSpacing: Accessibility.getMessageGroupSpacingValue(false),
		hdrDisplayMode: Accessibility.hdrDisplayMode,
	});
	useCustomThemeStyle({
		enabledThemeCss: ThemeLibrary.activeThemeCss,
		customThemeCss: Accessibility.customThemeCss,
		themeLibraryAssets: ThemeLibrary.assets,
		themeLibraryLocalFiles: ThemeLibrary.localFiles,
		themeLibraryRevision: ThemeLibrary.revision,
	});
	return (
		<LayoutVariantProvider value={layoutVariantContextValue} data-flx="app.public-app.layout-variant-provider">
			<SVGMasks data-flx="app.public-app.svg-masks" />
			<div ref={ringsContainerRef} className={styles.appContainer} data-flx="app.public-app.app-container">
				<FocusRingScope containerRef={ringsContainerRef} data-flx="app.public-app.focus-ring-scope">
					<button
						type="button"
						className={styles.skipLink}
						onFocus={handleSkipLinkFocus}
						onClick={focusMainContent}
						data-flx="app.public-app.skip-link"
					>
						{i18n._(SKIP_TO_CONTENT_DESCRIPTOR)}
					</button>
					<NativeTrafficLightsBackdrop variant={layoutVariant} data-flx="app.public-app.traffic-lights" />
					{isNative && !isMacOS && !useSystemTitleBar && !isRootDocumentFullscreen && (
						<NativeTitlebar platform={platform} data-flx="app.public-app.native-titlebar" />
					)}
					<Outlet />
				</FocusRingScope>
			</div>
			<div ref={overlayScopeRef} className={styles.overlayScope} data-flx="app.public-app.overlay-scope">
				<NekoSprite data-flx="app.public-app.neko-sprite" />
				<PublicOverlays data-flx="app.public-app.public-overlays" />
			</div>
		</LayoutVariantProvider>
	);
});

export function PublicApp(): React.ReactElement {
	useEffect(() => {
		const detach = attachExternalLinkInterceptor();
		return () => detach?.();
	}, []);
	useEffect(() => {
		if (!isDesktop()) return;
		void import('@app/features/platform/utils/Autostart').then(({ensureAutostartDefaultEnabled}) =>
			ensureAutostartDefaultEnabled(),
		);
	}, []);
	useStopFlashFrameOnFocus();
	return (
		<I18nProvider i18n={i18n}>
			<IconContext.Provider value={{color: 'currentColor', weight: 'fill'}}>
				<RouterProvider router={publicRouter}>
					<PublicAppShell data-flx="app.public-app.shell" />
				</RouterProvider>
			</IconContext.Provider>
		</I18nProvider>
	);
}
