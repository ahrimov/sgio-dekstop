import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MenuOutlined, PlusOutlined } from '@ant-design/icons';
import './LayersPanel.css';
import styled from 'styled-components';
import { icons } from '../../icons';
import { LayerMoreActionsPopup } from './LayerMoreActionsPopup.jsx';
import { Button, Collapse, Typography, Checkbox } from 'antd';
import { ReactSortable } from 'react-sortablejs';
import { MEDIUM_BLUE } from '../../consts/style.js';
import { addNewLayer } from '../../features/KMLLayer/addNewLayer.js';
import { useUnit } from 'effector-react';
import { $layers } from '../../legacy/globals.js';
import {
	$rasterLayers,
	reorderRasterLayers,
	toggleRasterLayerVisibility,
} from '../../store/rasterLayers.js';

const { Text } = Typography;

const RasterLayersList = ({ layers, moveLayer, toggleVisibility }) => {
	const [sortableLayers, setSortableLayers] = useState(layers);

	useEffect(() => {
		setSortableLayers(layers);
	}, [layers]);

	return (
		<ReactSortable
			list={sortableLayers}
			setList={setSortableLayers}
			style={{ overflow: 'auto', padding: 0 }}
			tag="div"
			animation={200}
			handle=".layer-drag-handle"
			onEnd={evt => {
				if (evt.oldIndex !== evt.newIndex) {
					moveLayer(evt.oldIndex, evt.newIndex);
				}
			}}
		>
			{sortableLayers.map((layer, index) => (
				<DraggableRasterLayer
					key={layer.get('id')}
					layer={layer}
					index={index}
					moveLayer={moveLayer}
					toggleVisibility={toggleVisibility}
				/>
			))}
		</ReactSortable>
	);
};

const VectorLayersList = ({
	moveLayer,
	toggleVisibility,
	onClickMore,
	currentElementWithActions,
	handleFeaturesClick,
	parentScrollRef,
}) => {
	const layerList = useUnit($layers);
	const [visibleVectorLayers, setVisibleVectorLayers] = useState(layerList);

	useEffect(() => {
		setVisibleVectorLayers(layerList);
	}, [layerList]);

	return (
		<ReactSortable
			list={visibleVectorLayers}
			setList={setVisibleVectorLayers}
			style={{ height: '100%', padding: 0 }}
			tag="div"
			animation={200}
			handle=".layer-drag-handle"
			onEnd={evt => {
				if (evt.oldIndex !== evt.newIndex) {
					moveLayer(evt.oldIndex, evt.newIndex);
				}
			}}
		>
			{visibleVectorLayers.map((layer, idx) => {
				return (
					<DraggableVectorLayer
						key={layer.id}
						layer={layer}
						index={idx}
						id={layer.id}
						moveLayer={moveLayer}
						toggleVisibility={toggleVisibility}
						onClickMore={onClickMore}
						currentElementWithActions={currentElementWithActions}
						handleFeaturesClick={handleFeaturesClick}
						parentScrollRef={parentScrollRef}
					/>
				);
			})}
		</ReactSortable>
	);
};

const DraggableRasterLayer = ({ layer, toggleVisibility }) => {
	const isVisible = layer.getVisible();

	return (
		<RasterLayerElementContainer active={isVisible} showTitle={true}>
			<DragHandle className="layer-drag-handle">
				<MenuOutlined />
			</DragHandle>
			<Checkbox
				checked={isVisible}
				onChange={() => toggleVisibility(layer.get('id'), true)}
			/>
			<IconWrapper onClick={() => toggleVisibility(layer.get('id'), true)}>
				<img
					src={icons[layer.get('icon')]}
					width={24}
					height={24}
					alt={layer.get('descr')}
				/>
			</IconWrapper>
			<Text
				style={{ color: 'rgb(0, 94, 154)', fontSize: '12px', cursor: 'pointer' }}
				onClick={() => toggleVisibility(layer.get('id'), true)}
				title={layer.get('descr')}
				ellipsis
			>
				{layer.get('descr')}
			</Text>
		</RasterLayerElementContainer>
	);
};

