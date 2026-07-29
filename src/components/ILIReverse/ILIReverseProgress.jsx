import React from 'react';
import { Modal, Progress, Typography, Alert } from 'antd';
import { useUnit } from 'effector-react';
import styled from 'styled-components';
import { $iliReverseState, resetIliReverse } from '../../store/iliReverse';
import { DARK_BLUE, MEDIUM_DARK_BLUE } from '../../consts/style';

const { Text } = Typography;

/**
 * ILI report reversal progress modal.
 * Shows real-time step-by-step progress during the reversal + coordinate recalculation.
 * Subscribes to the $iliReverseState Effector store for updates.
 */
export const ILIReverseProgress = () => {
	const { isRunning, percent, message, error } = useUnit($iliReverseState);

	const visible = isRunning || !!error;

	const handleClose = () => {
		if (!isRunning) {
			resetIliReverse();
		}
	};

	return (
		<StyledModal
			open={visible}
			closable={!isRunning}
			onCancel={handleClose}
			footer={null}
			width={320}
			centered
			mask={true}
			maskClosable={false}
			zIndex={1001}
		>
			<CustomHeader>
				<HeaderTitle>Разворот отчёта ВТД</HeaderTitle>
			</CustomHeader>

			<BodyWrapper>
				{error ? (
					<Alert
						message="Ошибка разворота"
						description={error}
						type="error"
						showIcon
					/>
				) : (
					<>
						<Progress
							style={{ textAlign: 'center', display: 'flex', justifyContent: 'center', width: '100%' }}
							percent={percent}
							status={percent < 100 ? 'active' : 'success'}
							type="circle"
							strokeColor={DARK_BLUE}
							strokeWidth={8}
							format={(p) => (
								<span style={{ color: DARK_BLUE, fontWeight: 600 }}>{p}%</span>
							)}
						/>
	
						<Text style={{ fontSize: '12px', textAlign: 'center', display: 'block', color: MEDIUM_DARK_BLUE }}>
							{message || 'Подготовка...'}
						</Text>
					</>
				)}
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

	.ant-modal-container {
		padding: 0 !important;
	}
`;

const CustomHeader = styled.div`
	background-color: ${DARK_BLUE};
	padding: 16px 24px;
	display: flex;
	justify-content: center;
	align-items: center;
	border-radius: 8px 8px 0 0;
`;

const HeaderTitle = styled.h3`
	margin: 0;
	color: white;
	font-size: 16px;
	font-weight: 500;
`;

const BodyWrapper = styled.div`
	padding: 24px;
`;
