import React, { useRef } from 'react';
import { Input, Button, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';

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
		<div style={{ padding: 8 }}>
			<Input
				ref={searchInput}
				placeholder={placeholder}
				value={selectedKeys[0]}
				onChange={e => setSelectedKeys(e.target.value ? [e.target.value] : [])}
				onPressEnter={() => confirm()}
				style={{ width: inputWidth, marginBottom: 8, display: 'block' }}
			/>
			<Space>
				<Button
					type="primary"
					onClick={() => confirm()}
					icon={<SearchOutlined />}
					size="small"
					style={{ width: 90 }}
				>
					Найти
				</Button>
				<Button
					onClick={() => {
						clearFilters();
						confirm({ closeDropdown: false });
					}}
					size="small"
					style={{ width: 90 }}
				>
					Сбросить
				</Button>
			</Space>
		</div>
	);
}
