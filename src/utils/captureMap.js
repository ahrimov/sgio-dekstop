/**
 * Captures the current map view as a canvas element (map only, no UI buttons).
 * @param {import('ol/Map').default} map - OpenLayers map instance
 * @returns {HTMLCanvasElement} Canvas with the composited map image
 */
export function captureMapCanvas(map) {
	if (!map) {
		throw new Error('Map instance not available');
	}

	// Force a render so the canvas is up-to-date
	map.renderSync();

	const mapCanvas = document.createElement('canvas');
	const size = map.getSize();
	mapCanvas.width = size[0];
	mapCanvas.height = size[1];
	const mapContext = mapCanvas.getContext('2d');

	// Composite all OL canvas layers into one canvas
	const viewportElement = map.getViewport();
	const canvases = viewportElement.querySelectorAll('.ol-layer canvas');

	canvases.forEach(canvas => {
		if (canvas.width > 0) {
			const opacity = canvas.parentNode.style.opacity || canvas.style.opacity;
			mapContext.globalAlpha = opacity === '' ? 1 : Number(opacity);

			const transform = canvas.style.transform;
			const matrix = transform
				.match(/^matrix\(([^(]*)\)$/)?.[1]
				?.split(',')
				.map(Number);

			if (matrix) {
				CanvasRenderingContext2D.prototype.setTransform.apply(mapContext, matrix);
			} else {
				mapContext.setTransform(1, 0, 0, 1, 0, 0);
			}

			mapContext.drawImage(canvas, 0, 0);
		}
	});

	// Reset transform
	mapContext.globalAlpha = 1;
	mapContext.setTransform(1, 0, 0, 1, 0, 0);

	return mapCanvas;
}

/**
 * Rotates a canvas by the given angle in degrees and returns a new canvas
 * sized to fit the rotated image without clipping.
 * @param {HTMLCanvasElement} sourceCanvas - Source canvas to rotate
 * @param {number} angleDeg - Rotation angle in degrees
 * @returns {HTMLCanvasElement} New rotated canvas
 */
export function rotateCanvas(sourceCanvas, angleDeg) {
	const angleRad = (angleDeg * Math.PI) / 180;
	const w = sourceCanvas.width;
	const h = sourceCanvas.height;

	// Calculate bounding box of rotated rectangle
	const cos = Math.abs(Math.cos(angleRad));
	const sin = Math.abs(Math.sin(angleRad));
	const newW = Math.ceil(w * cos + h * sin);
	const newH = Math.ceil(w * sin + h * cos);

	const rotatedCanvas = document.createElement('canvas');
	rotatedCanvas.width = newW;
	rotatedCanvas.height = newH;
	const ctx = rotatedCanvas.getContext('2d');

	// Move to center, rotate, then draw centered
	ctx.translate(newW / 2, newH / 2);
	ctx.rotate(angleRad);
	ctx.drawImage(sourceCanvas, -w / 2, -h / 2);

	return rotatedCanvas;
}
