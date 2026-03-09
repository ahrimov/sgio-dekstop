import React from 'react';
import { Space, Button } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';

/**
 * Component for rendering geometry editing action buttons
 * @param {Function} handleCancelEditGeometry - Handler for cancel action
 * @param {Function} finishGeometryEdit - Handler for finish editing action
 * @param {boolean} loading - Loading state
 */
export function GeometryEditActions({
	handleCancelEditGeometry,
	finishGeometryEdit,
	loading,
}) {
	return (
		<Space key="geometry-actions">
			<Button
				onClick={handleCancelEditGeometry}
				icon={<CloseOutlined />}
			>
				Отменить
			</Button>
			<Button
				type="primary"
				onClick={finishGeometryEdit}
				icon={<CheckOutlined />}
				loading={loading}
			>
				Сохранить геометрию
			</Button>
		</Space>
	);
}