// SPDX-License-Identifier: AGPL-3.0-or-later

import RuntimeConfig from '@app/features/app/state/RuntimeConfig';
import PorchSymbolAsset from '@app/media/images/porch-symbol.svg?react';
import {msg} from '@lingui/core/macro';
import {useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';
import type React from 'react';
import {getDataFlx, getImageSizingProps} from './BrandImageUtils';

const APPLICATION_SYMBOL_DESCRIPTOR = msg({
	message: '{productName} application symbol',
	comment: 'Accessible label for the application symbol logo.',
});

export const FluxerSymbol = observer((props: React.SVGProps<SVGSVGElement>) => {
	const {i18n} = useLingui();
	const ariaLabel = i18n._(APPLICATION_SYMBOL_DESCRIPTOR, {productName: RuntimeConfig.productName});
	if (RuntimeConfig.symbolUrl) {
		return (
			<img
				{...getImageSizingProps(props)}
				src={RuntimeConfig.symbolUrl}
				alt={ariaLabel}
				data-flx={getDataFlx(props, 'ui.icons.fluxer-symbol.img')}
			/>
		);
	}
	return (
		<PorchSymbolAsset
			role="img"
			aria-label={ariaLabel}
			data-flx={getDataFlx(props, 'ui.icons.fluxer-symbol.svg')}
			{...props}
		/>
	);
});
