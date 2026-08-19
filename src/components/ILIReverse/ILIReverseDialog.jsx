import React, { useCallback } from 'react';
import { Modal } from 'antd';
import { CloseOutlined } from '@ant-design/icons';
import { useUnit } from 'effector-react';
import styled from 'styled-components';
import {
	$iliReverseState,
	closeIliReverseDialog,
	iliReverseError,
} from '../../store/iliReverse';
import { runIliReverseReport } from '../../features/ILIReverse/reverseILIReport';
import { DARK_BLUE, MEDIUM_DARK_BLUE } from '../../consts/style';
import '../ModalDialog/ModalDialog.css';

/**
 * Confirmation dialog for "Разворот отчёта ВТД".
 * Styled to match ILIImportDialog — dark header, body text, Да/Нет buttons.
 *
 * @param {{ dbPath: string }} props
 */
export const ILIReverseDialog = ({ dbPath }) => {
	const { dialogOpen, isRunning } = useUnit($iliReverseState);

	const handleConfirm = useCallback(async () => {
		closeIliReverseDialog();
		try {
			await runIliReverseReport(dbPath, {});
		} catch (err) {
			iliReverseError(err);
		}
	}, [dbPath]);

	const handleCancel = useCallback(() => {
		if (!isRunning) {
			closeIliReverseDialog();
		}
	}, [isRunning]);

	return (
		<StyledModal
			title={null}
			open={dialogOpen}
			onCancel={handleCancel}
			closable={false}
			width={420}
			destroyOnClose
			maskClosable={!isRunning}
			footer={
				<div className="modal-dialog-footer">
					<button
						className="modal-dialog-button modal-dialog-button-confirm"
						onClick={handleConfirm}
						disabled={isRunning}
					>
						Да
					</button>
					<button
						className="modal-dialog-button modal-dialog-button-cancel"
						onClick={handleCancel}
						disabled={isRunning}
					>
						Нет
					</button>
				</div>
			}
		>
			<CustomHeader>
				<HeaderTitle>Подтверждение разворота и пересчёта</HeaderTitle>
				<ControlButton onClick={handleCancel} title="Закрыть" disabled={isRunning}>
					<CloseOutlined />
				</ControlButton>
			</CustomHeader>

			<BodyWrapper>
				<p className="modal-dialog-message">
					Вы уверены, что хотите развернуть отчёт ВТД и выполнить расчёт координат дефектов?
				</p>
				<p className="modal-dialog-message">
					Внимание! Если Вы внесли в данный отчёт виртуальные реперы, то необходимо их удалить
					перед выполнением разворота. Иначе геодезическая привязка будет искажена.
				</p>
			</BodyWrapper>
		</StyledModal>
	);
};

const StyledModal = styled(Modal)`
	.ant-modal-content {
		overflow: hidden;
		border-radius: 8px;
		padding: 0;
		color: ${MEDIUM_DARK_BLUE} !important;
	}

	.ant-modal-body {
		padding: 0;
	}

	.ant-modal-footer {
		padding-bottom: 14px;
		padding-right: 26px;
		margin-top: 0;
	}

	.ant-modal-container {
		padding: 0 !important;
		width: 563px;
	}
`;

const CustomHeader = styled.div`
	background-color: ${DARK_BLUE};
	padding: 16px 24px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-radius: 8px 8px 0 0;
`;

const HeaderTitle = styled.h3`
	margin: 0;
	color: white;
	font-size: 16px;
	font-weight: 500;
`;

const ControlButton = styled.button`
	background: none;
	width: 28px;
	height: 28px;
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	color: #ffffff;
	transition: all 0.2s;
	border: 1px solid #ffffff;

	&:hover:not(:disabled) {
		color: #000000;
		background-color: #ffffff;
	}

	&:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
`;

const BodyWrapper = styled.div`
	padding: 16px 6px 18px 6px;
`;
