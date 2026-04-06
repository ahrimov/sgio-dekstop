import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';
import { windowClosed, windowCreated } from '../WindowControls/store.js';
import { WindowControls } from '../WindowControls/windowControls.jsx';
import { useWindowControls } from '../WindowControls/useWindowControls.js';
import { DoubleLeftOutlined, DoubleRightOutlined } from '@ant-design/icons';
import { Typography } from 'antd';
import { WHITE } from '../../consts/style.js';

const { Text } = Typography;

const FloatingWindow = ({
	title,
	children,
	initialPosition = { x: 100, y: 100 },
	width = 350,
	height,
	titleWidth,
	onClose,
	windowId,
	showControls = true,
	showMinMax = true,
	isMultiple = false,
	onPrevious,
	onNext,
	current,
	total = 0,
	disablePrevious = false,
	disableNext = false,
	compact = false,
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
	const [isResizing, setIsResizing] = useState(false);
	const dragOffset = useRef({ x: 0, y: 0 });
	const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
	const [size, setSize] = useState({ width, height });
	const initialHeightRef = useRef(null);
	const containerRef = useRef();
	const { x, y } = bounds || initialPosition;

	useEffect(() => {
		if (containerRef.current && initialHeightRef.current === null) {
			const rect = containerRef.current.getBoundingClientRect();
			initialHeightRef.current = rect.height;
		}
	}, []);

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
			if (e.target.closest('.resize-handle')) {
				return;
			}
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

	const handleResizeMouseDown = useCallback(
		e => {
			e.stopPropagation();
			e.preventDefault();

			const rect = containerRef.current.getBoundingClientRect();
			resizeStart.current = {
				x: e.clientX,
				y: e.clientY,
				width: rect.width,
				height: rect.height,
			};
			setIsResizing(true);
			focus();
		},
		[focus]
	);

	const handleMouseMove = useCallback(
		e => {
			if (isMaximized) return;

			if (isDragging) {
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
			} else if (isResizing) {
				const deltaX = e.clientX - resizeStart.current.x;
				const deltaY = e.clientY - resizeStart.current.y;

				const rootNode = document.querySelector('#root');
				if (!rootNode) return;
				const viewportRect = rootNode.getBoundingClientRect();

				const currentX = bounds?.x || initialPosition.x;
				const currentY = bounds?.y || initialPosition.y;

				const minHeight = initialHeightRef.current || height || 350;
				const minWidth = width || 360;

				const maxWidth = viewportRect.width - currentX;
				const maxHeight = viewportRect.height + viewportRect.top - currentY;

				let newWidth = resizeStart.current.width + deltaX;
				let newHeight = resizeStart.current.height + deltaY;

				newWidth = Math.max(minWidth, Math.min(newWidth, maxWidth));
				newHeight = Math.max(minHeight, Math.min(newHeight, maxHeight));

				setSize({
					width: newWidth,
					height: newHeight,
				});
			}
		},
		[isDragging, isResizing, isMaximized, move]
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
		setIsResizing(false);
	}, []);

	useEffect(() => {
		if (isDragging || isResizing) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);

			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		}
	}, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

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
				width: isMaximized ? '100vw' : size.width,
				height: isMaximized ? '100vh' : size.height || 'auto',
				borderRadius: isMaximized ? '0' : '8px',
				zIndex: windowState?.zIndex || 100000,
			}}
			$isMaximized={isMaximized}
			onMouseDown={handleMouseDown}
		>
			<WindowHeader className="drag-handle" $compact={compact}>
				{isMultiple ? (
					<>
						<ControlButton onClick={onPrevious} disabled={disablePrevious}>
							<DoubleLeftOutlined />
						</ControlButton>
						<ControlButton onClick={onNext} disabled={disableNext}>
							<DoubleRightOutlined />
						</ControlButton>
						<Text
							style={{
								color: WHITE,
								paddingLeft: '5px',
								paddingRight: '5px',
								width: '65px',
								fontSize: '12px',
							}}
						>
							{current + 1} из {total}
						</Text>
					</>
				) : null}
				<WindowTitle $compact={compact} title={title} $titleWidth={titleWidth}>
					{title}
				</WindowTitle>
				{showControls && (
					<WindowControls
						windowId={windowId}
						onClose={handleClose}
						compact={compact}
						showMinMax={showMinMax}
					/>
				)}
			</WindowHeader>

			<WindowContent>{children}</WindowContent>
			{!isMaximized && (
				<ResizeHandle className="resize-handle" onMouseDown={handleResizeMouseDown} />
			)}
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
	overflow: hidden;
`;

const WindowHeader = styled.div`
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: ${props => (props.$compact ? '3px 6px' : '12px 16px')};
	background: rgb(17, 102, 162);
	border-radius: ${props => (props.$isMaximized ? '0' : '8px 8px 0 0')};
	cursor: move;
	user-select: none;
`;

const WindowTitle = styled.span`
	color: white;
	font-weight: ${props => (props.$compact ? '500' : '600')};
	max-width: ${props => (props.$titleWidth ? props.$titleWidth : '220px')};
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	font-size: ${props => (props.$compact ? '14px' : '16px')};
	font-family: 'Arial Narrow', sans-serif;
`;

const ControlButton = styled.button`
	background: none;
	width: ${props => (props.$compact ? '24px' : '28px')};
	height: ${props => (props.$compact ? '24px' : '28px')};
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	color: #ffffff;
	transition: all 0.2s;
	border: 1px solid #ffffff;

	&:hover:not(:disabled) {
		color: #000000;
		background-color: #ffffff;
	}

	&:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
`;

const WindowContent = styled.div`
	overflow: auto;
	flex: 1;
`;

const ResizeHandle = styled.div`
	position: absolute;
	bottom: 0;
	right: 0;
	width: 16px;
	height: 16px;
	cursor: nwse-resize;
	z-index: 10;
	display: flex;
	align-items: flex-end;
	justify-content: flex-end;

	&::before {
		content: '';
		position: absolute;
		bottom: 0px;
		right: 5px;
		width: 1px;
		height: 12px;
		background: #999;
		transform: rotate(45deg);
		box-shadow:
			4px -3px 0 0 #999,
			6px -6px 0 0 #999;
	}
`;

export default FloatingWindow;
