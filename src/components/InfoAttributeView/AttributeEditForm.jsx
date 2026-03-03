import React from 'react';
import { Form, Input, Select, DatePicker, Flex } from 'antd';
import { MEDIUM_DARK_BLUE, DARK_BLUE } from '../../consts/style';
import dayjs from 'dayjs';
import './AttributeEditForm.css';

const { Option } = Select;

export const AttributeEditForm = ({ form, attributes, ...props }) => {
	const formItemStyle = {
		label: {
			color: MEDIUM_DARK_BLUE,
			marginBottom: '2px',
			whiteSpace: 'normal',
			wordWrap: 'break-word',
			lineHeight: '1.2'
		},
		item: { marginBottom: '4px' }
	};
	const inputStyle = { color: DARK_BLUE };
	const compactInputStyle = { color: DARK_BLUE, width: '150px' };
	const selectStyle = {
		color: DARK_BLUE,
		width: '200px',
		overflow: 'hidden',
		textOverflow: 'ellipsis',
		whiteSpace: 'nowrap'
	};
	
	const totalItems = attributes.length;
	const maxItemsPerColumn = 7;
	
	const columnsCount = Math.ceil(totalItems / maxItemsPerColumn);
	
	const columns = [];
	for (let i = 0; i < columnsCount; i++) {
		const start = i * maxItemsPerColumn;
		const end = Math.min(start + maxItemsPerColumn, totalItems);
		if (start < totalItems) {
			columns.push(attributes.slice(start, end));
		}
	}
	
	const renderFormItem = (atrib) => {
		const commonProps = {
			key: atrib.name,
			name: atrib.name,
			label: atrib.label || atrib.name,
			labelCol: { flex: '0 0 180px' },
			wrapperCol: { flex: '1' },
		};

		switch (atrib.type) {
			case 'ENUM':
				return (
					<Form.Item {...commonProps} style={{ marginBottom: '4px' }}>
						<Select
							className="compact-select"
							style={selectStyle}
							popupClassName="select-dropdown-wrap"
							dropdownStyle={{
								color: DARK_BLUE,
								maxWidth: '400px'
							}}
							dropdownRender={(menu) => (
								<div style={{
									color: DARK_BLUE,
									whiteSpace: 'normal'
								}}>
									{menu}
								</div>
							)}
							showSearch
							filterOption={(input, option) => {
								const label = option?.children?.props?.children || '';
								return label.toLowerCase().includes(input.toLowerCase());
							}}
							optionLabelProp="label"
						>
							{Object.entries(atrib.options || {}).map(
								([value, label], index) => (
									<Option
										key={index}
										value={value}
										label={label.length > 25 ? label.substring(0, 25) + '...' : label}
										style={{
											color: DARK_BLUE,
											whiteSpace: 'normal',
											wordWrap: 'break-word',
											height: 'auto',
											padding: '5px 12px',
											lineHeight: '1.4'
										}}
									>
										<div style={{
											whiteSpace: 'normal',
											wordWrap: 'break-word'
										}}>
											{label}
										</div>
									</Option>
								)
							)}
						</Select>
					</Form.Item>
				);

			case 'NUMBER':
			case 'DOUBLE':
				return (
					<Form.Item {...commonProps} style={{ marginBottom: '4px' }}>
						<Input type="number" placeholder="Введите число" style={compactInputStyle} />
					</Form.Item>
				);

			case 'DATE':
				return (
					<Form.Item
						{...commonProps}
						getValueProps={value => {
							if (!value) return { value: null };
							if (typeof value === 'string' && value) {
								const parsed = dayjs(value);
								return { value: parsed.isValid() ? parsed : null };
							}
							if (dayjs.isDayjs(value)) {
								return { value };
							}
							return { value: null };
						}}
						style={{ marginBottom: '4px' }}
					>
						<DatePicker
							format="YYYY-MM-DD"
							placeholder="Выберите дату"
							style={{ width: '150px', color: DARK_BLUE }}
						/>
					</Form.Item>
				);

			case 'STRING':
			default:
				return (
					<Form.Item {...commonProps} style={{ marginBottom: '4px' }}>
						<Input placeholder={`Введите текст`} style={inputStyle} />
					</Form.Item>
				);
		}
	};
	
	return (
		<Form
			form={form}
			layout="horizontal"
			size="small"
			style={{ overflow: 'auto' }}
			styles={formItemStyle}
			{...props}
		>
			<Flex gap={10} wrap="nowrap" style={{ overflowX: 'auto' }}>
				{columns.map((columnAttribs, columnIndex) => (
					<div key={columnIndex} style={{ flex: columnsCount > 1 ? '0 0 auto' : '1', minWidth: '300px' }}>
						{columnAttribs.map(atrib => renderFormItem(atrib))}
					</div>
				))}
			</Flex>
		</Form>
	);
};
