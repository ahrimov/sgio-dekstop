import React, { useEffect, useMemo, useState } from 'react';
import { Table } from 'antd';
import { getFeaturesTotal } from '../../features/getDataForFeatures/getFeaturesTotal';
import { getFeatureDatas } from '../../features/getDataForFeatures/getFeatureDatas';

export function FeatureTable({ layer }) {
	const [features, setFeatures] = useState([]);
	const [loading, setLoading] = useState(false);
	const [filters, setFilters] = useState({});
	const [pagination, setPagination] = useState({ current: 1, pageSize: 100, total: 0 });

	useEffect(() => {
		setLoading(true);
		const { current, pageSize } = pagination;
		getFeaturesTotal(layer, filters, total => {
			setPagination(p => ({ ...p, total }));
			getFeatureDatas(
				layer,
				{ offset: (current - 1) * pageSize, limit: pageSize, filters },
				data => {
					setFeatures(data);
					setLoading(false);
				}
			);
		});
	}, [layer, pagination.pageSize, filters, pagination.current]);

	const columns = useMemo(() => {
		return layer.atribs.map((atrib, i) => ({
			title: i === 0 ? '№' : atrib.label,
			dataIndex: atrib.name,
			align: 'center',
		}));
	}, [layer, pagination.current, pagination.pageSize]);

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
			size="small"
		></Table>
	);
}
