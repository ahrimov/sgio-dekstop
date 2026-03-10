import React, { useEffect, useMemo, useState } from 'react';
import { Button, Table, Select } from 'antd';
import { getFeaturesTotal } from '../../features/getDataForFeatures/getFeaturesTotal';
import { getFeatureDatas } from '../../features/getDataForFeatures/getFeatureDatas';
import {
	CaretLeftOutlined,
	CaretRightOutlined,
	SearchOutlined,
	StepBackwardOutlined,
} from '@ant-design/icons';
import { ColumnSearch } from './ColumnSearch.jsx';
import infoIcon from '../../assets/resources/images/assets/info.png';
import showOnMapIcon from '../../assets/resources/images/assets/showOnMap.png';
import deleteIcon from '../../assets/resources/images/assets/delete.png';
import exportIcon from '../../assets/resources/images/assets/exportNAV.png';
import { showOnMap, showMultipleOnMap } from '../../store/showOnMap.js';
import { showInfo } from '../../store/featuredInfoEvent.js';
import { exportSelectedFeaturesToKML } from '../../features/KMLLayer/exportSelectedFeaturesToKML.js';
import { deleteMultipleFeatures } from '../../features/deleteFeature/deleteMultipleFeatures.js';
import { useUnit } from 'effector-react';
import { $tableRefreshTrigger } from '../../store/refreshTable.js';
import styled from 'styled-components';
import './FeatureTable.css';
import { BaseMapButton } from '../MapButtons/BaseMapButton.jsx';

