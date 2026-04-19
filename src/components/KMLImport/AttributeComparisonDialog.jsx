import React, { useState, useEffect } from 'react';
import { Modal, Select, Table, Typography } from 'antd';
import styled from 'styled-components';
import { DARK_BLUE, MEDIUM_DARK_BLUE } from '../../consts/style';
import { CloseOutlined } from '@ant-design/icons';

const { Text } = Typography;

export function AttributeComparisonDialog({
	visible,
	onClose,
	layerAttributes,
	kmlProperties,
	onAccept,
	features,
}) {
	const [mappings, setMappings] = useState({});

	useEffect(() => {
		if (visible && layerAttributes && kmlProperties) {
			const initialMappings = {};
			layerAttributes.forEach(attr => {
				const matchingProp = kmlProperties.find(
					prop => prop.toLowerCase() === attr.name.toLowerCase()
				);
				if (matchingProp) {
					initialMappings[attr.name] = matchingProp;
				}
			});
			setMappings(initialMappings);
		}
	}, [visible, layerAttributes, kmlProperties]);

	const handleMappingChange = (attrName, value) => {
		setMappings(prev => ({
			...prev,
			[attrName]: value,
		}));
	};

	const handleAccept = () => {
		const dict = {};
		Object.keys(mappings).forEach(key => {
			if (mappings[key]) {
				dict[key] = mappings[key].toLowerCase();
			}
		});
		onAccept(dict);
	};

	const columns = [
		{
			title: 'Атрибут слоя',
			dataIndex: 'layerAttr',
			key: 'layerAttr',
			width: '40%',
			render: text => <Text strong>{text}</Text>,
		},
		{
			title: 'Свойство из KML',
			dataIndex: 'kmlProp',
			key: 'kmlProp',
			width: '60%',
			render: (_, record) => (
				<Select
					style={{ width: '100%' }}
					placeholder="Нет соответствия"
					value={mappings[record.attrName]}
					onChange={value => handleMappingChange(record.attrName, value)}
					allowClear
				>
					{kmlProperties?.map(prop => (
						<Select.Option key={prop} value={prop}>
							{prop}
						</Select.Option>
					))}
				</Select>
			),
		},
	];

	const dataSource =
		layerAttributes?.map(attr => ({
			key: attr.name,
			attrName: attr.name,
			layerAttr: attr.name,
		})) || [];

	return (
		<StyledModal
			title={null}
			open={visible}
			onCancel={onClose}
			width={700}
			closable={false}
			footer={
				<div className="modal-dialog-footer">
					<button
						className="modal-dialog-button modal-dialog-button-confirm"
						onClick={handleAccept}
						autoFocus
					>
						Применить
					</button>
					<button
						className="modal-dialog-button modal-dialog-button-cancel"
						onClick={onClose}
					>
						Отмена
					</button>
				</div>
			}
		>
			<CustomHeader>
				<HeaderTitle>Сопоставление атрибутов</HeaderTitle>
				<ControlButton onClick={onClose} title="Закрыть" $isClose>
					<CloseOutlined />
				</ControlButton>
			</CustomHeader>
			<WarningText>
				Внимание! Число экспортируемых объектов: {features?.length || 0}.
			</WarningText>
			<Description>
				Соотнесите служебные имена характеристик в левой части (атрибуты из панели свойств)
				и имена характеристик в правой (полученные из импортируемого Вами файла)
			</Description>
			<TableWrapper>
				<Table
					columns={columns}
					dataSource={dataSource}
					pagination={false}
					size="small"
					scroll={{ y: 400 }}
				/>
			</TableWrapper>
		</StyledModal>
	);
}

const StyledModal = styled(Modal)`
	.ant-modal-content {
		overflow: hidden;
		border-radius: 8px;
	}

	.ant-modal-body {
		padding: 0;
	}

	.ant-modal-container {
		padding: 0 !important;
	}

	.ant-modal-footer {
		padding-bottom: 14px;
		padding-right: 26px;
		margin-top: 0;
	}
`;

const CustomHeader = styled.div`
	background-color: ${DARK_BLUE};
	padding: 16px 24px;
	display: flex;
	justify-content: space-between;
	align-items: center;
	border-radius: 8px 8px 0 0;
`;

const HeaderTitle = styled.h3`
	margin: 0;
	color: white;
	font-size: 16px;
	font-weight: 500;
`;

const ControlButton = styled.button`
	background: none;
	width: 28px;
	height: 28px;
	border-radius: 4px;
	display: flex;
	align-items: center;
	justify-content: center;
	cursor: pointer;
	color: #ffffff;
	transition: all 0.2s;
	border: 1px solid #ffffff;

	&:hover {
		color: #000000;
		background-color: #ffffff;
	}
`;

const WarningText = styled.p`
	margin: 8px 24px 0 24px;
	color: ${MEDIUM_DARK_BLUE};
	font-size: 14px;
	font-weight: 500;
`;

const Description = styled.p`
	margin: 16px 24px;
	color: ${MEDIUM_DARK_BLUE};
	font-size: 14px;
`;

const TableWrapper = styled.div`
	padding: 0 24px 16px 24px;
`;
