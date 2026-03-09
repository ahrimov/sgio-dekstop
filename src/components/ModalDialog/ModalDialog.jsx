import React from 'react';
import { useStore } from 'effector-react';
import { $modalDialog, confirmModal, cancelModal } from '../../store/modalDialog';
import './ModalDialog.css';

/**
 * Global modal dialog component
 * Can display either alert (OK only) or confirm (OK/Cancel) dialogs
 */
export default function ModalDialog() {
	const modalState = useStore($modalDialog);

	if (!modalState.isOpen) {
		return null;
	}

	const handleConfirm = () => {
		confirmModal();
	};

	const handleCancel = () => {
		cancelModal();
	};

	const handleOverlayClick = e => {
		// Close on overlay click only for alert type
		if (e.target === e.currentTarget && modalState.type === 'alert') {
			handleCancel();
		}
	};

	return (
		<div className="modal-dialog-overlay" onClick={handleOverlayClick}>
			<div className="modal-dialog-container">
				{modalState.title && (
					<div className="modal-dialog-header">
						<h3 className="modal-dialog-title">{modalState.title}</h3>
					</div>
				)}

				<div className="modal-dialog-body">
					<p className="modal-dialog-message">{modalState.message}</p>
				</div>

				<div className="modal-dialog-footer">
					<button
						className="modal-dialog-button modal-dialog-button-confirm"
						onClick={handleConfirm}
						autoFocus
					>
						{modalState.confirmText}
					</button>
					{modalState.type === 'confirm' && (
						<button
							className="modal-dialog-button modal-dialog-button-cancel"
							onClick={handleCancel}
						>
							{modalState.cancelText}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
