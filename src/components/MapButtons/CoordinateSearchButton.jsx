import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import FloatingWindow from '../FloatingWindow/FloatingWindow.jsx';
import { useWindowControls } from '../WindowControls/useWindowControls.js';
import { MEDIUM_BLUE, MEDIUM_DARK_BLUE, ORANGE } from '../../consts/style.js';
import showOnMapIcon from '../../assets/resources/images/assets/showOnMap.png';
import { Button } from 'antd';

export function CoordinateSearchButton() {
	const windowId = useMemo(() => 'coordinate-search', []);
	const { isMaximized } = useWindowControls({ windowId });
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [latitude, setLatitude] = useState('');
	const [longitude, setLongitude] = useState('');

	const initialPosition = useMemo(() => {
		if (typeof window === 'undefined') return { x: 100, y: 100 };

		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;

		const modalWidth = 400;
		const modalHeight = 300;

		return {
			x: Math.max(0, (windowWidth - modalWidth) / 2),
			y: Math.max(0, (windowHeight - modalHeight) / 2),
		};
	}, []);

	const handleClick = () => {
		setIsDialogOpen(true);
		setLatitude('');
		setLongitude('');
	};

	const handleConfirm = () => {
		// Простая валидация без отображения ошибок
		if (!latitude.trim() || !longitude.trim()) {
			return;
		}

		const lat = parseFloat(latitude);
		const lon = parseFloat(longitude);

		// Проверяем корректность координат
		if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lon) || lon < -180 || lon > 180) {
			return;
		}

		// Преобразуем координаты из WGS84 в Web Mercator (EPSG:3857)
		const x = lon * 20037508.34 / 180;
		const y = Math.log(Math.tan((90 + lat) * Math.PI / 360)) / (Math.PI / 180);
		const yMercator = y * 20037508.34 / 180;

		if (window.map) {
			window.map.getView().animate({
				center: [x, yMercator],
				duration: 300
			});
		}
	};

	const handleClose = useCallback(() => {
		setIsDialogOpen(false);
		setLatitude('');
		setLongitude('');
	}, []);

	const handleKeyPress = (e) => {
		if (e.key === 'Enter') {
			handleConfirm();
		}
	};

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
					title="Поиск по координатам"
					initialPosition={initialPosition}
					width={300}
					windowId={windowId}
					onClose={handleClose}
					showControls={true}
				>
					<WindowContainer>
						<WindowContent isMaximized={isMaximized}>
							<FormGroup>
								<FormRow>
									<Label>Широта:</Label>
									<InputWrapper>
										<Input
											type="text"
											value={latitude}
											onChange={(e) => setLatitude(e.target.value)}
											onKeyPress={handleKeyPress}
											autoFocus
										/>
									</InputWrapper>
								</FormRow>
							</FormGroup>

							<FormGroup>
								<FormRow>
									<Label>Долгота:</Label>
									<InputWrapper>
										<Input
											type="text"
											value={longitude}
											onChange={(e) => setLongitude(e.target.value)}
											onKeyPress={handleKeyPress}
										/>
									</InputWrapper>
								</FormRow>
							</FormGroup>

							<ButtonGroup>
								<ButtonStyle onClick={handleConfirm}>
									Перейти
								</ButtonStyle>
								<ButtonStyle onClick={handleClose}>
									Отмена
								</ButtonStyle>
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
	padding: 20px;
	max-height: ${props => (props.isMaximized ? 'calc(100vh - 100px)' : '400px')};
	overflow-y: auto;
`;

const FormGroup = styled.div`
	margin-bottom: 20px;

	&:last-of-type {
		margin-bottom: 24px;
	}
`;

const FormRow = styled.div`
	display: flex;
	align-items: flex-start;
	gap: 12px;
`;

const Label = styled.label`
	padding-top: 8px;
	font-size: 14px;
	font-weight: 500;
	color: ${MEDIUM_BLUE};
	white-space: nowrap;
`;

const InputWrapper = styled.div`
	flex: 1;
`;

const Input = styled.input`
	padding: 8px 12px;
	border: 1px solid #d9d9d9;
	border-radius: 4px;
	font-size: 14px;
	color: #333;
	transition: border-color 0.2s;

	&:focus {
		outline: none;
		border-color: ${MEDIUM_BLUE};
		box-shadow: 0 0 0 2px rgba(76, 147, 194, 0.1);
	}

	&::placeholder {
		color: #bfbfbf;
	}
`;

const ButtonGroup = styled.div`
	display: flex;
	justify-content: center;
	gap: 8px;
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
