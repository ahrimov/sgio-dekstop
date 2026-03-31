import React, { useRef, useState } from 'react';
import { InputNumber, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import styled from 'styled-components';

export function ColumnNumberSearch({
	setSelectedKeys,
	selectedKeys,
	confirm,
	clearFilters,
	placeholder = 'Поиск по числу',
	inputWidth = 188,
}) {
	const searchInput = useRef(null);
	const [localValue, setLocalValue] = useState(selectedKeys[0]);

	const handleConfirm = () => {
		setSelectedKeys(localValue !== null && localValue !== undefined ? [localValue] : []);
		confirm();
	};

	const handleReset = () => {
		setLocalValue(null);
		clearFilters();
		confirm({ closeDropdown: false });
	};

	return (
		<FilterContainer>
			<StyledInputNumber
				ref={searchInput}
				placeholder={placeholder}
				value={localValue}
				onChange={value => setLocalValue(value)}
				onPressEnter={handleConfirm}
				style={{ width: inputWidth }}
			/>
			<Space>
				<SearchButton onClick={handleConfirm} icon={<SearchOutlined />} size="small">
					Найти
				</SearchButton>
				<ResetButton onClick={handleReset} size="small">
					Сбросить
				</ResetButton>
			</Space>
		</FilterContainer>
	);
}

const FilterContainer = styled.div`
	padding: 8px;
	background: #ffffff;
`;

const StyledInputNumber = styled(InputNumber)`
	margin-bottom: 8px;
	display: block;
	border: 1px solid rgb(205, 205, 205);
	color: rgb(0, 51, 102);

	&:hover {
		border-color: #005d98;
	}

	&:focus,
	&:focus-within {
		border-color: #005d98;
		box-shadow: 0 0 0 2px rgba(0, 93, 152, 0.1);
	}

	.ant-input-number-input {
		color: rgb(0, 51, 102);
	}

	.ant-input-number-input::placeholder {
		color: rgba(0, 51, 102, 0.5);
	}
`;

const SearchButton = styled(Button)`
	width: 90px;
	background: #005d98 !important;
	border-color: #005d98 !important;
	color: #ffffff !important;
	font-weight: 500;
	transition: all 0.2s ease-in-out;

	&:hover:not(:disabled) {
		background-color: #ffaf30 !important;
		border-color: #ffaf30 !important;
	}

	.anticon {
		color: #ffffff;
	}
`;

const ResetButton = styled(Button)`
	width: 90px;
	background: #005d98 !important;
	border-color: #005d98 !important;
	color: #ffffff !important;
	font-weight: 500;
	transition: all 0.2s ease-in-out;

	&:hover:not(:disabled) {
		background-color: #ffaf30 !important;
		border-color: #ffaf30 !important;
	}
`;
