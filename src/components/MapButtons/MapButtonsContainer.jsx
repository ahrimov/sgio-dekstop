import React from 'react';
import { Flex } from 'antd';
import { PanButton } from './PanButton.jsx';
import { InfoButton } from './InfoButton.jsx';
import { DrawButton } from './DrawButton.jsx';
import { ZoomInButton } from './ZoomInButton.jsx';
import { ZoomOutButton } from './ZoomOutButton.jsx';
import { MeasureButton } from './MeasureButton.jsx';
import { AreaMeasureButton } from './AreaMeasureButton.jsx';
import { SaveMapImageButton } from './SaveMapImageButton.jsx';
import { PrintMapButton } from './PrintMapButton.jsx';

export function MapButtonsContainer() {
	return (
		<Flex gap={0} style={{ position: 'absolute', top: '20px', right: '100px' }}>
			<DrawButton />
			<InfoButton />
			<PanButton />
			<ZoomInButton />
			<ZoomOutButton />
			<MeasureButton />
			<AreaMeasureButton />
			<PrintMapButton />
			<SaveMapImageButton />
		</Flex>
	);
}
