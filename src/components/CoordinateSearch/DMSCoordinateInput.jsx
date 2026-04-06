import React, { useEffect, useState, useCallback } from 'react';
import { InputMask } from '@react-input/mask';
import styled from 'styled-components';
import {
	transformDecimalToMinutesAndSeconds,
	transformToDecimal,
} from '../../utils/coordinateTransformations.js';
import { TEXT_COLOR } from '../../consts/style.js';

/**
 * A masked input for entering coordinates in Degrees-Minutes-Seconds format.
 * Format: DD° MM' SS.SS''
 *
 * Uses @react-input/mask (React 19 compatible) for consistent input masking.
 * Accepts a decimal degree value and converts it to DMS for display.
 * On change, converts back to decimal and calls the handler.
 *
 * @param {Object} props
 * @param {string|number} props.value - Decimal degree value
 * @param {function} props.handler - Callback with new decimal value
 * @param {Object} [props.style] - Optional inline styles
 */
export const DMSCoordinateInput = ({ value, handler, style }) => {
	const [dmsValue, setDmsValue] = useState(() => transformDecimalToMinutesAndSeconds(value));

	useEffect(() => {
		setDmsValue(transformDecimalToMinutesAndSeconds(value));
	}, [value]);

	const handleChange = useCallback(
		e => {
			const newDms = e.target.value;
			setDmsValue(newDms);

			// Try to parse and convert back to decimal
			try {
				if (newDms.includes('°') && newDms.includes("'") && newDms.includes("''")) {
					const newDecimal = transformToDecimal(newDms);
					if (!isNaN(parseFloat(newDecimal))) {
						handler(newDecimal);
					}
				}
			} catch {
				// Ignore parse errors during typing
			}
		},
		[handler]
	);

	return (
		<StyledInputMask
			value={dmsValue}
			mask="00° 00' 00.00''"
			replacement={{ 0: /\d/ }}
			showMask
			onChange={handleChange}
			style={style}
			title="ГГ°ММ'СС.СС''"
		/>
	);
};

const StyledInputMask = styled(InputMask)`
	height: 17px;
	font-size: inherit;
	color: ${TEXT_COLOR};
	border: 1px solid ${TEXT_COLOR};
	border-radius: 4px;
	min-height: 20px;
	width: 110px;
	margin: 0;
	padding: 2px 6px;
	font-family: monospace, sans-serif;
	box-sizing: border-box;

	&:focus {
		outline: none;
		border-color: ${TEXT_COLOR};
		box-shadow: 0 0 0 2px rgba(0, 94, 154, 0.1);
	}
`;
