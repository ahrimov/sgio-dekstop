import React from 'react';
import styled from 'styled-components';
import { useUnit } from 'effector-react';
import { $windows, windowClosed, windowRestored } from './store.js';
import { DARK_BLUE, MEDIUM_BLUE, MEDIUM_DARK_BLUE, SUPER_DARK_BLUE } from '../../consts/style.js';
import { CloseOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { openInfoModal } from '../InfoModal/store.js';

export function Taskbar() {
	const { windows, restore, close } = useUnit({
		windows: $windows,
		restore: windowRestored,
		close: windowClosed,
	});

	const minimizedWindows = Object.values(windows).filter(w => w.isMinimized);

	return (
		<TaskbarContainer>
			<LeftBlock>
				<Button
					title={'О приложении'}
					style={{ color: 'white', borderRadius: '16px' }}
					ariant="text"
					type="text"
					icon={<InfoCircleOutlined />}
					onClick={openInfoModal}
				/>
			</LeftBlock>
			<RightBlock>
				{minimizedWindows.map(window => (
					<TaskbarButton key={window.id} title={`Восстановить: ${window.title}`}>
						<WindowTitle onClick={() => restore(window.id)}>{window.title}</WindowTitle>
						<CloseOutlined
							onClick={() => {
								if (window.onClose) {
									window.onClose();
								}
								close(window.id);
							}}
						/>
					</TaskbarButton>
				))}
			</ RightBlock>
		</TaskbarContainer>
	);
}

const TaskbarContainer = styled.div`
	position: fixed;
	bottom: 0;
	left: 0;
	right: 0;
	height: 50px;
	background: ${SUPER_DARK_BLUE};
	display: flex;
	align-items: center;
	padding: 0 10px;
	gap: 8px;
	z-index: 10000;
	justify-content: space-between;
`;

const LeftBlock = styled.div`
	display: flex;
	align-items: center;
`;

const RightBlock = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;
`;

const TaskbarButton = styled.button`
	display: flex;
	align-items: center;
	gap: 8px;
	background: ${DARK_BLUE};
	border: 1px solid ${MEDIUM_DARK_BLUE};
	border-radius: 4px;
	color: white;
	padding: 6px 12px;
	cursor: pointer;
	transition: all 0.2s;

	&:hover {
		background: ${MEDIUM_BLUE};
		border-color: ${DARK_BLUE};
	}

	&:active {
		transform: scale(0.98);
	}
`;

const WindowTitle = styled.span`
	font-size: 12px;
	max-width: 150px;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
`;
