import React from 'react';
import './FullscreenButton.css';

const FullscreenButton = ({ isFullscreen, onToggle }) => {
	return (
		<button
			className="fullscreen-button"
			onClick={onToggle}
			title={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
			aria-label={isFullscreen ? 'Выйти из полноэкранного режима' : 'Полноэкранный режим'}
		>
<svg width="24" height="24" viewBox="0 0 24 24">
  <g transform="rotate(-90 12 12)">
    <line x1="15" y1="21" x2="21" y2="15" stroke="#ccc" strokeWidth="2" strokeLinecap="round"/>
    <line x1="11" y1="21" x2="21" y2="11" stroke="#ccc" strokeWidth="2" strokeLinecap="round"/>
    <line x1="7" y1="21" x2="21" y2="7" stroke="#ccc" strokeWidth="2" strokeLinecap="round"/>
  </g>
</svg>
		</button>
	);
};

export default FullscreenButton;
