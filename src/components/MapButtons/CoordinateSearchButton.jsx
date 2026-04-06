import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import FloatingWindow from '../FloatingWindow/FloatingWindow.jsx';
import { useWindowControls } from '../WindowControls/useWindowControls.js';
import { MEDIUM_BLUE, MEDIUM_DARK_BLUE, ORANGE } from '../../consts/style.js';
import showOnMapIcon from '../../assets/resources/images/assets/showOnMap.png';
import { Button } from 'antd';
import { SearchByWGSCoordinatesForm } from '../CoordinateSearch/SearchByWGSCoordinatesForm.jsx';

export function CoordinateSearchButton() {
	const windowId = useMemo(() => 'coordinate-search', []);
	const { isMaximized } = useWindowControls({ windowId });
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [latitude, setLatitude] = useState('');
	const [longitude, setLongitude] = useState('');
	const [zoom, setZoom] = useState(13);

	const initialPosition = useMemo(() => {
		if (typeof window === 'undefined') return { x: 100, y: 100 };

		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;

		const modalWidth = 460;
		const modalHeight = 350;

		return {
			x: Math.max(0, (windowWidth - modalWidth) / 2),
			y: Math.max(0, (windowHeight - modalHeight) / 2),
		};
	}, []);

	const handleClick = () => {
		setIsDialogOpen(true);
		if (!latitude) setLatitude('55.751244');
		if (!longitude) setLongitude('37.618423');
	};

	const handleConfirm = useCallback(() => {
		const lat = parseFloat(latitude);
		const lon = parseFloat(longitude);

		// Validate coordinates
		if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) {
			return;
		}

		// Convert WGS84 to Web Mercator (EPSG:3857)
		const x = (lon * 20037508.34) / 180;
		const y = Math.log(Math.tan(((90 + lat) * Math.PI) / 360)) / (Math.PI / 180);
		const yMercator = (y * 20037508.34) / 180;

		if (window.map) {
			window.map.getView().animate({
				center: [x, yMercator],
				zoom: zoom,
				duration: 300,
			});
		}
	}, [latitude, longitude, zoom]);

	const handleClose = useCallback(() => {
		setIsDialogOpen(false);
	}, []);

	return (
		<>
			<CoordinateSearchButtonStyle
				img={showOnMapIcon}
				title="Поиск по координатам"
				onClick={handleClick}
			>
				<img src={showOnMapIcon} alt="Поиск по координатам" />
			</CoordinateSearchButtonStyle>

			{isDialogOpen && (
				<FloatingWindow
					title="Переход по WGS-координатам"
					initialPosition={initialPosition}
					width={460}
					windowId={windowId}
					onClose={handleClose}
					showControls={true}
				>
					<WindowContainer>
						<WindowContent isMaximized={isMaximized}>
							<SearchByWGSCoordinatesForm
								latitude={latitude}
								longitude={longitude}
								zoom={zoom}
								onLatitudeChange={setLatitude}
								onLongitudeChange={setLongitude}
								onZoomChange={setZoom}
							/>

							<ButtonGroup>
								<ButtonStyle onClick={handleConfirm}>Перейти</ButtonStyle>
								<ButtonStyle onClick={handleClose}>Отмена</ButtonStyle>
							</ButtonGroup>
						</WindowContent>
					</WindowContainer>
				</FloatingWindow>
			)}
		</>
	);
}

const CoordinateSearchButtonStyle = styled(Button).withConfig({
	shouldForwardProp: prop => !['active'].includes(prop),
})`
	border: 1px solid ${MEDIUM_DARK_BLUE} !important;
	box-shadow: 0 0 0 ${MEDIUM_BLUE} !important;
	border-radius: 20px;
	height: 34px;
	width: 34px;

	background-color: ${props => (props.$active ? ORANGE : MEDIUM_BLUE)} !important;

	&:hover {
		background-color: ${ORANGE} !important;
	}

	img {
		width: 24px;
		height: 24px;
		object-fit: contain;
	}
`;

const WindowContainer = styled.div`
	border-radius: 8px;
	overflow: hidden;
	background: white;
`;

const WindowContent = styled.div`
	padding: 12px 16px;
	max-height: ${props => (props.isMaximized ? 'calc(100vh - 100px)' : '500px')};
	overflow-y: auto;
`;

const ButtonGroup = styled.div`
	display: flex;
	justify-content: center;
	gap: 8px;
	margin-top: 12px;
	padding-bottom: 4px;
`;

const ButtonStyle = styled.button`
	padding: 8px 20px;
	border: none;
	border-radius: 8px;
	font-size: 14px;
	font-weight: 500;
	cursor: pointer;
	transition: all 0.2s ease;
	min-width: 100px;
	background: ${MEDIUM_BLUE};
	color: white;

	&:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		background: ${ORANGE};
	}
`;
