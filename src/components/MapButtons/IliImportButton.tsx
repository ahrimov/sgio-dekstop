import React from 'react';
import { BaseMapButton } from './BaseMapButton.jsx';
import { openIliImportDialog } from '../../store/iliImport.js';
import iliImportImage from '../../assets/resources/images/assets/gridAdmIliImportXML.png';

export function ILIImportButton() {
	const handleClick = () => {
		openIliImportDialog();
	};

	const titleText = 'Импорт ВТД (XML)';
	return (
		<BaseMapButton
			active={false}
			img={iliImportImage}
			title={titleText}
			onClick={handleClick}
            styleImage={{ width: 20, height: 20 }}
		/>
	);
}
