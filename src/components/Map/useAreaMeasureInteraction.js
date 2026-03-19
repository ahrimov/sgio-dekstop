import { useEffect, useState } from 'react';
import { Draw } from 'ol/interaction.js';
import { Style, Stroke, Fill, Circle } from 'ol/style.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { getArea } from 'ol/sphere.js';
import { unByKey } from 'ol/Observable.js';
import Overlay from 'ol/Overlay.js';

export const useAreaMeasureInteraction = (mapInstance, isActive) => {
	const [currentArea, setCurrentArea] = useState('');

	useEffect(() => {
		if (!mapInstance || !isActive) {
			setCurrentArea('');
			return;
		}

		const source = new VectorSource();
		const vector = new VectorLayer({
			source: source,
			style: new Style({
				fill: new Fill({
					color: 'rgba(128, 128, 128, 0.3)',
				}),
				stroke: new Stroke({
					color: '#333333',
					width: 2,
				}),
				image: new Circle({
					radius: 7,
					fill: new Fill({
						color: '#333333',
					}),
				}),
			}),
			zIndex: 1000000000,
		});

		mapInstance.addLayer(vector);

		let sketch;
		let measureTooltipElement;
		let measureTooltip;
		let staticTooltips = [];

		const formatArea = (polygon) => {
			const area = getArea(polygon);
			let output;
			if (area > 10000) {
				output = Math.round((area / 1000000) * 100) / 100 + ' км²';
			} else {
				output = Math.round(area * 100) / 100 + ' м²';
			}
			return output;
		};

		const createMeasureTooltip = () => {
			if (measureTooltipElement) {
				measureTooltipElement.parentNode.removeChild(measureTooltipElement);
			}
			measureTooltipElement = document.createElement('div');
			measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
			measureTooltip = new Overlay({
				element: measureTooltipElement,
				offset: [0, -15],
				positioning: 'bottom-center',
				stopEvent: false,
				insertFirst: false,
			});
			mapInstance.addOverlay(measureTooltip);
		};

		const draw = new Draw({
			source: source,
			type: 'Polygon',
			style: new Style({
				fill: new Fill({
					color: 'rgba(255, 255, 255, 0.2)',
				}),
				stroke: new Stroke({
					color: 'rgba(0, 0, 0, 0.5)',
					lineDash: [10, 10],
					width: 2,
				}),
				image: new Circle({
					radius: 5,
					stroke: new Stroke({
						color: 'rgba(0, 0, 0, 0.7)',
					}),
					fill: new Fill({
						color: 'rgba(255, 255, 255, 0.2)',
					}),
				}),
			}),
		});

		mapInstance.addInteraction(draw);

		createMeasureTooltip();

		let listener;
		draw.on('drawstart', (evt) => {
			// Удаляем предыдущий полигон и tooltip при начале рисования нового
			source.clear();
			
			// Удаляем все статичные tooltips
			staticTooltips.forEach(tooltip => {
				mapInstance.removeOverlay(tooltip.overlay);
				if (tooltip.element && tooltip.element.parentNode) {
					tooltip.element.parentNode.removeChild(tooltip.element);
				}
			});
			staticTooltips = [];
			
			sketch = evt.feature;

			let tooltipCoord = evt.coordinate;

			listener = sketch.getGeometry().on('change', (evt) => {
				const geom = evt.target;
				const output = formatArea(geom);
				// Обновляем состояние с текущей площадью
				setCurrentArea(output);
				tooltipCoord = geom.getInteriorPoint().getCoordinates();
				measureTooltipElement.innerHTML = output;
				measureTooltip.setPosition(tooltipCoord);
			});
		});

		draw.on('drawend', (evt) => {
			const geom = evt.feature.getGeometry();
			
			// Позиционируем tooltip в центре полигона
			const centerPoint = geom.getInteriorPoint().getCoordinates();
			measureTooltip.setPosition(centerPoint);
			// Оставляем класс ol-tooltip-measure для серого стиля
			measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
			measureTooltip.setOffset([0, -15]);
			
			// Сохраняем статичный tooltip
			staticTooltips.push({
				overlay: measureTooltip,
				element: measureTooltipElement
			});
			
			sketch = null;
			measureTooltipElement = null;
			createMeasureTooltip();
			unByKey(listener);
		});

		return () => {
			if (mapInstance) {
				mapInstance.removeInteraction(draw);
				mapInstance.removeLayer(vector);
				if (measureTooltip) {
					mapInstance.removeOverlay(measureTooltip);
				}
				if (measureTooltipElement && measureTooltipElement.parentNode) {
					measureTooltipElement.parentNode.removeChild(measureTooltipElement);
				}
				// Удаляем все статичные tooltips при выходе из режима измерения
				staticTooltips.forEach(tooltip => {
					mapInstance.removeOverlay(tooltip.overlay);
					if (tooltip.element && tooltip.element.parentNode) {
						tooltip.element.parentNode.removeChild(tooltip.element);
					}
				});
			}
		};
	}, [mapInstance, isActive]);

	return { currentArea };
};
