import React, { useState, useEffect, useRef, useCallback } from 'react';
import styled from 'styled-components';

const FloatingWindow = ({ initialPosition = { x: 100, y: 100 }, children }) => {
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef();

  const handleMouseDown = useCallback(e => {
    if (e.target.closest('.drag-handle')) {
    const rect = containerRef.current.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
    setIsDragging(true);

    e.preventDefault();
    }
  }, []);

  const handleMouseMove = useCallback(
    e => {
      if (!isDragging) return;

        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        let newX = e.clientX - dragOffset.current.x;
        let newY = e.clientY - dragOffset.current.y;

        newX = Math.max(0, Math.min(newX, viewportWidth - containerRect.width));
        newY = Math.max(0, Math.min(newY, viewportHeight - containerRect.height));

        setPosition({ x: newX, y: newY });
    },
    [isDragging]
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

  return (
    <FloatingContainer
      ref={containerRef}
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      onMouseDown={handleMouseDown}
      isDragging={isDragging}
    >
      {children}
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
  cursor: ${props => (props.isDragging ? 'grabbing' : 'grab')};

  &:active {
    cursor: grabbing;
  }
`;

export default FloatingWindow;
