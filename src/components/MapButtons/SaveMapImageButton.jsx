import React, { useState, useMemo, useCallback } from 'react';
import styled from 'styled-components';
import { BaseMapButton } from './BaseMapButton.jsx';
import FloatingWindow from '../FloatingWindow/FloatingWindow.jsx';
import { useWindowControls } from '../WindowControls/useWindowControls.js';
import saveMapImage from '../../assets/resources/images/assets/saveMap.png';
import { DARK_BLUE, MEDIUM_BLUE, MEDIUM_DARK_BLUE, ORANGE } from '../../consts/style.js';
import { captureMapCanvas, rotateCanvas } from '../../utils/captureMap.js';

const electronAPI = window.electronAPI;

/**
 * Captures the map canvas (without UI buttons) and saves it as a PNG file.
 * Shows a FloatingWindow to optionally set a rotation angle before saving.
 */
export function SaveMapImageButton() {
	const windowId = useMemo(() => 'save-map-image', []);
	const { isMaximized } = useWindowControls({ windowId });
	const [isDialogOpen, setIsDialogOpen] = useState(false);
	const [rotationAngle, setRotationAngle] = useState('0');

	const initialPosition = useMemo(() => {
		if (typeof window === 'undefined') return { x: 100, y: 100 };

		const windowWidth = window.innerWidth;
		const windowHeight = window.innerHeight;

		const modalWidth = 300;
		const modalHeight = 200;

		return {
			x: Math.max(0, (windowWidth - modalWidth) / 2),
			y: Math.max(0, (windowHeight - modalHeight) / 2),
		};
	}, []);

	const handleClick = () => {
		setRotationAngle('0');
		setIsDialogOpen(true);
	};

	const handleClose = useCallback(() => {
		setIsDialogOpen(false);
		setRotationAngle('0');
	}, []);

	const handleSave = async () => {
		setIsDialogOpen(false);

		const angle = parseFloat(rotationAngle) || 0;

		try {
			let canvas = captureMapCanvas(window.map);

			// Apply rotation if needed
			if (angle !== 0) {
				canvas = rotateCanvas(canvas, angle);
			}

			// Convert to base64 PNG
			const dataUrl = canvas.toDataURL('image/png');
			const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');

			// Show save dialog
			const { filePath, canceled } = await electronAPI.showSaveDialog({
				title: 'Сохранить карту как PNG',
				defaultPath: `map-${new Date().toISOString().slice(0, 10)}.png`,
				filters: [{ name: 'PNG изображение', extensions: ['png'] }],
			});

			if (canceled || !filePath) return;

			// Write binary file
			await electronAPI.writeFileBinary(filePath, base64Data);

			console.log('Map saved to:', filePath);
		} catch (error) {
			console.error('Error saving map image:', error);
		}
	};

	const handleKeyPress = e => {
		if (e.key === 'Enter') {
			handleSave();
		}
	};

	return (
		<>
			<BaseMapButton
				active={false}
				img={saveMapImage}
				title="Сохранить видимую область карты в .png"
				onClick={handleClick}
			/>

			{isDialogOpen && (
				<FloatingWindow
					title="Сохранение видимой области карты в файл .png"
					initialPosition={initialPosition}
					width={400}
					windowId={windowId}
					onClose={handleClose}
					showControls={true}
					showMinMax={false}
					titleWidth={300}
				>
					<WindowContainer>
						<WindowContent isMaximized={isMaximized}>
							<FormGroup>
								<FormRow>
									<Label>Повернуть изображение на угол:</Label>
									<InputWrapper>
										<Input
											type="number"
											min={-360}
											max={360}
											value={rotationAngle}
											onChange={e => setRotationAngle(e.target.value)}
											onKeyPress={handleKeyPress}
											autoFocus
										/>
									</InputWrapper>
								</FormRow>
							</FormGroup>

							<ButtonGroup>
								<ButtonStyle onClick={handleSave}>Сохранить</ButtonStyle>
								<ButtonStyle onClick={handleClose}>Отмена</ButtonStyle>
							</ButtonGroup>
						</WindowContent>
					</WindowContainer>
				</FloatingWindow>
			)}
		</>
	);
}

/* ── Styled Components ── */

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
	align-items: center;
	gap: 12px;
`;

const Label = styled.label`
	font-size: 14px;
	font-weight: 500;
	color: ${MEDIUM_BLUE};
	white-space: nowrap;
`;

const InputWrapper = styled.div`
	flex: 1;
	display: flex;
	align-items: center;
	gap: 4px;
`;

const Input = styled.input`
	width: 100%;
	padding: 4px 6px;
	border: 1px solid #d9d9d9;
	border-radius: 4px;
	font-size: 14px;
	font-weight: 500;
	color: ${MEDIUM_DARK_BLUE};
	text-align: center;
	transition: border-color 0.2s;
	width: 50px;
	height: 15px;

	&:focus {
		outline: none;
		border-color: ${MEDIUM_BLUE};
		box-shadow: 0 0 0 2px rgba(76, 147, 194, 0.1);
	}

	/* Hide number input spinners */
	&::-webkit-inner-spin-button,
	&::-webkit-outer-spin-button {
		-webkit-appearance: none;
		margin: 0;
	}
	-moz-appearance: textfield;
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
	background: ${DARK_BLUE};
	color: white;

	&:hover {
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		background: ${ORANGE};
	}
`;
