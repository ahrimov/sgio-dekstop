import React, { useEffect, useMemo, useState } from 'react';
import { Button, Flex, Table } from 'antd';
import { getFeaturesTotal } from '../../features/getDataForFeatures/getFeaturesTotal';
import { getFeatureDatas } from '../../features/getDataForFeatures/getFeatureDatas';
import { SearchOutlined } from '@ant-design/icons';
import { ColumnSearch } from './ColumnSearch.jsx';
import infoIcon from '../../assets/resources/images/assets/info.png';
import showOnMapIcon from '../../assets/resources/images/assets/showOnMap.png';
import { showOnMap } from '../../shared/showOnMap.js';
import { showInfo } from '../../shared/featuredInfoEvent.js';
import { useUnit } from 'effector-react';
import { $tableRefreshTrigger } from '../../shared/refreshTable.js';
import styled from 'styled-components';

export function FeatureTable({ layer }) {
	const [features, setFeatures] = useState([]);
	const [loading, setLoading] = useState(false);
	const [sorter, setSorter] = useState({});
	const [antdFilters, setAntdFilters] = useState({});
	const [pagination, setPagination] = useState({ current: 1, pageSize: 100, total: 0 });

	const refreshTrigger = useUnit($tableRefreshTrigger);
	useEffect(() => {
		setLoading(true);

		if (layer.get && layer.get('kmlType')) {
			loadKMLFeatures({
				layer,
				antdFilters,
				sorter,
				pagination,
				setFeatures,
				setLoading,
				setPagination,
			});
		} else {
			loadDBFeatures({
				layer,
				antdFilters,
				sorter,
				pagination,
				setFeatures,
				setLoading,
				setPagination,
			});
		}
		// eslint-disable-next-line
	}, [layer, pagination.pageSize, antdFilters, pagination.current, sorter, refreshTrigger]);

	function loadKMLFeatures({ layer, antdFilters, sorter, pagination, setFeatures, setLoading, setPagination }) {
		const { current, pageSize } = pagination;
		const source = layer.getSource?.();

		if (!source || !source.getFeatures) {
			setFeatures([]);
			setPagination(p => ({ ...p, total: 0 }));
			setLoading(false);
			return;
		}

		let featuresArr = source.getFeatures();
		if (antdFilters && Object.keys(antdFilters).length) {
			featuresArr = featuresArr.filter(f => {
				return Object.entries(antdFilters).every(([key, val]) => {
					const featureVal = f.get(key);
					if (Array.isArray(val)) {
						return val.includes(featureVal);
					}
					return String(featureVal ?? '').toLowerCase().includes(String(val ?? '').toLowerCase());
				});
			});
		}

		if (sorter && sorter.field && sorter.order) {
			const { field, order } = sorter;
			featuresArr = featuresArr.slice().sort((a, b) => {
				const va = a.get(field);
				const vb = b.get(field);
				if (va == null && vb != null) return 1;
				if (va != null && vb == null) return -1;
				if (va == null && vb == null) return 0;
				if (order === 'ASC') return String(va).localeCompare(String(vb));
				else return String(vb).localeCompare(String(va));
			});
		}

		const total = featuresArr.length;
		const paginated = featuresArr.slice((current - 1) * pageSize, current * pageSize);

		const data = paginated.map((f) => {
			const attrs = {};
			const props = f.getProperties();

			layer.atribs.forEach(a => attrs[a.name] = props[a.name]);
			attrs.key = f.id;
			attrs.id = f.id;
			return attrs;
		});

		setFeatures(data);
		setPagination(p => ({ ...p, total }));
		setLoading(false);
	}

	function loadDBFeatures({ layer, antdFilters, sorter, pagination, setFeatures, setLoading, setPagination }) {
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
	}

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
						filterDropdown: ({
							setSelectedKeys,
							selectedKeys,
							confirm,
							clearFilters,
						}) => (
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
		<FixedPaginationWrapper>
			<Table
				columns={columns}
				dataSource={features}
				loading={loading}
				pagination={{
					current: pagination.current,
					pageSize: pagination.pageSize,
					total: pagination.total,
					onChange: (page, pageSize) =>
						setPagination(p => ({ ...p, current: page, pageSize })),
					showSizeChanger: true,
				}}
				onChange={handleTableChange}
				size="small"
				scroll={{ x: true }}
			></Table>
		</FixedPaginationWrapper>
	);
}

function enumOptionsToFilters(options) {
	return Object.entries(options).map(([value, label]) => ({
		value,
		text: label,
	}));
}

const FixedPaginationWrapper = styled.div`
	.ant-table-wrapper {
		display: flex;
		flex-direction: column;
	}

	.ant-table-container {
		flex: 1;
	}

	.ant-table-pagination {
		position: sticky;
		bottom: 0;
		background: #fff;
		padding: 16px;
		margin: 0 !important;
		z-index: 10;
		border-top: 1px solid #f0f0f0;
	}
`;
