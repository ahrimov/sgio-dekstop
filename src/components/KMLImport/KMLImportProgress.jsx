import React from 'react';
import { Modal, Progress, Typography, Space } from 'antd';

const { Text, Title } = Typography;

export const KMLImportProgress = ({
	visible,
	current = 0,
	total = 0,
	message = 'Импорт KML файла',
}) => {
	const percent = total > 0 ? Math.round((current / total) * 100) : 0;

	return (
		<Modal
			open={visible}
			closable={false}
			footer={null}
			width={180}
			centered
			mask={true}
			maskClosable={false}
			zIndex={1001}
			styles={{
				mask: {
					backgroundColor: 'rgba(0, 0, 0, 0.7)',
				},
			}}
		>
			<Space direction="vertical" style={{ width: '100%' }} size="middle">
				<Title level={4} style={{ margin: 0, textAlign: 'center' }}>
					{message}
				</Title>

				<Progress
					style={{ textAlign: 'center', display: 'block' }}
					percent={percent}
					status={percent < 100 ? 'active' : 'success'}
					type="circle"
				/>

				<Text
					type="secondary"
					style={{ fontSize: '11px', textAlign: 'center', display: 'block' }}
				>
					Пожалуйста, подождите...
				</Text>
			</Space>
		</Modal>
	);
};
