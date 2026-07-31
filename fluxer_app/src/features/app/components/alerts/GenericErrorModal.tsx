// SPDX-License-Identifier: AGPL-3.0-or-later

import * as Modal from '@app/features/app/components/dialogs/Modal';
import {UNDERSTOOD_DESCRIPTOR} from '@app/features/i18n/utils/CommonMessageDescriptors';
import {Button} from '@app/features/ui/button/Button';
import * as ModalCommands from '@app/features/ui/commands/ModalCommands';
import {useLingui} from '@lingui/react/macro';
import {observer} from 'mobx-react-lite';

interface GenericErrorModalProps {
	title: string;
	message: React.ReactNode;
	'data-flx'?: string;
}

export const GenericErrorModal: React.FC<GenericErrorModalProps> = observer(({title, message, 'data-flx': dataFlx}) => {
	const {i18n} = useLingui();
	return (
		<Modal.Root size="small" centered data-flx={dataFlx ?? 'app.generic-error-modal.modal-root'}>
			<Modal.Header title={title} hideCloseButton data-flx="app.generic-error-modal.modal-header" />
			<Modal.Content data-flx="app.generic-error-modal.modal-content">
				<Modal.ContentLayout data-flx="app.generic-error-modal.modal-content-layout">
					<Modal.Description data-flx="app.generic-error-modal.modal-description">{message}</Modal.Description>
				</Modal.ContentLayout>
			</Modal.Content>
			<Modal.Footer data-flx="app.generic-error-modal.modal-footer">
				<Button onClick={ModalCommands.pop} variant="primary" data-flx="app.generic-error-modal.button.understood">
					{i18n._(UNDERSTOOD_DESCRIPTOR)}
				</Button>
			</Modal.Footer>
		</Modal.Root>
	);
});
