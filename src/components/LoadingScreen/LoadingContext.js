import React, { createContext, useContext, useState } from 'react';

const LoadingContext = createContext();

export const useLoading = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoading must be used within LoadingProvider');
  }
  return context;
};

export const LoadingProvider = ({ children }) => {
  const [loadingState, setLoadingState] = useState({
    visible: false,
    current: 0,
    total: 0,
    currentFile: '',
    message: 'Загрузка слоев карты',
  });

  const startLoading = (totalLayers, message = 'Загрузка слоев карты') => {
    setLoadingState({
      visible: true,
      current: 0,
      total: totalLayers,
      currentFile: '',
      message,
    });
  };

  const updateProgress = (current, currentFile = '') => {
    setLoadingState(prev => ({
      ...prev,
      current,
      currentFile,
    }));
  };

  const finishLoading = () => {
    setLoadingState(prev => ({
      ...prev,
      visible: false,
    }));
  };

  return (
    <LoadingContext.Provider
      value={{
        loadingState,
        startLoading,
        updateProgress,
        finishLoading,
      }}
    >
      {children}
    </LoadingContext.Provider>
  );
};
