import React, { useEffect, useMemo, useState } from 'react';
import { Button, Flex, Table } from 'antd';
import { getFeaturesTotal } from '../../features/getDataForFeatures/getFeaturesTotal';
import { getFeatureDatas } from '../../features/getDataForFeatures/getFeatureDatas';
import { SearchOutlined } from '@ant-design/icons';
import { ColumnSearch } from './ColumnSearch.jsx';
import infoIcon from '../../assets/resources/images/assets/info.png';
import showOnMapIcon from '../../assets/resources/images/assets/showOnMap.png';
import { showOnMap } from '../../shared/mapEvents.js';
import { showInfo } from '../../shared/featured-info-event.js';
import { useUnit } from 'effector-react';
import { $tableRefreshTrigger } from '../../shared/refreshTable.js';

export function FeatureTable({ layer }) {
	const [features, setFeatures] = useState([]);
	const [loading, setLoading] = useState(false);
	const [sorter, setSorter] = useState({});
	const [antdFilters, setAntdFilters] = useState({});
	const [pagination, setPagination] = useState({ current: 1, pageSize: 100, total: 0 });

	const refreshTrigger = useUnit($tableRefreshTrigger);

	useEffect(() => {
		setLoading(true);
		const { current, pageSize } = pagination;
		getFeaturesTotal(layer, antdFilters, total => {
			setPagination(p => ({ ...p, total }));
			getFeatureDatas(
				layer,
				{ offset: (current - 1) * pageSize, limit: pageSize, filters: antdFilters, sorter },
				data => {
					setFeatures(data);
					setLoading(false);
				}
			);
		});
	}, [layer, pagination.pageSize, antdFilters, pagination.current, sorter, refreshTrigger]);

	const basicColumns = useMemo(() => {
		return layer.atribs.map((atrib, i) => {
			const base = {
				title: i === 0 ? '№' : atrib.label,
				dataIndex: atrib.name,
				align: 'center',
				sorter: true,
			};
			switch (atrib.type) {
				case 'STRING':
					return {
						...base,
						filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
							<ColumnSearch
								setSelectedKeys={setSelectedKeys}
								selectedKeys={selectedKeys}
								confirm={confirm}
								clearFilters={clearFilters}
								placeholder={atrib.label}
								inputWidth={188}
							/>
						),
						filterIcon: filtered => (
							<SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
						),
					};
				case 'ENUM':
					return {
						...base,
						filters: enumOptionsToFilters(atrib.options),
						filterMultiple: true,
					};
				default:
					return base;
			}
		});
	}, [layer, pagination.current, pagination.pageSize]);

	const actionsColumn = {
		title: '',
		key: 'actions',
		align: 'center',
		width: 40,
		fixed: false,
		render: (_, record) => (
			<Flex justify="space-between" gap={7}>
				<Button
					style={{ fontSize: 12, cursor: 'pointer', padding: 0 }}
					title="Свойства"
					onClick={e => {
						e.stopPropagation();
						showInfo({ featureId: record.id, layer });
					}}
					variant="text"
					type="text"
					size="small"
				>
					<img src={infoIcon} alt="info" />
				</Button>
				<Button
					style={{ padding: 0, cursor: 'pointer' }}
					title="Показать на карте"
					onClick={e => {
						e.stopPropagation();
						showOnMap({ layer, featureId: record.id });
					}}
					variant="text"
					type="text"
					size="small"
				>
					<img src={showOnMapIcon} alt="show" />
				</Button>
			</Flex>
		),
	};

	const columns = useMemo(() => {
		const arr = [...basicColumns];
		arr.splice(1, 0, actionsColumn);
		return arr;
	}, [basicColumns]);

	const handleTableChange = (pagination, filters, sorter) => {
		setPagination(p => ({
			...p,
			current: pagination.current,
			pageSize: pagination.pageSize,
		}));

		setAntdFilters(filters);

		setSorter({
			field: sorter.field,
			order: sorter.order === 'ascend' ? 'ASC' : 'DESC',
		});
	};

	return (
		<Table
			columns={columns}
			dataSource={features}
			loading={loading}
			pagination={{
				current: pagination.current,
				pageSize: pagination.pageSize,
				total: pagination.total,
				onChange: (page, pageSize) => setPagination(p => ({ ...p, current: page, pageSize })),
				showSizeChanger: true,
			}}
			onChange={handleTableChange}
			size="small"
			scroll={{ x: true }}
		></Table>
	);
}

function enumOptionsToFilters(options) {
	return Object.entries(options).map(([value, label]) => ({
		value,
		text: label,
	}));
}
