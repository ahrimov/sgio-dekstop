import React, { useState } from 'react';
import styled from 'styled-components';
import { useUnit } from 'effector-react';
import { BaseMapButton } from './BaseMapButton.jsx';
import { toggleCrosshair, $showCrosshair } from '../../store/showCrosshair.js';
import crosshairIcon from '../../assets/resources/images/assets/80/sight.png';

function decimalToDMS(decimal) {
	const absolute = Math.abs(decimal);
	const degrees = Math.floor(absolute);
	const minutesDecimal = (absolute - degrees) * 60;
	const minutes = Math.floor(minutesDecimal);
	const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);

	return { degrees, minutes, seconds };
}

function formatCoordinates(lat, lon) {
	const latDMS = decimalToDMS(lat);
	const lonDMS = decimalToDMS(lon);

	// Добавляем незначащие нули для постоянной ширины
	const latDegreesStr = String(latDMS.degrees).padStart(2, '0');
	const latMinutesStr = String(latDMS.minutes).padStart(2, '0');
	const latSecondsStr = String(latDMS.seconds).padStart(5, '0');

	const lonDegreesStr = String(lonDMS.degrees).padStart(2, '0');
	const lonMinutesStr = String(lonDMS.minutes).padStart(2, '0');
	const lonSecondsStr = String(lonDMS.seconds).padStart(5, '0');

	return {
		lat: `${latDegreesStr}°${latMinutesStr}'${latSecondsStr}"`,
		lon: `${lonDegreesStr}°${lonMinutesStr}'${lonSecondsStr}"`,
	};
}

export function ShowCenterCoordinatesButton() {
	const showCrosshair = useUnit($showCrosshair);
	const [coordinates, setCoordinates] = useState({ lat: '', lon: '' });

	const handleClick = () => {
		toggleCrosshair();

		if (!showCrosshair && window.map) {
			const center = window.map.getView().getCenter();
			const lon = (center[0] * 180) / 20037508.34;
			const lat =
				(Math.atan(Math.exp((center[1] * Math.PI) / 20037508.34)) * 360) / Math.PI - 90;

			setCoordinates(formatCoordinates(lat, lon));
		}
	};

	// Обновляем координаты при движении карты
	React.useEffect(() => {
		if (!window.map || !showCrosshair) return;

		const updateCoordinates = () => {
			const center = window.map.getView().getCenter();
			const lon = (center[0] * 180) / 20037508.34;
			const lat =
				(Math.atan(Math.exp((center[1] * Math.PI) / 20037508.34)) * 360) / Math.PI - 90;

			setCoordinates(formatCoordinates(lat, lon));
		};

		updateCoordinates();
		console.log('updateCoordinates');

		window.map.on('pointerdrag', updateCoordinates);
		window.map.on('moveend', updateCoordinates);

		return () => {
			if (window.map) {
				window.map.un('pointerdrag', updateCoordinates);
				window.map.un('moveend', updateCoordinates);
			}
		};
	}, [showCrosshair, window.map]);

	return (
		<>
			<BaseMapButton
				img={crosshairIcon}
				title="Показать/скрыть прицел и координаты"
				onClick={handleClick}
			/>

			{showCrosshair && (
				<CoordinatesPanel>
					<div>Шир. {coordinates.lat}</div>
					<div>Долг. {coordinates.lon}</div>
				</CoordinatesPanel>
			)}
		</>
	);
}

const CoordinatesPanel = styled.div`
	position: absolute;
	top: 38px;
	left: 45px;

	z-index: 999;
	color: #005d98;
	font-size: 12px;
	font-weight: 500;
	padding: 1px 6px;
	border-radius: 4px;
	background-color: rgba(255, 255, 255, 0.5);
	cursor: default;
	user-select: none;
	pointer-events: none;
	text-shadow: rgba(128, 128, 128, 0.5) 1px 1px 1px;
	white-space: nowrap;
	border-top-left-radius: 0;
	border-top-right-radius: 0;
`;
