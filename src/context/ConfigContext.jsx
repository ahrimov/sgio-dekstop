import React, { createContext, useContext, useState } from 'react';

const ConfigContext = createContext();

export const ConfigProvider = ({ children }) => {
	const [config, setConfig] = useState({
		showSystemProperties: false,
		showAllPrecision: false,
	});

	const updateConfig = (newConfig) => {
		setConfig(prevConfig => ({
			...prevConfig,
			...newConfig,
		}));
	};

	return (
		<ConfigContext.Provider value={{ config, updateConfig }}>
			{children}
		</ConfigContext.Provider>
	);
};

export const useConfig = () => {
	const context = useContext(ConfigContext);
	if (!context) {
		throw new Error('useConfig must be used within a ConfigProvider');
	}
	return context;
};