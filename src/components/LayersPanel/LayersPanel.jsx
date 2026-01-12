import React, { useState } from 'react';
import { MenuOutlined, CloseOutlined } from '@ant-design/icons';
import './LayersPanel.css';
import styled from 'styled-components';
import { icons } from '../../icons';
import { LayerMoreActionsPopup } from './LayerMoreActionsPopup.jsx';
import { Collapse, Typography } from 'antd';
import { ReactSortable } from 'react-sortablejs';

const { Text } = Typography;

const RasterLayersList = ({ layers, moveLayer, toggleVisibility }) => {
	const [visibleVectorLayers, setVisibleVectorLayers] = useState(layers);

	return (
		<ReactSortable
			list={visibleVectorLayers}
			setList={setVisibleVectorLayers}
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
			{layers.map((layer, index) => (
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
	layers,
	moveLayer,
	toggleVisibility,
	onClickMore,
	currentElementWithActions,
	handleFeaturesClick,
}) => {
	const [visibleVectorLayers, setVisibleVectorLayers] = useState(layers);

	return (
		<ReactSortable
			list={visibleVectorLayers}
			setList={setVisibleVectorLayers}
			style={{ overflow: 'auto', height: '100%', padding: 0 }}
			tag="div"
			animation={200}
			handle=".layer-drag-handle"
			onEnd={evt => {
				if (evt.oldIndex !== evt.newIndex) {
					moveLayer(evt.oldIndex, evt.newIndex);
				}
			}}
		>
			{layers.map((layer, idx) => {
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
					/>
				);
			})}
		</ReactSortable>
	);
};

const DraggableRasterLayer = ({ layer, toggleVisibility }) => {
	return (
		<RasterLayerElementContainer active={layer.getVisible()} showTitle={true}>
			<DragHandle className="layer-drag-handle">
				<MenuOutlined />
			</DragHandle>
			<IconWrapper onClick={() => toggleVisibility(layer.get('id'), true)}>
				<img src={icons[layer.get('icon')]} width={24} height={24} alt={layer.get('descr')} />
			</IconWrapper>
			<Text
				style={{ color: 'rgb(0, 94, 154)', fontSize: '12px' }}
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
}) => {
	return (
		<VectorLayerElementContainer
			isActive={true}
			selected={layer.getVisible()}
			showTitle={true}
			className={currentElementWithActions === id ? 'show-actions' : ''}
		>
			<DragHandle className="layer-drag-handle">
				<MenuOutlined />
			</DragHandle>
			<Text
				style={{ color: 'rgb(0, 94, 154)', fontSize: '12px' }}
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
					onDelete={() => {}}
				/>
			</div>
		</VectorLayerElementContainer>
	);
};

const LayersPanel = ({ baseRasterLayers = [], layers = [], handleFeaturesClick, onClose }) => {
	const [rasterLayers, setRasterLayers] = useState(baseRasterLayers);
	const [vectorLayers, setVectorLayers] = useState(layers);
	const [currentElementWithActions, setCurrentElementWithActions] = useState(-1);

	const toggleLayerVisibility = (layerId, isRaster = false) => {
		if (isRaster) {
			setRasterLayers(prev =>
				prev.map(layer => {
					if (layer?.get('id') === layerId) {
						const newVisibility = !layer.getVisible();
						layer.setVisible(newVisibility);
					}
					return layer;
				})
			);
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
		const newRasterLayers = [...rasterLayers];
		const [movedItem] = newRasterLayers.splice(fromIndex, 1);
		newRasterLayers.splice(toIndex, 0, movedItem);
		setRasterLayers(newRasterLayers);

		newRasterLayers.forEach((layer, index) => {
			if (typeof layer.setZIndex === 'function') {
				layer.setZIndex(newRasterLayers.length - index);
			}
		});
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
				/>
			),
			styles: { body: vectorSectionBodyStyle, title: vectorSectionHeaderStyle },
		},
	];

	return (
		<LayersPanelContainer>
			<Header>
				<span>Слои</span>
				<CloseButton onClick={onClose}>
					<CloseOutlined />
				</CloseButton>
			</Header>

			<PanelContent>
				<Collapse
					style={{
						background: 'white',
						borderBottom: '1px solid #f7f7fa',
						borderRadius: 0,
					}}
					styles={{ body: { padding: 0 }, title: { color: 'rgb(0, 94, 154);' } }}
					items={rasterCollapseItems}
				/>
			</PanelContent>
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
	grid-template-columns: 30px 40px 1fr 20px; /* Добавляем столбец для DragHandle */
	align-content: center;
	border-top: 1px solid #4c93c2;
	padding: 2px;
	height: 32px;
	${props => props.active && 'background-color: rgb(255, 175, 48, 0.7);'}
	align-items: center;
`;

const VectorLayerElementContainer = styled.div.withConfig({
	shouldForwardProp: prop => prop !== 'isActive' && prop !== 'showTitle' && prop !== 'isDragging',
})`
	display: grid;
	grid-template-columns: 30px 1fr 10px;
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
	border: 1px solid #4c93c2;
	border-radius: 8px;
	overflow: hidden;
	height: 100%;
	color: rgb(0, 94, 154);
	display: flex;
	flex-direction: column;
`;

const CloseButton = styled.button`
	position: absolute;
	right: 8px;
	top: 50%;
	transform: translateY(-50%);
	background: none;
	border: none;
	color: white;
	cursor: pointer;
	font-size: 14px;
	padding: 4px;
	border-radius: 3px;

	&:hover {
		background: rgba(255, 255, 255, 0.2);
	}
`;

const Header = styled.div`
	height: 32px;
	cursor: default;
	display: flex;
	justify-content: center;
	align-items: center;
	background-color: rgb(76 147 194 / 70%);
	border-top-left-radius: 7px;
	border-top-right-radius: 7px;
	color: white;
	position: relative;
	flex: 0 0 32px;
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
