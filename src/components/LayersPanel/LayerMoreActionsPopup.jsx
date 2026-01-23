import React from 'react';
import { Popover, Button } from 'antd';
import { DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { startDrawing } from '../../features/draw/store';
import { requestToDB } from '../../legacy/DBManage';
import { refreshFeatureTable } from '../../shared/refreshTable';
import { DARK_RED } from '../../consts/style';

export function LayerMoreActionsPopup({ layer, onProps }) {
	const content = (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
			<Button type="text" size="small" onClick={() => onProps?.(layer)}>
				Объекты
			</Button>
			<Button type="text" size="small" onClick={() => startDrawing(layer)}>
				Добавить объект
			</Button>
			<Button
				type="text"
				size="small"
				onClick={() => {
					const confirmed = window.confirm(
						`Вы уверены, что хотите очистить слой "${layer.get('descr') || layer.id}"?`
					);

					if (!confirmed) return;

					const query = `DELETE FROM ${layer.id};`;

					requestToDB(query, () => {
						layer.getSource().clear();
						refreshFeatureTable();
					});
				}}
			>
				<DeleteOutlined style={{ color: 'red' }} />
				Очистить слой
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
