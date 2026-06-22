import React from 'react';
import { Modal, Progress, Typography, Space, Alert } from 'antd';
import { useUnit } from 'effector-react';
import { $iliReverseState, resetIliReverse } from '../../store/iliReverse';
import { MEDIUM_DARK_BLUE } from '../../consts/style';

const { Text, Title } = Typography;

/**
 * ILI report reversal progress modal.
 * Shows real-time step-by-step progress during the reversal + coordinate recalculation.
 * Subscribes to the $iliReverseState Effector store for updates.
 */
export const ILIReverseProgress = () => {
	const { isRunning, percent, message, error, currentStep, totalSteps } = useUnit($iliReverseState);

	const visible = isRunning || !!error;

	const handleClose = () => {
		if (!isRunning) {
			resetIliReverse();
		}
	};

	return (
		<Modal
			open={visible}
			closable={!isRunning}
			onCancel={handleClose}
			footer={null}
			width={320}
			centered
			mask={true}
			maskClosable={false}
			zIndex={1001}
			styles={{
				mask: {
					backgroundColor: 'rgba(0, 0, 0, 0.7)',
				},
			}}
		>
			<Space orientation="vertical" style={{ width: '100%' }} size="middle">
				<Title level={4} style={{ margin: 0, textAlign: 'center', color: MEDIUM_DARK_BLUE }}>
					Разворот отчёта ВТД
				</Title>

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
						/>

						<Text
							style={{ fontSize: '12px', textAlign: 'center', display: 'block', color: MEDIUM_DARK_BLUE }}
						>
							{message || 'Подготовка...'}
						</Text>

						<Text
							type="secondary"
							style={{ fontSize: '11px', textAlign: 'center', display: 'block', color: MEDIUM_DARK_BLUE }}
						>
							Шаг {currentStep} из {totalSteps}
						</Text>
					</>
				)}
			</Space>
		</Modal>
	);
};