const DraggableVectorLayer = ({
	layer,
	toggleVisibility,
	currentElementWithActions,
	id,
	handleFeaturesClick,
	parentScrollRef,
}) => {
	const isVisible = layer.getVisible();

	return (
		<VectorLayerElementContainer
			isActive={true}
			selected={isVisible}
			showTitle={true}
			className={currentElementWithActions === id ? 'show-actions' : ''}
		>
			<DragHandle className="layer-drag-handle">
				<MenuOutlined />
			</DragHandle>
			<Checkbox checked={isVisible} onChange={() => toggleVisibility(layer.id, false)} />
			<Text
				style={{ color: 'rgb(0, 94, 154)', fontSize: '12px', cursor: 'pointer' }}
				onClick={() => toggleVisibility(layer.id, false)}
				title={layer.label}
				ellipsis
			>
				{layer.label}
			</Text>
			<div className="layer-actions">
				<LayerMoreActionsPopup
					layer={layer}
					onProps={handleFeaturesClick}
					onExport={() => {}}
					parentScrollRef={parentScrollRef}
				/>
			</div>
		</VectorLayerElementContainer>
	);
};

const LayersPanel = ({ layers = [], handleFeaturesClick }) => {
	const rasterLayers = useUnit($rasterLayers);
	const [vectorLayers, setVectorLayers] = useState(layers);
	const [currentElementWithActions, setCurrentElementWithActions] = useState(-1);
	const scrollRef = useRef(null);

	const toggleLayerVisibility = (layerId, isRaster = false) => {
		if (isRaster) {
			toggleRasterLayerVisibility(layerId);
		} else {
			setVectorLayers(prev =>
				prev.map(layer => {
					if (layer.id === layerId) {
						const newVisibility = !layer.getVisible();
						layer.setVisible(newVisibility);
					}
					return layer;
				})
			);
		}
	};

	const handleClickOnMore = id => {
		if (currentElementWithActions === id) {
			setCurrentElementWithActions(-1);
		} else {
			setCurrentElementWithActions(id);
		}
	};

	const moveRasterLayer = (fromIndex, toIndex) => {
		reorderRasterLayers({ fromIndex, toIndex });
	};

	const moveVectorLayer = (fromIndex, toIndex) => {
		const newVectorLayers = [...vectorLayers];
		const [movedItem] = newVectorLayers.splice(fromIndex, 1);
		newVectorLayers.splice(toIndex, 0, movedItem);
		setVectorLayers(newVectorLayers);

		newVectorLayers.forEach((layer, index) => {
			if (typeof layer.setZIndex === 'function') {
				layer.setZIndex(newVectorLayers.length - index);
			}
		});
	};

	const handleAddLayerClick = useCallback(async () => {
		const fileName = await electronAPI.openFileDialog({
			title: 'Выберите KML файл для добавления слоя',
			filters: [
				{ name: 'KML файлы', extensions: ['kml'] },
				{ name: 'Все файлы', extensions: ['*'] },
			],
			properties: ['openFile'],
		});
		addNewLayer(fileName);
	}, []);

	const rasterCollapseItems = [
		{
			key: '1',
			label: 'Растровые слои',
			children: (
				<RasterLayersList
					layers={rasterLayers}
					moveLayer={moveRasterLayer}
					toggleVisibility={toggleLayerVisibility}
				/>
			),
			styles: { body: rasterSectionBodyStyle, title: rasterSectionHeaderStyle },
		},
		{
			key: '2',
			label: 'Векторные слои',
			children: (
				<VectorLayersList
					layers={vectorLayers}
					moveLayer={moveVectorLayer}
					toggleVisibility={toggleLayerVisibility}
					onClickMore={handleClickOnMore}
					currentElementWithActions={currentElementWithActions}
					handleFeaturesClick={handleFeaturesClick}
					parentScrollRef={scrollRef}
				/>
			),
			styles: { body: vectorSectionBodyStyle, title: vectorSectionHeaderStyle },
		},
	];

	return (
		<LayersPanelContainer>
			<PanelContent ref={scrollRef}>
				<Collapse
					style={{
						background: 'white',
						borderBottom: '1px solid #f7f7fa',
						borderRadius: 0,
					}}
					styles={{ body: { padding: 0 }, title: { color: 'rgb(0, 94, 154)' } }}
					items={rasterCollapseItems}
				/>
			</PanelContent>

			<AddLayerButtonContainer>
				<Button
					title="Добавить слой"
					type="primary"
					icon={<PlusOutlined />}
					style={{ width: '100%' }}
					onClick={handleAddLayerClick}
				>
					Добавить слой
				</Button>
			</AddLayerButtonContainer>
		</LayersPanelContainer>
	);
};

