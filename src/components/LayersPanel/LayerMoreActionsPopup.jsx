import React from 'react';
import { Popover, Button } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import styled from 'styled-components';

export function LayerMoreActionsPopup({ layer, onProps }) {
	const content = (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
			<Button type="text" size="small" onClick={() => onProps?.(layer)}>
				Объекты
			</Button>
		</div>
	);

	return (
		<Popover
			content={content}
			trigger="click"
			placement="left"
			getPopupContainer={triggerNode => triggerNode.parentNode}
			autoAdjustOverflow={false}
			styles={{
				container: {
					padding: 4,
				},
			}}
		>
			<MoreButton>
				<MoreOutlined />
			</MoreButton>
		</Popover>
	);
}

const MoreButton = styled.button`
	width: 18px;
	height: 18px;
	opacity: 0.6;
	cursor: pointer;
	border: none;
	background: none;
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover {
		opacity: 1;
	}
`;
