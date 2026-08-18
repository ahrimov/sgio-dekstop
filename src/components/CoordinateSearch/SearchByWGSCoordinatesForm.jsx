import React, { useState, useCallback, useEffect } from 'react';
import styled from 'styled-components';
import {
	convertStrToFloat,
	constructZoomFromDistance,
} from '../../utils/coordinateTransformations.js';
import { TEXT_COLOR, MEDIUM_BLUE } from '../../consts/style.js';

/**
 * Default zoom-to-distance mapping for scale selection.
 * Each entry maps a zoom level to a human-readable distance string.
 */
const DEFAULT_DISTANCES = [
	{ zoom: 5, distance: '500 км', distanceInCentimeters: 50000000 },
	{ zoom: 7, distance: '100 км', distanceInCentimeters: 10000000 },
	{ zoom: 9, distance: '50 км', distanceInCentimeters: 5000000 },
	{ zoom: 11, distance: '10 км', distanceInCentimeters: 1000000 },
	{ zoom: 13, distance: '5 км', distanceInCentimeters: 500000 },
	{ zoom: 15, distance: '1 км', distanceInCentimeters: 100000 },
	{ zoom: 17, distance: '500 м', distanceInCentimeters: 50000 },
	{ zoom: 18, distance: '100 м', distanceInCentimeters: 10000 },
];

/**
 * Form for searching by WGS-84 coordinates.
 * Provides decimal degree inputs for latitude and longitude,
 * plus scale selection (from list or custom).
 *
 * @param {Object} props
 * @param {string} props.latitude - Current latitude value (decimal string)
 * @param {string} props.longitude - Current longitude value (decimal string)
 * @param {number} props.zoom - Current zoom level
 * @param {function} props.onLatitudeChange - Callback when latitude changes
 * @param {function} props.onLongitudeChange - Callback when longitude changes
 * @param {function} props.onZoomChange - Callback when zoom changes
 * @param {function} props.onScaleDistanceChange - Callback with the scale distance in cm
 */
export function SearchByWGSCoordinatesForm({
	latitude,
	longitude,
	zoom,
	onLatitudeChange,
	onLongitudeChange,
	onZoomChange,
	onScaleDistanceChange,
}) {
	const distances = DEFAULT_DISTANCES;
	const [customInput, setCustomInput] = useState(false);
	const [customDistance, setCustomDistance] = useState('1000');
	const map = window.map;

	useEffect(() => {
		if (customInput) return;

		const closestDistance = distances.reduce((closest, item) =>
			Math.abs(item.zoom - zoom) < Math.abs(closest.zoom - zoom) ? item : closest
		);
		onScaleDistanceChange(closestDistance.distanceInCentimeters);
		if (closestDistance.zoom !== zoom) onZoomChange(closestDistance.zoom);
	}, [customInput, distances, onScaleDistanceChange, onZoomChange, zoom]);

	const handleLatDecimalChange = useCallback(
		e => {
			const newLat = convertStrToFloat(e.target.value);
			onLatitudeChange(newLat);
		},
		[onLatitudeChange]
	);

	const handleLonDecimalChange = useCallback(
		e => {
			const newLon = convertStrToFloat(e.target.value);
			onLongitudeChange(newLon);
		},
		[onLongitudeChange]
	);

	const handleZoomFromList = useCallback(
		e => {
			const newZoom = parseInt(e.target.value, 10);
			const selectedDistance = distances.find(item => item.zoom === newZoom);
			onScaleDistanceChange(selectedDistance.distanceInCentimeters);
			onZoomChange(newZoom);
		},
		[distances, onScaleDistanceChange, onZoomChange]
	);

	const handleCustomDistanceChange = useCallback(
		e => {
			const val = e.target.value.replace(/[^0-9]/g, '');
			setCustomDistance(val);

			// Convert custom distance (cm) to zoom level using the map
			const distanceNum = parseInt(val, 10);
			if (distanceNum > 0 && map) {
				onScaleDistanceChange(distanceNum);
				const newZoom = constructZoomFromDistance(distanceNum, map);
				if (newZoom !== -1 && !isNaN(newZoom)) {
					onZoomChange(newZoom);
				}
			}
		},
		[map, onScaleDistanceChange, onZoomChange]
	);

	const handleCustomInputSelect = useCallback(() => {
		setCustomInput(true);
		const distanceNum = parseInt(customDistance, 10);
		if (distanceNum > 0) onScaleDistanceChange(distanceNum);
	}, [customDistance, onScaleDistanceChange]);

	const handleListInputSelect = useCallback(() => {
		setCustomInput(false);
	}, []);

	return (
		<Form>
			{/* Coordinate inputs block */}
			<CoordinateBlock>
				{/* Latitude - decimal */}
				<InputLabel>
					<TextInputLabel>
						Широта (WGS-84)
						<br />
						ГГ°ГГГГГГ
					</TextInputLabel>
				</InputLabel>
				<CoordInput
					value={latitude}
					onChange={handleLatDecimalChange}
					placeholder="55.751244"
					autoFocus
				/>

				{/* Longitude - decimal */}
				<InputLabel>
					<TextInputLabel>
						Долгота (WGS-84)
						<br />
						ГГ°ГГГГГГ
					</TextInputLabel>
				</InputLabel>
				<CoordInput
					value={longitude}
					onChange={handleLonDecimalChange}
					placeholder="37.618423"
				/>
			</CoordinateBlock>

			{/* Scale selection block */}
			<ZoomBlock>
				<LabelScale>
					<TextLabelScale>Масштаб</TextLabelScale>
				</LabelScale>
				<ChooserScale>
					{/* From list option */}
					<ScaleElement>
						<RadioButton>
							<input
								type="radio"
								name="choose-scale"
								id="choose-scale-list"
								value="list"
								checked={!customInput}
								onChange={handleListInputSelect}
							/>
							<label htmlFor="choose-scale-list">Из списка</label>
						</RadioButton>
						<ListLabel>
							<TextListLabel>1 см = </TextListLabel>
						</ListLabel>
						<Select
							id="scale-list"
							value={zoom}
							onChange={handleZoomFromList}
							disabled={customInput}
						>
							{distances.map(element => (
								<option key={element.zoom} value={element.zoom}>
									{element.distance}
								</option>
							))}
						</Select>
					</ScaleElement>

					{/* Custom option */}
					<ScaleElement>
						<RadioButton>
							<input
								type="radio"
								name="choose-scale"
								id="choose-scale-custom"
								value="custom"
								checked={customInput}
								onChange={handleCustomInputSelect}
							/>
							<label htmlFor="choose-scale-custom">Пользовательский</label>
						</RadioButton>
						<CustomLabel>
							<TextInputLabel>1 см = </TextInputLabel>
						</CustomLabel>
						<CustomInput
							value={customDistance}
							onChange={handleCustomDistanceChange}
							disabled={!customInput}
						/>
						<LabelUnits>
							<TextInputLabel>см</TextInputLabel>
						</LabelUnits>
					</ScaleElement>
				</ChooserScale>
			</ZoomBlock>

			{/* Warning message */}
			<Warning>
				Внимание! Координаты Широта/Долгота в системе координат WGS-84.
				{'\n'}Применяется в навигационных GPS-приемниках
			</Warning>
		</Form>
	);
}

