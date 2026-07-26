import React from 'react';
import { Modal, Progress, Typography } from 'antd';
import { useUnit } from 'effector-react';
import styled from 'styled-components';
import { $virtMarkerRecalc } from '../../store/virtMarkerRecalc';
import { DARK_BLUE, MEDIUM_DARK_BLUE } from '../../consts/style';

const { Text } = Typography;

/**
 * Progress modal shown during virtual marker coordinate recalculation.
 * Appears after saving a virtual marker while iliCalcCoordinatesNoLink runs
 * and SGIO layers are being reloaded.
 */
export const VirtMarkerRecalcProgress = () => {
	const { visible, percent, message } = useUnit($virtMarkerRecalc);

	return (
		<StyledModal
			open={visible}
			closable={false}
			footer={null}
			width={320}
			centered
			mask={true}
			maskClosable={false}
			zIndex={1001}
		>
			<CustomHeader>
				<HeaderTitle>Виртуальный репер</HeaderTitle>
			</CustomHeader>

			<BodyWrapper>
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

				<div style={{ marginTop: 16 }}>
					<Text style={{ color: MEDIUM_DARK_BLUE, fontSize: '13px', textAlign: 'center', display: 'block' }}>
						{message}
					</Text>
				</div>
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
