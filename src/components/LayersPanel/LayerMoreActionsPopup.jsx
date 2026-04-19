import React, { useEffect, useState } from 'react';
import { Popover, Button, Typography } from 'antd';
import { ClearOutlined, DeleteOutlined, MoreOutlined } from '@ant-design/icons';
import styled from 'styled-components';
import { startDrawing } from '../../features/draw/store';
import { deleteLayer } from '../../features/KMLLayer/deleteLayer';
import { saveKMLToFile } from '../../features/KMLLayer/saveKMLToFile';
import { exportKMLFromDB } from '../../features/KMLLayer/exportKMLFromDB';
import { clearLayer } from '../../features/clear/clearLayer';
import { selectKMLFile, readKMLForComparison } from '../../features/KMLImport/compareAttributes';
import { openKMLImportDialog } from '../../store/kmlImportDialog';
import { showConfirm } from '../../store/modalDialog';

const { Text } = Typography;

export function LayerMoreActionsPopup({ layer, onProps, parentScrollRef }) {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		if (!visible) return;
		const elem = parentScrollRef?.current || window;
		const close = () => {
			setVisible(false);
		};
		elem.addEventListener('scroll', close, { passive: true });
		return () => elem.removeEventListener('scroll', close);
	}, [visible, parentScrollRef]);

	const kmlType = layer.get('kmlType');
	const content = (
		<div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
			<Button
				type="text"
				size="small"
				onClick={() => {
					setVisible(false);
					setTimeout(() => {
						onProps?.(layer);
					}, 20);
				}}
			>
				Показать списком
			</Button>
			<Button
				type="text"
				size="small"
				onClick={() => {
					setVisible(false);
					startDrawing(layer);
				}}
			>
				Создать объект
			</Button>
			{!kmlType && (
				<>
					<Button
						type="text"
						size="small"
						onClick={async () => {
							setVisible(false);
							try {
								const filePath = await selectKMLFile();
								if (!filePath) return;

								const { features, properties } =
									await readKMLForComparison(filePath);

								openKMLImportDialog({
									layerId: layer.id,
									layerAttributes: layer.atribs || [],
									features,
									properties,
								});
							} catch (error) {
								console.error('Ошибка при чтении KML файла: ', error.message);
							}
						}}
					>
						Импорт KML
					</Button>
					<Button
						type="text"
						size="small"
						onClick={() => {
							setVisible(false);
							exportKMLFromDB(layer.id);
						}}
					>
						Экспорт KML
					</Button>
				</>
			)}
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
					clearLayer(layer);
				}}
			>
				<ClearOutlined style={{ color: 'red' }} />
				Очистить слой
			</Button>
			{kmlType && (
				<Button
					type="text"
					size="small"
					onClick={async () => {
						setVisible(false);
						const confirmed = await showConfirm(
							'Подтверждение удаления',
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
