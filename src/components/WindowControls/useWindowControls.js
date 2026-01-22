import { useUnit } from 'effector-react';
import {
	$windows,
	windowMinimized,
	windowMaximized,
	windowRestored,
	windowClosed,
	windowFocused,
	windowMoved,
} from './store.js';

export function useWindowControls({ windowId }) {
	const window = useUnit($windows)[windowId];
	const actions = useUnit({
		minimize: windowMinimized,
		maximize: windowMaximized,
		restore: windowRestored,
		close: windowClosed,
		focus: windowFocused,
		move: windowMoved,
	});

	return {
		window,
		isMinimized: !!window?.isMinimized,
		isMaximized: !!window?.isMaximized,
		isFocused: !!window?.isFocused,

		minimize: () => actions.minimize(windowId),
		maximize: () => actions.maximize(windowId),
		restore: () => actions.restore(windowId),
		close: () => actions.close(windowId),
		focus: () => actions.focus(windowId),
		move: bounds => actions.move({ id: windowId, bounds }),

		bounds: window?.bounds,
		title: window?.title,
	};
}