const rasterSectionBodyStyle = {
	padding: 0,
};

const rasterSectionHeaderStyle = {
	background: '#ffffff',
	color: 'rgb(0, 94, 154);',
};

const vectorSectionBodyStyle = {
	padding: 0,
};

const vectorSectionHeaderStyle = {
	color: 'rgb(0, 94, 154);',
};

export default LayersPanel;

const DragHandle = styled.div`
	cursor: grab;
	color: #8c8c8c;
	padding: 4px;
	display: flex;
	align-items: center;
	justify-content: center;

	&:hover {
		color: #1890ff;
	}

	&:active {
		cursor: grabbing;
	}
`;

const RasterLayerElementContainer = styled.div.withConfig({
	shouldForwardProp: prop => prop !== 'active' && prop !== 'showTitle' && prop !== 'isDragging',
})`
	display: grid;
	grid-template-columns: 30px 30px 40px 1fr; /* DragHandle + Checkbox + Icon + Text */
	align-content: center;
	border-top: 1px solid ${MEDIUM_BLUE};
	padding: 2px;
	height: 32px;
	${props => props.active && 'background-color: rgb(255, 175, 48, 0.7);'}
	align-items: center;
`;

const VectorLayerElementContainer = styled.div.withConfig({
	shouldForwardProp: prop => prop !== 'isActive' && prop !== 'showTitle' && prop !== 'isDragging',
})`
	display: grid;
	grid-template-columns: 30px 30px 1fr 10px; /* DragHandle + Checkbox + Text + Actions */
	align-content: center;
	line-height: 24px;
	font-size: 12px;
	height: 27px;
	border-top: 1px solid #ccc;
	align-items: center;
	padding: 2px;
	padding-right: 25px;

	${props => {
		if (!props.isActive) {
			return `
        pointer-events: none;
        opacity: 0.4;
      `;
		}
	}}

	${props => props.selected && 'background-color: rgb(255, 175, 48, 0.7);'}
  
  .layer-actions {
		display: flex;
		align-items: center;
		gap: 4px;
		position: relative;
	}

	.layer-visibility {
		color: #8c8c8c;
		font-size: 14px;
	}
`;

const LayersPanelContainer = styled.div`
	position: relative;
	background: rgba(255, 255, 255, 0.9);
	border: 1px solid ${MEDIUM_BLUE};
	border-radius: 8px;
	overflow: hidden;
	height: 100%;
	color: rgb(0, 94, 154);
	display: flex;
	flex-direction: column;
`;

const AddLayerButtonContainer = styled.div`
	padding: 8px;
	background: white;
`;

const PanelContent = styled.div`
	overflow: auto;
	padding: 0;
	flex: 1 1 auto;
	display: flex;
	flex-direction: column;
`;

const IconWrapper = styled.div`
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	height: 32px;
`;
