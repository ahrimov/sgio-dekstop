import React from 'react';
import { Flex } from 'antd';
import { PanButton } from './PanButton.jsx';
import { InfoButton } from './InfoButton.jsx';
import { DrawButton } from './DrawButton.jsx';

export function MapButtonsContainer() {
	return (
		<Flex gap={0} style={{ position: 'absolute', top: '20px', right: '100px' }}>
			<DrawButton />
			<InfoButton />
			<PanButton />
		</Flex>
	);
}
