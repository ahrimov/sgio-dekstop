import React from 'react';
import { Form, Input, Select, DatePicker, Flex } from 'antd';
import { MEDIUM_DARK_BLUE } from '../../consts/style';
import dayjs from 'dayjs';

const { Option } = Select;

export const AttributeEditForm = ({ form, attributes, ...props }) => {
	const formItemStyle = { label: { color: MEDIUM_DARK_BLUE } };
	
	const totalItems = attributes.length;
	
	let columnsCount = 1;
	if (totalItems > 10) {
		columnsCount = 3;
	} else if (totalItems > 4) {
		columnsCount = 2;
	}
	
	const columns = [];
	if (columnsCount === 1) {
		columns.push(attributes);
	} else {
		const itemsPerColumn = Math.ceil(totalItems / columnsCount);
		for (let i = 0; i < columnsCount; i++) {
			const start = i * itemsPerColumn;
			const end = Math.min(start + itemsPerColumn, totalItems);
			if (start < totalItems) {
				columns.push(attributes.slice(start, end));
			}
		}
	}
	
	const renderFormItem = (atrib) => {
		const commonProps = {
			key: atrib.name,
			name: atrib.name,
			label: atrib.label || atrib.name,
			labelCol: { span: 24 },
			wrapperCol: { span: 24 },
		};

		switch (atrib.type) {
			case 'ENUM':
				return (
					<Form.Item {...commonProps}>
						<Select>
							{Object.entries(atrib.options || {}).map(
								([value, label], index) => (
									<Option key={index} value={value}>
										{label}
									</Option>
								)
							)}
						</Select>
					</Form.Item>
				);

			case 'NUMBER':
			case 'DOUBLE':
				return (
					<Form.Item {...commonProps}>
						<Input type="number" placeholder="Введите число" />
					</Form.Item>
				);

			case 'DATE':
				return (
					<Form.Item
						{...commonProps}
						getValueProps={value => {
							if (typeof value === 'string') {
								return { value: dayjs(value) };
							}
							return { value };
						}}
						getValueFromEvent={date => {
							if (date && date.format) {
								return date.toISOString();
							}
							return date;
						}}
					>
						<DatePicker
							format="YYYY-MM-DD"
							placeholder="Выберите дату"
							style={{ width: '100%' }}
						/>
					</Form.Item>
				);

			case 'STRING':
			default:
				return (
					<Form.Item {...commonProps}>
						<Input placeholder={`Введите текст`} />
					</Form.Item>
				);
		}
	};
	
	return (
		<Form
			form={form}
			layout="vertical"
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
