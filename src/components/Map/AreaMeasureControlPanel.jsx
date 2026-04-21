import React from 'react';
import { Flex, Typography } from 'antd';
import styled from 'styled-components';
import { CloseOutlined } from '@ant-design/icons';
import { changeInteractionMode, DEFAULT_INTERACTION } from '../../store/mapInteractionMode.js';

const { Text } = Typography;

export const AreaMeasureControlPanel = ({ currentArea }) => {
	const closeControlPanel = () => {
		changeInteractionMode(DEFAULT_INTERACTION);
	};

	return (
		<ControlPanel>
			<CloseButton onClick={closeControlPanel}>
				<CloseOutlined />
			</CloseButton>
			<Flex vertical gap={4} style={{ width: '100%' }}>
				<Flex justify="center">
					<Text style={{ color: 'rgb(17, 102, 162)', fontWeight: 'bold' }}>
						Измерение площади
					</Text>
				</Flex>
				<Flex justify="center">
					<Text style={{ color: 'rgb(17, 102, 162)', fontSize: '16px' }}>
						{currentArea || ''}
					</Text>
				</Flex>
			</Flex>
		</ControlPanel>
	);
};

const ControlPanel = styled.div`
	position: absolute;
	top: 13px;
	right: 50%;
	display: flex;
	gap: 8px;
	background: white;
	padding: 12px;
	border-radius: 8px;
	box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	z-index: 1000;
	height: 50px;
	width: 250px;
	color: rgb(17, 102, 162);
	border: 2px solid rgb(17, 102, 162);
	background-color: rgb(219 251 255 / 85%);
`;

const CloseButton = styled.button`
	position: absolute;
	top: 4px;
	right: 4px;
	background: none;
	border: none;
	font-size: 12px;
	cursor: pointer;
	color: rgb(17, 102, 162);
	padding: 2px;
	width: 16px;
	height: 16px;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1px solid;
	border-radius: 4px;
	background-color: white;

	&:hover {
		background: rgba(17, 102, 162, 0.1);
	}
`;
