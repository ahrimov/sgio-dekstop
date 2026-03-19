import React from 'react';
import { Flex } from 'antd';
import { CoordinateSearchButton } from './CoordinateSearchButton.jsx';
import { ShowCenterCoordinatesButton } from './ShowCenterCoordinatesButton.jsx';

export function BottomLeftButtonsContainer() {
	return (
		<Flex vertical gap={0} style={{ position: 'absolute', bottom: '35px', left: '5px', zIndex: 1000 }}>
			<CoordinateSearchButton />
			<ShowCenterCoordinatesButton />
		</Flex>
	);
}