/* ─── Styled Components ─── */

const Form = styled.div`
	font-size: 12px;
	color: ${TEXT_COLOR};
	display: block;
	padding: 8px 4px;
`;

const CoordinateBlock = styled.div`
	margin-top: 1%;
	margin-left: 1%;
	width: 53%;
	display: grid;
	grid-template-columns: 22fr 31fr;
	grid-row-gap: 5px;
	align-items: center;
`;

const InputLabel = styled.div`
	text-align: center;
	word-wrap: break-word;
	display: table;
`;

const TextInputLabel = styled.p`
	position: relative;
	cursor: default;
	margin: 0;
	text-align: center;
	vertical-align: middle;
	display: table-cell;
	font-size: 11px;
	line-height: 1.3;
`;

const CoordInput = styled.input`
	height: 17px;
	font-size: inherit;
	color: ${TEXT_COLOR};
	border: 1px solid ${TEXT_COLOR};
	border-radius: 4px;
	min-height: 20px;
	padding: 2px 6px;
	box-sizing: border-box;
	width: 100%;

	&:focus {
		outline: none;
		border-color: ${MEDIUM_BLUE};
		box-shadow: 0 0 0 2px rgba(76, 147, 194, 0.1);
	}
`;

const ZoomBlock = styled.div`
	display: grid;
	grid-template-columns: 15% 85%;
	margin-top: 8px;
`;

const LabelScale = styled.div`
	grid-column: 1 / 1;
	grid-row: 1 / 2;
`;

const TextLabelScale = styled.p`
	text-align: center;
	position: relative;
	top: 38%;
	font-size: 13px;
	cursor: default;
	margin: 0;
`;

const ChooserScale = styled.div`
	display: grid;
	border: 1px ${TEXT_COLOR} solid;
	grid-gap: 1px;
	background-color: ${TEXT_COLOR};
`;

const ScaleElement = styled.div`
	background-color: white;
	height: 22px;
	padding: 5px;
	display: flex;
	text-align: left;
	align-items: center;
`;

const RadioButton = styled.div`
	font-size: 12px;
	flex-grow: 3;
	text-align: left;
	white-space: nowrap;

	label {
		cursor: pointer;
		margin-left: 4px;
	}
`;

const ListLabel = styled.div`
	text-align: right;
	cursor: default;
	white-space: nowrap;
	font-size: 12px;
`;

const TextListLabel = styled.span`
	cursor: default;
`;

const Select = styled.select`
	height: 20px;
	font-size: inherit;
	color: ${TEXT_COLOR};
	border: 1px solid ${TEXT_COLOR};
	border-radius: 4px;
	min-height: 20px;
	min-width: 31%;
	cursor: pointer;

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
`;

const CustomLabel = styled.div`
	text-align: right;
	cursor: default;
	display: table;
	white-space: nowrap;
	font-size: 12px;
`;

const CustomInput = styled.input`
	font-size: inherit;
	width: 85px;
	color: ${TEXT_COLOR};
	border: 1px solid ${TEXT_COLOR};
	border-radius: 4px;
	min-height: 20px;
	padding: 2px 6px;
	box-sizing: border-box;

	&:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
`;

const LabelUnits = styled.div`
	display: table;
	margin-left: 4px;
	white-space: nowrap;
`;

const Warning = styled.div`
	margin-left: 1%;
	font-size: 14px;
	position: relative;
	white-space: pre-line;
	border: 0;
	cursor: default;
	margin-top: 8px;
	word-wrap: break-word;
	color: ${TEXT_COLOR};
`;
