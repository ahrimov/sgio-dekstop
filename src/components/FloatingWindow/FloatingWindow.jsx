import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { windowClosed, windowCreated } from '../WindowControls/store.js';
import { WindowControls } from '../WindowControls/windowControls.jsx';
import { useWindowControls } from '../WindowControls/useWindowControls.js';

const FloatingWindow = ({
	title,
	children,
	initialPosition = { x: 100, y: 100 },
	width = 350,
	height,
	onClose,
	windowId,
	showControls = true,
}) => {
	const {
		window: windowState,
		isMinimized,
		isMaximized,
		move,
		focus,
		bounds,
	} = useWindowControls({ windowId });
	const [isDragging, setIsDragging] = useState(false);
	const dragOffset = useRef({ x: 0, y: 0 });
	const containerRef = useRef();
	const { x, y } = bounds || initialPosition;

	useEffect(() => {
		windowCreated({
			id: windowId,
			title,
			initialBounds: {
				...initialPosition,
				width,
				height,
			},
			onClose,
		});

		return () => {
			windowClosed(windowId);
		};
	}, [windowId, title, initialPosition, width, height, onClose]);

	const handleMouseDown = useCallback(
		e => {
			if (e.target.closest('.drag-handle')) {
				const rect = containerRef.current.getBoundingClientRect();
				dragOffset.current = {
					x: e.clientX - rect.left,
					y: e.clientY - rect.top,
				};
				setIsDragging(true);

				focus();

				e.preventDefault();
			}
		},
		[focus]
	);

	const handleMouseMove = useCallback(
		e => {
			if (!isDragging || isMaximized) return;

			const container = containerRef.current;
			const containerRect = container.getBoundingClientRect();
			const rootNode = document.querySelector('#root');
			if (!rootNode) return;
			const viewportRect = rootNode.getBoundingClientRect();

			let newX = e.clientX - dragOffset.current.x;
			let newY = e.clientY - dragOffset.current.y;

			newX = Math.max(0, Math.min(newX, viewportRect.width - containerRect.width));
			newY = Math.max(
				viewportRect.top,
				Math.min(newY, viewportRect.height + viewportRect.top - containerRect.height)
			);

			move({ x: newX, y: newY });
		},
		[isDragging, isMaximized, move]
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	useEffect(() => {
		if (isDragging) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);

			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	const handleClose = () => {
		if (onClose) onClose();
	};

	if (isMinimized) {
		return null;
	}

	return (
		<FloatingContainer
			ref={containerRef}
			style={{
				left: x,
				top: y,
				width: isMaximized ? '100vw' : width,
				minHeight: isMaximized ? '100vh' : '',
				borderRadius: isMaximized ? '0' : '8px',
				zIndex: windowState?.zIndex || 1000,
			}}
			$isMaximized={isMaximized}
			onMouseDown={handleMouseDown}
		>
			<WindowHeader className="drag-handle">
				<WindowTitle>{title}</WindowTitle>
				{showControls && <WindowControls windowId={windowId} onClose={handleClose} />}
			</WindowHeader>

			<WindowContent>{children}</WindowContent>
		</FloatingContainer>
	);
};

const FloatingContainer = styled.div`
	position: fixed;
	background: white;
	border: 1px solid #ccc;
	border-radius: 8px;
	box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	z-index: 1000;
	min-width: 200px;
	min-height: 100px;
	user-select: none;
`;

const WindowHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	background: rgb(17, 102, 162);
	border-radius: ${props => (props.$isMaximized ? '0' : '8px 8px 0 0')};
	cursor: move;
	user-select: none;
`;

const WindowTitle = styled.span`
	color: white;
	font-weight: 500;
	font-size: 14px;
`;

const WindowContent = styled.div`
	overflow: auto;
`;

export default FloatingWindow;
