import React from 'react';
import { BaseMapButton } from './BaseMapButton.jsx';
import { openIliReverseDialog } from '../../store/iliReverse.js';
import iliReverseImage from '../../assets/resources/images/assets/iliCalc.png';

export function ILIReverseButton() {
	const handleClick = () => {
		openIliReverseDialog();
	};

	return (
		<BaseMapButton
			active={false}
			img={iliReverseImage}
			title="Разворот отчёта ВТД"
			onClick={handleClick}
			styleImage={{ width: 20, height: 20 }}
		/>
	);
}
