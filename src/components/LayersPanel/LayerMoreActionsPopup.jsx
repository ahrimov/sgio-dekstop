import React, { useEffect, useState } from 'react';
import { Popover, Button, Typography } from 'antd';
import { ClearOutlined, DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { startDrawing } from '../../features/draw/store';
import { requestToDB } from '../../legacy/DBManage';
import { refreshFeatureTable } from '../../shared/refreshTable';
import { syncChangesWithKML } from '../../features/KMLLayer/syncChangesWithKML';
import { deleteLayer } from '../../features/KMLLayer/deleteLayer';
import { saveKMLToFile } from '../../features/KMLLayer/saveKMLToFile';

const { Text } = Typography;

export function LayerMoreActionsPopup({ layer, onProps, parentScrollRef }) {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (!visible) return;
		const elem = parentScrollRef?.current || window;
		const close = () => {
			setVisible(false);
		}
		elem.addEventListener('scroll', close, { passive: true });
		return () => elem.removeEventListener('scroll', close);
	}, [visible, parentScrollRef]);

	const kmlType = layer.get('kmlType');
	const content = (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
			<Button type="text" size="small" onClick={() => {
				setVisible(false);
				setTimeout(() => {
					onProps?.(layer);
				}, 20);
			}
			}>
				Объекты
			</Button>
			<Button type="text" size="small" onClick={() => {
				setVisible(false);
				startDrawing(layer)
			}}>
				Добавить объект
			</Button>
			{kmlType && (
				<Button
					type="text"
					size="small"
					onClick={() => {
						setVisible(false);
						saveKMLToFile(layer.id);
					}}
				>
					Экспорт KML
				</Button>
			)}
			<Button
				type="text"
				size="small"
				onClick={() => {
					setVisible(false);
					const confirmed = window.confirm(
						`Вы уверены, что хотите очистить слой "${layer.get('descr') || layer.id}"?`
					);

					if (!confirmed) return;

					if (kmlType) {
						const features = layer.getSource().getFeatures();
						features.forEach(feature => feature.deleted = true);
						syncChangesWithKML(layer.id);
						refreshFeatureTable();
					} else {
						const query = `DELETE FROM ${layer.id};`;

						requestToDB(query, () => {
							layer.getSource().clear();
							refreshFeatureTable();
						});
					}
				}}
			>
				<ClearOutlined style={{ color: 'red' }} />
				Очистить слой
			</Button>
			{kmlType && (
				<Button
					type="text"
					size="small"
					onClick={() => {
						setVisible(false);
						const confirmed = window.confirm(
							`Вы уверены, что хотите удалить слой "${layer.get('descr') || layer.id}"?`
						);
						if (!confirmed) return;

						deleteLayer(layer.id);
					}}
				>
					<DeleteOutlined style={{ color: 'red' }} />
					<Text style={{ color: 'red' }}>Удалить слой</Text>
				</Button>
			)}
		</div>
	);

	return (
		<Popover
			content={content}
			trigger="click"
			placement="left"
			getPopupContainer={() => document.body}
			autoAdjustOverflow={true}
			open={visible}
			onOpenChange={setVisible}
			styles={{
				root: {
					zIndex: 100000,
				},
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
