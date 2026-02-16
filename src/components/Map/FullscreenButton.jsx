import React from 'react';
import './FullscreenButton.css';

const FullscreenButton = ({ isFullscreen, onToggle }) => {
  return (
    <button
      className="fullscreen-button"
      onClick={onToggle}
      title={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
      aria-label={isFullscreen ? "Выйти из полноэкранного режима" : "Полноэкранный режим"}
    >
      {isFullscreen ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="4 14 10 14 10 20"></polyline>
          <line x1="20" y1="4" x2="10" y2="14"></line>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="4" y1="20" x2="21" y2="3"></line>
        </svg>
      )}
    </button>
  );
};

export default FullscreenButton;