export function FeatureTable({ layer }) {
	const [features, setFeatures] = useState([]);
	const [loading, setLoading] = useState(false);
	const [sorter, setSorter] = useState({});
	const [antdFilters, setAntdFilters] = useState({});
	const [pagination, setPagination] = useState({ current: 1, pageSize: 100, total: 0 });
	const [selectedRowKeys, setSelectedRowKeys] = useState([]);

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

	function loadKMLFeatures({
		layer,
		antdFilters,
		sorter,
		pagination,
		setFeatures,
		setLoading,
		setPagination,
	}) {
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
					return String(featureVal ?? '')
						.toLowerCase()
						.includes(String(val ?? '').toLowerCase());
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

		const data = paginated.map(f => {
			const attrs = {};
			const props = f.getProperties();

			layer.atribs.forEach(a => (attrs[a.name] = props[a.name]));
			attrs.key = f.id;
			attrs.id = f.id;
			return attrs;
		});

		setFeatures(data);
		setPagination(p => ({ ...p, total }));
		setLoading(false);
	}

	function loadDBFeatures({
		layer,
		antdFilters,
		sorter,
		pagination,
		setFeatures,
		setLoading,
		setPagination,
	}) {
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
		const atribs = layer.atribs; //filterSystemProperties(layer.atribs, config);
		return atribs.map((atrib, i) => {
			let columnWidth = 150;

			if (i === 0) {
				columnWidth = 70;
			} else if (
				atrib.type === 'INTEGER' ||
				atrib.type === 'FLOAT' ||
				atrib.type === 'NUMBER'
			) {
				columnWidth = 80;
			} else if (atrib.type === 'ENUM') {
				columnWidth = 120;
			} else if (atrib.type === 'DATE' || atrib.type === 'DATETIME') {
				columnWidth = 100;
			}

			const base = {
				title: i === 0 ? '№' : atrib.label,
				dataIndex: atrib.name,
				align: 'center',
				width: columnWidth,
				ellipsis: {
					showTitle: true,
				},
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

	const infoColumn = {
		title: '',
		key: 'info',
		align: 'center',
		width: 32,
		render: (_, record) => (
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
		),
	};

	const showOnMapColumn = {
		title: '',
		key: 'showOnMap',
		align: 'center',
		width: 32,
		fixed: false,
		render: (_, record) => (
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
		),
	};

	const columns = useMemo(() => {
		const arr = [...basicColumns];
		arr.splice(1, 0, infoColumn, showOnMapColumn);
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

	const rowSelection = {
		selectedRowKeys,
		onChange: selectedKeys => {
			setSelectedRowKeys(selectedKeys);
		},
		columnWidth: 40,
		fixed: false,
	};

	const handlePageSizeChange = value => {
		setPagination(p => ({ ...p, pageSize: value, current: 1 }));
	};

	const handleFirstPage = () => {
		setPagination(p => ({ ...p, current: 1 }));
	};

	const handlePrevPage = () => {
		setPagination(p => ({ ...p, current: Math.max(1, p.current - 1) }));
	};

	const handleNextPage = () => {
		const maxPage = Math.ceil(pagination.total / pagination.pageSize);
		setPagination(p => ({ ...p, current: Math.min(maxPage, p.current + 1) }));
	};

	const startRecord = (pagination.current - 1) * pagination.pageSize + 1;
	const endRecord = Math.min(pagination.current * pagination.pageSize, pagination.total);

	const handleExportKML = () => {
		if (selectedRowKeys.length === 0) {
			return;
		}
		exportSelectedFeaturesToKML(layer, selectedRowKeys);
	};

	const handleShowOnMap = () => {
		if (selectedRowKeys.length === 0) return;

		if (selectedRowKeys.length === 1) {
			// Для одного объекта используем старый event
			showOnMap({ layer, featureId: selectedRowKeys[0] });
		} else {
			// Для нескольких объектов используем новый event
			showMultipleOnMap({ layer, featureIds: selectedRowKeys });
		}
	};

	const handleDelete = () => {
		if (selectedRowKeys.length === 0) {
			return;
		}
		deleteMultipleFeatures(selectedRowKeys, layer, () => {
			// После удаления очищаем выбор
			setSelectedRowKeys([]);
		});
	};

	useEffect(() => {
		// Проверяем, появляется ли скролл
		const checkScroll = () => {
			const tableBody = document.querySelector('.ant-table-body');
			if (tableBody) {
				console.log('Table body scroll width:', tableBody.scrollWidth);
				console.log('Table body client width:', tableBody.clientWidth);
				console.log(
					'Has horizontal scroll:',
					tableBody.scrollWidth > tableBody.clientWidth
				);
			}
		};

		// Проверяем после загрузки данных
		setTimeout(checkScroll, 1000);
	}, [features]);

	return (
		<TableContainer>
			<TableButtonsContainer>
				<BaseMapButton
					onClick={handleExportKML}
					title={'Выгрузить в KML'}
					img={exportIcon}
				/>
				<BaseMapButton
					onClick={handleShowOnMap}
					title={'Показать на карте'}
					img={showOnMapIcon}
				/>
				<BaseMapButton onClick={handleDelete} title={'Удалить'} img={deleteIcon} />
			</TableButtonsContainer>
			<TopPaginationWrapper>
				<CustomPaginationBar>
					<PaginationButtons>
						<Button
							size="small"
							onClick={handleFirstPage}
							disabled={pagination.current === 1}
							icon={<StepBackwardOutlined />}
						/>
						<Button
							size="small"
							onClick={handlePrevPage}
							disabled={pagination.current === 1}
							icon={<CaretLeftOutlined />}
						/>
						<Button
							size="small"
							onClick={handleNextPage}
							disabled={
								pagination.current >=
								Math.ceil(pagination.total / pagination.pageSize)
							}
							icon={<CaretRightOutlined />}
						/>
					</PaginationButtons>
					<PageSizeSelector>
						<span>Записей на странице:</span>
						<Select
							size="small"
							value={pagination.pageSize}
							onChange={handlePageSizeChange}
							options={[
								{ value: 10, label: '10' },
								{ value: 20, label: '20' },
								{ value: 50, label: '50' },
								{ value: 100, label: '100' },
								{ value: 200, label: '200' },
							]}
							style={{ width: 80 }}
						/>
					</PageSizeSelector>
					<RecordRange>
						{startRecord}-{endRecord} из {pagination.total}
					</RecordRange>
				</CustomPaginationBar>
				<Table
					columns={columns}
					dataSource={features}
					loading={loading}
					rowSelection={rowSelection}
					rowKey="id"
					pagination={false}
					onChange={handleTableChange}
					size="small"
					scroll={{ x: 'max-content', y: 900 }}
					style={{ headerBorderRadius: '14px' }}
					bordered={false}
				></Table>
			</TopPaginationWrapper>
		</TableContainer>
	);
}

function enumOptionsToFilters(options) {
	return Object.entries(options).map(([value, label]) => ({
		value,
		text: label,
	}));
}

const TableContainer = styled.div`
	position: relative;
	display: flex;
	flex-direction: row;
`;

const TableButtonsContainer = styled.div`
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: flex-start;
	padding-top: 9px;
	padding-left: 2px;
	padding-right: 2px;
	background-color: #f5fbfd;
	gap: 3px;
	border-top-left-radius: 8px;
	border-bottom-left-radius: 8px;
`;

const TopPaginationWrapper = styled.div`
	position: relative;
	width: calc(100% - 36px);

	.ant-table-pagination {
		position: sticky;
		top: 0;
		z-index: 100;
		background: #ffffff;
		padding: 12px 0;
		box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.15);
		margin: 0 !important;
	}

	.ant-table-container {
		border-bottom-right-radius: 8px;
		overflow: hidden;
	}

	.ant-table {
		border-bottom-right-radius: 8px;
		border-start-start-radius: 0 !important;
		border-start-end-radius: 0 !important;
	}

	.ant-table-thead th {
		white-space: normal !important;
		word-break: break-word;
	}

	.ant-table-thead > tr > th:hover::after {
		background: rgba(0, 0, 0, 0.1);
	}

	/* Скрыть техническую строку измерения */
	.ant-table-measure-row {
		display: none !important;
		height: 0 !important;
		line-height: 0 !important;
		padding: 0 !important;
		border: none !important;
	}

	.ant-table-measure-row td {
		padding: 0 !important;
		border: none !important;
	}

	/* Границы для всех ячеек */
	.ant-table-thead > tr > th,
	.ant-table-tbody > tr > td {
		border-right: 1px solid rgb(205, 205, 205) !important;
		border-bottom: 1px solid rgb(205, 205, 205) !important;
		color: rgb(0, 51, 102) !important;
		font-weight: normal !important;
	}

	/* Серый фон для заголовков */
	.ant-table-thead > tr > th {
		background-color: rgb(232, 232, 232) !important;
		padding: 4px 8px !important;
	}

	/* Перенос текста в заголовках */
	.ant-table-thead > tr > th .ant-table-column-title {
		white-space: normal !important;
		word-wrap: break-word !important;
	}

	.ant-table-thead > tr > th .ant-table-cell-ellipsis {
		overflow: visible !important;
		text-overflow: clip !important;
		white-space: normal !important;
	}

	/* Уменьшение высоты строк */
	.ant-table-tbody > tr > td {
		padding: 0 4px !important;
		line-height: 21px !important;
		height: 21px !important;
		max-height: 21px !important;
		white-space: nowrap !important;
		overflow: hidden !important;
		text-overflow: ellipsis !important;
		max-width: 150px !important;
	}

	/* Уменьшение размера иконок в кнопках */
	.ant-table-tbody > tr > td img {
		width: 16px !important;
		height: 16px !important;
		vertical-align: middle;
	}

	/* Уменьшение размера кнопок */
	.ant-table-tbody > tr > td .ant-btn {
		height: 20px !important;
		line-height: 20px !important;
		padding: 0 2px !important;
	}

	/* Чередующиеся цвета строк: белый и серый */
	.ant-table-tbody > tr:nth-child(even) {
		background-color: #ffffff;
	}

	.ant-table-tbody > tr:nth-child(odd) {
		background-color: rgb(232, 232, 232);
	}

	/* Сохранение фона строки при наведении */
	.ant-table-tbody > tr:nth-child(even):hover {
		background-color: #ffffff;
	}

	.ant-table-tbody > tr:nth-child(odd) > .ant-table-cell-row-hover {
		background-color: rgb(232, 232, 232);
	}

	.ant-table-row-selected > td:hover {
		background-color: rgb(130, 180, 212) !important;
	}

	.ant-table-tbody > tr > td:hover {
		background-color: rgb(232, 248, 253) !important;
	}

	.ant-table-row-selected > td {
		background-color: rgb(130, 180, 212) !important;
	}
`;

const CustomPaginationBar = styled.div`
	display: flex;
	align-items: center;
	gap: 16px;
	padding: 12px 16px;
	background: #ffffff;
	border-top-right-radius: 8px;
	box-shadow: 0px 4px 4px 0px rgba(0, 0, 0, 0.15);
	position: sticky;
	top: 0;
	z-index: 100;
`;

const PaginationButtons = styled.div`
	display: flex;
	gap: 0;

	.ant-btn {
		display: flex;
		justify-content: center;
		align-items: center;
		border: 1px solid rgb(205, 205, 205);
		width: 68px;
		height: 26px;
		cursor: pointer;
		margin-left: 4px;
		transition: background 0.1s ease-in-out;
		color: #005d98 !important;
		background: #ffffff;

		&:hover:not(:disabled) {
			background-color: orange;
			border-color: orange;
		}

		&:disabled {
			cursor: not-allowed;
			opacity: 0.5;
		}

		&:first-child {
			margin-left: 0;
		}
	}
`;

const PageSizeSelector = styled.div`
	display: flex;
	align-items: center;
	gap: 8px;

	span {
		color: rgb(0, 51, 102);
		font-size: 14px;
	}

	.ant-select {
		color: rgb(0, 51, 102) !important;
	}
`;

const RecordRange = styled.div`
	color: rgb(0, 51, 102);
	font-size: 14px;
	font-weight: 500;
`;
