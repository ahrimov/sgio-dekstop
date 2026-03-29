import React, { useRef } from 'react';
import { Input, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import styled from 'styled-components';

export function ColumnSearch({
	setSelectedKeys,
	selectedKeys,
	confirm,
	clearFilters,
	placeholder = 'Поиск по значению',
	inputWidth = 188,
}) {
	const searchInput = useRef(null);

	return (
		<FilterContainer>
			<StyledInput
				ref={searchInput}
				placeholder={placeholder}
				value={selectedKeys[0]}
				onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
				onPressEnter={() => confirm()}
				style={{ width: inputWidth }}
			/>
			<Space>
				<SearchButton onClick={() => confirm()} icon={<SearchOutlined />} size="small">
					Найти
				</SearchButton>
				<ResetButton
					onClick={() => {
						clearFilters();
						confirm({ closeDropdown: false });
					}}
					size="small"
				>
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

const StyledInput = styled(Input)`
	margin-bottom: 8px;
	display: block;
	border: 1px solid rgb(205, 205, 205);
	color: rgb(0, 51, 102);

	&:hover {
		border-color: #005d98;
	}

	&:focus {
		border-color: #005d98;
		box-shadow: 0 0 0 2px rgba(0, 93, 152, 0.1);
	}

	&::placeholder {
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
		background: #004a7a !important;
		border-color: #004a7a !important;
		border-color: #ffaf30 !important;
		color: #ffaf30 !important;
		box-shadow: 0 2px 4px rgba(0, 93, 152, 0.3);
	}

	.anticon {
		color: #ffffff;
	}
`;

const ResetButton = styled(Button)`
	width: 90px;
	background: #ffffff !important;
	border: 1px solid rgb(205, 205, 205) !important;
	color: rgb(0, 51, 102) !important;
	font-weight: 500;
	transition: all 0.2s ease-in-out;

	&:hover:not(:disabled) {
		background: #f5f5f5 !important;
		border-color: #ffaf30 !important;
		color: #ffaf30 !important;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}
`;
