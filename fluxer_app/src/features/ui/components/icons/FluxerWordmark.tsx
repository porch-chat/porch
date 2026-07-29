// SPDX-License-Identifier: AGPL-3.0-or-later

import RuntimeConfig from '@app/features/app/state/RuntimeConfig';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import {type BrandSvgProps, getDataFlx, getImageSizingProps} from './BrandImageUtils';

const APPLICATION_WORDMARK_DESCRIPTOR = msg({
	message: '{productName} wordmark',
	comment: 'Accessible label for the application wordmark.',
});

interface FluxerWordmarkProps extends BrandSvgProps {
	variant?: 'default' | 'monochrome';
}

export const FluxerWordmark = observer(({variant = 'default', ...props}: FluxerWordmarkProps) => {
	const {i18n} = useLingui();
	const productName = RuntimeConfig.productName;
	const ariaLabel = i18n._(APPLICATION_WORDMARK_DESCRIPTOR, {productName});
	if (RuntimeConfig.wordmarkUrl) {
		return (
			<img
				{...getImageSizingProps(props)}
				src={RuntimeConfig.wordmarkUrl}
				alt={ariaLabel}
				data-flx={getDataFlx(props, 'ui.icons.fluxer-wordmark.img')}
			/>
		);
	}
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 92 32"
			role="img"
			aria-label={ariaLabel}
			data-variant={variant}
			data-flx={getDataFlx(props, 'ui.icons.fluxer-wordmark.text')}
			{...props}
		>
			<text
				x="0"
				y="25"
				fill="currentColor"
				fontFamily="'IBM Plex Sans', system-ui, sans-serif"
				fontSize="30"
				fontWeight="700"
				letterSpacing="-0.8"
			>
				{productName}
			</text>
		</svg>
	);
});
