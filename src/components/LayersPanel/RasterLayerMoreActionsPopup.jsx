import React, { useState } from 'react';
import { Button, Checkbox, Popover } from 'antd';
import { MoreOutlined } from '@ant-design/icons';
import { toggleRasterLayerLocalTiles } from '../../store/rasterLayers.js';
import { MEDIUM_DARK_BLUE } from '../../consts/style.js';

export function RasterLayerMoreActionsPopup({ layer }) {
	const [open, setOpen] = useState(false);
	const local = layer.get('useLocalTiles');
	return (
		<Popover
			trigger="click"
			placement="left"
			open={open}
			onOpenChange={setOpen}
			styles={{ root: { zIndex: 100000 } }}
			content={
				<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
					<Checkbox
						style={{ color: MEDIUM_DARK_BLUE }}
						checked={local}
						disabled={!layer.get('remoteUrl')}
						onChange={() => {
							setOpen(false);
							toggleRasterLayerLocalTiles(layer.get('id'));
						}}
					>
						Использовать тайлы на устройстве
					</Checkbox>
				</div>
			}
		>
			<Button
				type="text"
				size="small"
				icon={<MoreOutlined />}
				aria-label={`Действия слоя «${layer.get('descr')}»`}
				style={{ width: 22, minWidth: 22, padding: 0 }}
			/>
		</Popover>
	);
}
