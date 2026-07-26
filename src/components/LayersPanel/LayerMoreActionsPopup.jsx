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
import { MEDIUM_DARK_BLUE } from '../../consts/style';

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

	const buttonStyle = { color: MEDIUM_DARK_BLUE, textAlign: 'left', display: 'inline' };

	const showBtn = (id) => !layer.showButtons || layer.showButtons.includes(id);

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
				style={buttonStyle}
			>
				Показать списком
			</Button>
			{showBtn('add') ?
				<Button
					type="text"
					size="small"
					onClick={() => {
						setVisible(false);
						startDrawing(layer);
					}}
					style={buttonStyle}
				>
					{layer.id === 'SGIO_ILI_DATA_VIRT_MARKER' ? 'Добавить репер' : 'Создать объект'}
				</Button> : null
			}
			{!kmlType && (
				<>
					{showBtn('import') ?
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
							style={buttonStyle}
						>
							Импорт KML
						</Button> : null
					}
					{showBtn('export') ? 
						<Button
							type="text"
							size="small"
							onClick={() => {
								setVisible(false);
								exportKMLFromDB(layer.id);
							}}
							style={buttonStyle}
						>
							Экспорт KML
						</Button> : null
					}
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
					style={buttonStyle}
				>
					Экспорт KML
				</Button>
			)}
			{showBtn('clear') ? 
				<Button
					type="text"
					size="small"
					onClick={() => {
						setVisible(false);
						clearLayer(layer);
					}}
					style={buttonStyle}
				>
					Очистить слой
				</Button> : null 
			}
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
					style={buttonStyle}
				>
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
					color: MEDIUM_DARK_BLUE,
					textAlign: 'left',
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
