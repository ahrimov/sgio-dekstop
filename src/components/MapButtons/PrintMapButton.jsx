import React from 'react';
import { BaseMapButton } from './BaseMapButton.jsx';
import printerImage from '../../assets/resources/images/assets/printer.png';
import { captureMapCanvas } from '../../utils/captureMap.js';

/**
 * Captures the map canvas (without UI buttons) and opens a preview window
 * with the map image. The user can then print from the preview.
 */
export function PrintMapButton() {
	const handleClick = () => {
		try {
			const canvas = captureMapCanvas(window.map);
			const dataUrl = canvas.toDataURL('image/png');

			// Open a new window with a styled preview of the map
			const printWindow = window.open('', '_blank');
			if (!printWindow) {
				console.error('Could not open print window');
				return;
			}

			printWindow.document.write(`
				<!DOCTYPE html>
				<html>
				<head>
					<title>Печать карты — Предпросмотр</title>
					<style>
						* {
							margin: 0;
							padding: 0;
							box-sizing: border-box;
						}
						body {
							font-family: 'Segoe UI', Arial, sans-serif;
							background: #f0f2f5;
							color: #333;
						}
						.toolbar {
							display: flex;
							align-items: center;
							justify-content: space-between;
						}
						.btn {
							padding: 8px 20px;
							border: none;
							border-radius: 6px;
							font-size: 14px;
							font-weight: 500;
							cursor: pointer;
							transition: all 0.2s ease;
						}
						.btn-print {
							background: #1166A2;
							color: white;
						}
						.btn-print:hover {
							background: #ffbf55;
						}
						.preview-container {
							display: flex;
							justify-content: center;
							padding: 18px;
						}
						.preview-paper {
							background: white;
							border-radius: 4px;
							box-shadow: 0 4px 16px rgba(0,0,0,0.1);
							padding: 2px;
							max-width: 95vw;
						}
						.preview-paper img {
							display: block;
							max-width: 100%;
							height: auto;
						}

						@media print {
							.toolbar {
								display: none !important;
							}
							body {
								background: white;
							}
							.preview-container {
								padding: 0;
							}
							.preview-paper {
								box-shadow: none;
								border-radius: 0;
								padding: 0;
								max-width: 100%;
							}
							.preview-paper img {
								max-width: 100%;
								max-height: 100vh;
								object-fit: contain;
							}
						}
					</style>
				</head>
				<body>
					<div class="toolbar">
						<div class="toolbar-buttons">
							<button class="btn btn-print" onclick="window.print()">Печать</button>
							<button class="btn btn-print" onclick="window.close()">Закрыть</button>
						</div>
					</div>
					<div class="preview-container">
						<div class="preview-paper">
							<img src="${dataUrl}" alt="Карта" />
						</div>
					</div>
				</body>
				</html>
			`);
			printWindow.document.close();
		} catch (error) {
			console.error('Error printing map:', error);
		}
	};

	return (
		<BaseMapButton
			active={false}
			img={printerImage}
			title="Печать карты"
			onClick={handleClick}
			styleImage={{ scale: 1.5 }}
		/>
	);
}
