import { createStore, createEvent, sample } from 'effector';
import { nanoid } from 'nanoid';

export const windowCreated = createEvent();
export const windowClosed = createEvent();
export const windowMinimized = createEvent();
export const windowMaximized = createEvent();
export const windowRestored = createEvent();
export const windowMoved = createEvent();
export const windowFocused = createEvent();
export const windowZIndexChanged = createEvent();

export const $windows = createStore({});
export const $focusedWindowId = createStore(null);
export const $maxZIndex = createStore(1000);
export const $visibleWindows = $windows.map(windows =>
	Object.values(windows).filter(w => w.isVisible && !w.isMinimized)
);

$windows
	.on(windowCreated, (windows, payload) => {
		const { id = nanoid(), title, initialBounds = {}, onClose } = payload;

		const newWindow = {
			id,
			title,
			bounds: {
				x: initialBounds.x || 100,
				y: initialBounds.y || 100,
				width: initialBounds.width || 400,
				height: initialBounds.height || 300,
			},
			oldBounds: {
				x: initialBounds.x || 100,
				y: initialBounds.y || 100,
				width: initialBounds.width || 400,
				height: initialBounds.height || 300,
			},
			isMinimized: false,
			isMaximized: false,
			isVisible: true,
			zIndex: $maxZIndex.getState() + 1,
			isFocused: true,
			onClose,
		};

		const updatedWindows = Object.values(windows)
			.map(w => ({
				...w,
				isFocused: false,
			}))
			.reduce((acc, w) => ({ ...acc, [w.id]: w }), {});

		return { ...updatedWindows, [id]: newWindow };
	})

	.on(windowClosed, (windows, id) => {
		const { [id]: _, ...rest } = windows;
		return rest;
	})

	.on(windowMinimized, (windows, id) => ({
		...windows,
		[id]: { ...windows[id], isMinimized: true, isVisible: false },
	}))

	.on(windowMaximized, (windows, id) => {
		const win = windows[id];
		if (!win) return windows;

		const rootNode = document.querySelector('#root');
		if (!rootNode) return windows;
		const viewportRect = rootNode.getBoundingClientRect();

		return {
			...windows,
			[id]: {
				...win,
				isMaximized: true,
				bounds: {
					...win.bounds,
					x: 0,
					y: viewportRect.top,
					width: viewportRect.width,
					height: viewportRect.height,
				},
			},
		};
	})

	.on(windowRestored, (windows, id) => {
		return {
			...windows,
			[id]: {
				...windows[id],
				bounds: windows[id].oldBounds,
				isMinimized: false,
				isMaximized: false,
				isVisible: true,
			},
		};
	})

	.on(windowMoved, (windows, { id, bounds }) => ({
		...windows,
		[id]: { ...windows[id], bounds: bounds, oldBounds: { ...windows[id].bounds, ...bounds } },
	}));

$focusedWindowId
	.on(windowFocused, (_, id) => id)
	.on(windowClosed, (focusedId, closedId) => (focusedId === closedId ? null : focusedId));

sample({
	clock: windowFocused,
	source: { windows: $windows, maxZIndex: $maxZIndex },
	fn: ({ maxZIndex }, focusedId) => {
		const newZIndex = maxZIndex + 1;
		return { id: focusedId, zIndex: newZIndex };
	},
	target: windowZIndexChanged,
});

$windows.on(windowZIndexChanged, (windows, { id, zIndex }) => ({
	...windows,
	[id]: { ...windows[id], zIndex },
}));

$maxZIndex.on(windowZIndexChanged, (max, { zIndex }) => Math.max(max, zIndex));
