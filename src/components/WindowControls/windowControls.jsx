import React from 'react';
import { CloseOutlined, ExpandAltOutlined, MinusOutlined, ShrinkOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { useWindowControls } from './useWindowControls';

export function WindowControls({ windowId, onClose, disabled = false }) {
	const { isMaximized, minimize, maximize, restore, close } = useWindowControls({
		windowId,
	});

	const handleClose = () => {
		close();
		if (onClose) {
			onClose();
		}
	};

	return (
		<ControlsContainer>
			<ControlButton
				onClick={e => {
					e.stopPropagation();
					minimize(windowId);
				}}
				title="Свернуть"
				disabled={disabled}
			>
				<MinusOutlined />
			</ControlButton>
			{isMaximized ? (
				<ControlButton
					onClick={e => {
						e.stopPropagation();
						restore(windowId);
					}}
					title="Восстановить"
					disabled={disabled}
				>
					<ShrinkOutlined />
				</ControlButton>
			) : (
				<ControlButton
					onClick={e => {
						e.stopPropagation();
						maximize(windowId);
					}}
					title="Развернуть"
					disabled={disabled}
				>
					<ExpandAltOutlined />
				</ControlButton>
			)}
			{onClose && (
				<ControlButton onClick={handleClose} title="Закрыть" $isClose disabled={disabled} >
					<CloseOutlined />
				</ControlButton>
			)}
		</ControlsContainer>
	);
}

const ControlsContainer = styled.div`
	display: flex;
	gap: 4px;
	margin-left: auto;
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

	&:hover {
		color: #000000;
		background-color: #ffffff;
	}
`;
