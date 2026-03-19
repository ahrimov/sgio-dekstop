import { useEffect, useState } from 'react';
import { Draw } from 'ol/interaction.js';
import { Style, Stroke, Fill, Circle } from 'ol/style.js';
import { Vector as VectorSource } from 'ol/source.js';
import { Vector as VectorLayer } from 'ol/layer.js';
import { getLength } from 'ol/sphere.js';
import { unByKey } from 'ol/Observable.js';
import Overlay from 'ol/Overlay.js';
import { LineString } from 'ol/geom.js';

export const useMeasureInteraction = (mapInstance, isActive) => {
	const [currentLength, setCurrentLength] = useState('');

	useEffect(() => {
		if (!mapInstance || !isActive) {
			setCurrentLength('');
			return;
		}

		const source = new VectorSource();
		const vector = new VectorLayer({
			source: source,
			style: new Style({
				fill: new Fill({
					color: 'rgba(255, 255, 255, 0.2)',
				}),
				stroke: new Stroke({
					color: '#ff0000',
					width: 2,
				}),
				image: new Circle({
					radius: 7,
					fill: new Fill({
						color: '#ff0000',
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

		const formatLength = (line) => {
			const length = getLength(line);
			let output;
			if (length > 1000) {
				output = Math.round((length / 1000) * 100) / 100 + ' км';
			} else {
				output = Math.round(length * 100) / 100 + ' м';
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
			type: 'LineString',
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
			source.clear();
			
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
				const output = formatLength(geom);
				setCurrentLength(output);
				tooltipCoord = geom.getLastCoordinate();
				measureTooltipElement.innerHTML = output;
				measureTooltip.setPosition(tooltipCoord);
			});
		});

		draw.on('drawend', (evt) => {
			const geom = evt.feature.getGeometry();
			const coordinates = geom.getCoordinates();
			
			const totalLength = getLength(geom);
			const halfLength = totalLength / 2;
			
			let accumulatedLength = 0;
			let midPoint = coordinates[0];
			
			for (let i = 0; i < coordinates.length - 1; i++) {
				const segment = new LineString([coordinates[i], coordinates[i + 1]]);
				const segmentLength = getLength(segment);
				
				if (accumulatedLength + segmentLength >= halfLength) {
					const remainingLength = halfLength - accumulatedLength;
					const ratio = remainingLength / segmentLength;
					
					midPoint = [
						coordinates[i][0] + (coordinates[i + 1][0] - coordinates[i][0]) * ratio,
						coordinates[i][1] + (coordinates[i + 1][1] - coordinates[i][1]) * ratio
					];
					break;
				}
				
				accumulatedLength += segmentLength;
			}
			
			measureTooltip.setPosition(midPoint);
			measureTooltipElement.className = 'ol-tooltip ol-tooltip-measure';
			measureTooltip.setOffset([0, -15]);

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
				staticTooltips.forEach(tooltip => {
					mapInstance.removeOverlay(tooltip.overlay);
					if (tooltip.element && tooltip.element.parentNode) {
						tooltip.element.parentNode.removeChild(tooltip.element);
					}
				});
			}
		};
	}, [mapInstance, isActive]);

	return { currentLength };
};

