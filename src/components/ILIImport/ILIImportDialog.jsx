import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Input, DatePicker, Select, Button, Space, Alert } from 'antd';
import { ExclamationCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { useUnit } from 'effector-react';
import styled from 'styled-components';
import {
	$iliImportState,
	closeIliImportDialog,
	iliImportError,
} from '../../store/iliImport';
import { runIliXmlImport, selectIliXmlFile, loadRoutes } from '../../features/ILIImport/importILIXml';
import { MEDIUM_DARK_BLUE, ORANGE } from '../../consts/style';

const { confirm } = Modal;

/**
 * Delete ALL ILI data from all routes/inspections.
 * @param {string} dbPath
 */
async function deleteAllInspections(dbPath) {
	console.log('[ILI Delete All] Deleting all ILI data before import...');
	const result = await window.electronAPI.iliDeleteAll(dbPath);
	console.log('[ILI Delete All] Result:', result);
	return result;
}

/**
 * ILI XML Import dialog component.
 * Allows user to select an XML file and configure import parameters.
 */
export const ILIImportDialog = ({ dbPath }) => {
	const { dialogOpen, isRunning, error } = useUnit($iliImportState);
	const [form] = Form.useForm();
	const [xmlFilePath, setXmlFilePath] = useState('');
	const [routes, setRoutes] = useState([]);
	const [loadingRoutes, setLoadingRoutes] = useState(false);

	useEffect(() => {
		if (dialogOpen && dbPath) {
			setLoadingRoutes(true);
			loadRoutes(dbPath)
				.then(r => setRoutes(r))
				.finally(() => setLoadingRoutes(false));
		}
	}, [dialogOpen, dbPath]);

	const handleSelectFile = useCallback(async () => {
		const filePath = await selectIliXmlFile();
        console.log(filePath);
		if (filePath) {
			setXmlFilePath(filePath);
			form.setFieldsValue({ xmlFilePath: filePath });
		}
	}, [form]);

	const executeImport = useCallback(async (params) => {
		try {
			await runIliXmlImport(dbPath, params);
		} catch (err) {
			iliImportError(err);
		}
	}, [dbPath]);

	const handleSubmit = useCallback(async () => {
		try {
			const values = await form.validateFields();

			const params = {
				xmlFilePath: values.xmlFilePath,
				routeId: values.routeId,
				kmStart: values.kmStart,
				kmEnd: values.kmEnd,
				date: values.date ? values.date.format('DD.MM.YYYY') : '',
				company: values.company || 'UNKNOWN',
				format: values.format || 'xml',
				sourceGcl: values.sourceGcl || '',
				model: values.model || '',
				doCalcCoordinates: true,//values.doCalcCoordinates !== false,
			};

			const modal = confirm({
				title: 'Импорт отчета ВТД',
				icon: <ExclamationCircleOutlined />,
				content: (
					<div>
						<p>Все существующие данные ВТД (по всем маршрутам) будут удалены и заменены новым отчетом.</p>
						<p style={{ marginTop: 8 }}>Продолжить?</p>
					</div>
				),
				okText: 'Импортировать',
				okType: 'danger',
				cancelText: 'Отмена',
				onOk: async () => {
					modal.destroy();
					try {
						await deleteAllInspections(dbPath);
						await executeImport(params);
					} catch (err) {
						iliImportError(err);
					}
				},
			});
		} catch (err) {
			if (err?.errorFields) {
				// Form validation error — ignore, antd shows it
				return;
			}
			iliImportError(err);
		}
	}, [dbPath, form, executeImport]);

	const handleCancel = useCallback(() => {
		if (!isRunning) {
			closeIliImportDialog();
			form.resetFields();
			setXmlFilePath('');
		}
	}, [isRunning, form]);

	return (
		<StyledModal
			title="Импорт отчета ВТД (XML)"
			open={dialogOpen}
			onCancel={handleCancel}
			footer={null}
			width={520}
			destroyOnClose
			maskClosable={!isRunning}
			closable={!isRunning}
		>
			<StyledForm
				form={form}
				layout="vertical"
				initialValues={{
					format: 'xml',
					company: 'UNKNOWN',
					doCalcCoordinates: true,
				}}
			>
				{error && (
					<StyledAlert
						message="Ошибка импорта"
						description={error}
						type="error"
						showIcon
						closable
						style={{ marginBottom: 16 }}
					/>
				)}

				<Form.Item
					name="xmlFilePath"
					label="Файл отчета XML"
					rules={[{ required: true, message: 'Выберите XML файл' }]}
				>
					<Space.Compact style={{ width: '100%' }}>
						<StyledInput
							value={xmlFilePath}
							placeholder="Путь к XML файлу..."
							readOnly
							style={{ flex: 1 }}
						/>
						<StyledSecondaryButton
							icon={<UploadOutlined />}
							onClick={handleSelectFile}
							disabled={isRunning}
						>
							Выбрать
						</StyledSecondaryButton>
					</Space.Compact>
				</Form.Item>

				<Form.Item
					name="routeId"
					label="Трубопровод (маршрут)"
					rules={[{ required: true, message: 'Выберите маршрут' }]}
				>
					<StyledSelect
						placeholder="Выберите маршрут..."
						loading={loadingRoutes}
						disabled={isRunning}
						showSearch
						optionFilterProp="label"
						options={routes.map(r => ({
							value: r.route_id,
							label: r.description || `Route ${r.route_id}`,
						}))}
					/>
				</Form.Item>

				<Space style={{ width: '100%' }} size="middle">
					<Form.Item
						name="kmStart"
						label="КМ начало"
						rules={[{ required: true, message: 'Укажите КМ начало' }]}
						style={{ flex: 1 }}
					>
						<StyledInput type="number" disabled={isRunning} placeholder="0" />
					</Form.Item>

					<Form.Item
						name="kmEnd"
						label="КМ конец"
						rules={[{ required: true, message: 'Укажите КМ конец' }]}
						style={{ flex: 1 }}
					>
						<StyledInput type="number" disabled={isRunning} placeholder="100" />
					</Form.Item>
				</Space>

				<Form.Item
					name="date"
					label="Дата обследования"
					rules={[{ required: true, message: 'Укажите дату' }]}
				>
					<StyledDatePicker
						format="DD.MM.YYYY"
						disabled={isRunning}
						style={{ width: '100%' }}
						placeholder="Выберите дату"
					/>
				</Form.Item>

				{/* <Form.Item name="doCalcCoordinates" valuePropName="checked" style={{ marginBottom: 12 }}>
					<Checkbox disabled={isRunning}>
						Рассчитать координаты после импорта
					</Checkbox>
				</Form.Item> */}
	
				<Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
					<Space>
						<StyledSecondaryButton onClick={handleCancel} disabled={isRunning}>
							Отмена
						</StyledSecondaryButton>
						<StyledPrimaryButton
							onClick={handleSubmit}
							loading={isRunning}
						>
							{isRunning ? 'Импорт...' : 'Импортировать'}
						</StyledPrimaryButton>
					</Space>
				</Form.Item>
			</StyledForm>
		</StyledModal>
	);
};

const StyledPrimaryButton = styled(Button)`
	&.ant-btn {
		background: ${MEDIUM_DARK_BLUE} !important;
		border-color: ${MEDIUM_DARK_BLUE} !important;
		color: #ffffff !important;
		font-weight: 500;
		transition: all 0.2s ease-in-out;
	}

	&.ant-btn:hover:not(:disabled) {
		background: ${ORANGE} !important;
		border-color: ${ORANGE} !important;
	}

	&.ant-btn:disabled {
		background: #f5f5f5 !important;
		border-color: #d9d9d9 !important;
		color: rgba(0, 0, 0, 0.25) !important;
	}
`;

const StyledSecondaryButton = styled(Button)`
	&.ant-btn {
		background: #ffffff !important;
		border-color: #d9d9d9 !important;
		color: rgba(0, 0, 0, 0.85) !important;
		font-weight: 500;
		transition: all 0.2s ease-in-out;
	}

	&.ant-btn:hover:not(:disabled) {
		border-color: ${MEDIUM_DARK_BLUE} !important;
		color: ${MEDIUM_DARK_BLUE} !important;
	}

	&.ant-btn:disabled {
		background: #f5f5f5 !important;
		border-color: #d9d9d9 !important;
		color: rgba(0, 0, 0, 0.25) !important;
	}
`;

const StyledInput = styled(Input)`
	&.ant-input {
		border: 1px solid #d9d9d9;
		color: rgba(0, 51, 102, 0.85);
		transition: all 0.2s ease-in-out;
	}

	&.ant-input:hover {
		border-color: ${MEDIUM_DARK_BLUE};
	}

	&.ant-input:focus {
		border-color: ${MEDIUM_DARK_BLUE};
		box-shadow: 0 0 0 2px rgba(0, 93, 152, 0.1);
	}

	&.ant-input::placeholder {
		color: rgba(0, 51, 102, 0.5);
	}

	&.ant-input:disabled {
		background: #f5f5f5;
		color: rgba(0, 0, 0, 0.25);
	}
`;

const StyledSelect = styled(Select)`
	.ant-select-selector {
		border: 1px solid #d9d9d9 !important;
		color: rgba(0, 51, 102, 0.85) !important;
		transition: all 0.2s ease-in-out;
	}

	.ant-select:hover .ant-select-selector {
		border-color: ${MEDIUM_DARK_BLUE} !important;
	}

	.ant-select-focused .ant-select-selector {
		border-color: ${MEDIUM_DARK_BLUE} !important;
		box-shadow: 0 0 0 2px rgba(0, 93, 152, 0.1) !important;
	}

	.ant-select-disabled .ant-select-selector {
		background: #f5f5f5 !important;
		color: rgba(0, 0, 0, 0.25) !important;
	}
`;

const StyledDatePicker = styled(DatePicker)`
	&.ant-picker {
		border: 1px solid #d9d9d9;
		color: rgba(0, 51, 102, 0.85);
		transition: all 0.2s ease-in-out;
	}

	&.ant-picker:hover {
		border-color: ${MEDIUM_DARK_BLUE};
	}

	&.ant-picker-focused {
		border-color: ${MEDIUM_DARK_BLUE};
		box-shadow: 0 0 0 2px rgba(0, 93, 152, 0.1);
	}

	&.ant-picker-input > input::placeholder {
		color: rgba(0, 51, 102, 0.5);
	}

	&.ant-picker-disabled {
		background: #f5f5f5;
		color: rgba(0, 0, 0, 0.25);
	}
`;

const StyledAlert = styled(Alert)`
	&.ant-alert {
		border: 1px solid #f5222d;
		border-radius: 4px;
	}

	&.ant-alert-error .ant-alert-icon {
		color: #f5222d;
	}

	&.ant-alert-error .ant-alert-message {
		color: #f5222d;
		font-weight: 500;
	}

	&.ant-alert-error .ant-alert-description {
		color: rgba(0, 0, 0, 0.85);
	}
`;

const StyledModal = styled(Modal)`
	.ant-modal-content {
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	.ant-modal-header {
		border-radius: 8px 8px 0 0;
		background: #ffffff;
		border-bottom: 1px solid #f0f0f0;
	}

	.ant-modal-title {
		color: rgba(0, 51, 102, 0.85);
		font-weight: 500;
	}

	.ant-modal-close {
		color: rgba(0, 0, 0, 0.45);
	}

	.ant-modal-close:hover {
		color: ${MEDIUM_DARK_BLUE};
	}
`;

const StyledForm = styled(Form)`
	.ant-form-item-label > label {
		color: rgba(0, 51, 102, 0.85);
		font-weight: 500;
	}
`;
