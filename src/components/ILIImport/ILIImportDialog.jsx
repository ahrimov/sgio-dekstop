import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Form, Select, Space, Alert } from 'antd';
import { ExclamationCircleOutlined, CloseOutlined, UploadOutlined } from '@ant-design/icons';
import { useUnit } from 'effector-react';
import styled from 'styled-components';
import {
	$iliImportState,
	closeIliImportDialog,
	iliImportError,
} from '../../store/iliImport';
import { runIliXmlImport, selectIliXmlFile, loadRoutesByType } from '../../features/ILIImport/importILIXml';
import { DARK_BLUE, MEDIUM_DARK_BLUE } from '../../consts/style';
import Checkbox from 'antd/es/checkbox/Checkbox';
import '../ModalDialog/ModalDialog.css';

const { confirm } = Modal;

const ROUTE_TYPES = [
	{ value: 'ROUTE_TYPE_02', label: 'Соединительная перемычка' },
	{ value: 'ROUTE_TYPE_04', label: 'Отвод' },
	{ value: 'ROUTE_TYPE_10', label: 'Магистральный' },
	{ value: 'ROUTE_TYPE_11', label: 'Резервный' },
	{ value: 'ROUTE_TYPE_12', label: 'Лупинг' },
	{ value: 'ROUTE_TYPE_13', label: 'Дублирующая врезка' },
];

async function deleteAllInspections(dbPath) {
	console.log('[ILI Delete All] Deleting all ILI data before import...');
	const result = await window.electronAPI.iliDeleteAll(dbPath);
	console.log('[ILI Delete All] Result:', result);
	return result;
}

export const ILIImportDialog = ({ dbPath }) => {
	const { dialogOpen, isRunning, error } = useUnit($iliImportState);
	const [form] = Form.useForm();
	const [currentStep, setCurrentStep] = useState(0);
	const [xmlFilePath, setXmlFilePath] = useState('');

	// Step 2 state
	const [selectedRouteType, setSelectedRouteType] = useState(null);
	const [pipelines, setPipelines] = useState([]);
	const [loadingPipelines, setLoadingPipelines] = useState(false);

	// Reset state when dialog opens/closes
	useEffect(() => {
		if (!dialogOpen) {
			setCurrentStep(0);
			setXmlFilePath('');
			setSelectedRouteType(null);
			setPipelines([]);
			form.resetFields();
		}
	}, [dialogOpen, form]);

	// Load pipelines when route type changes
	useEffect(() => {
		if (selectedRouteType && dbPath) {
			setLoadingPipelines(true);
			setPipelines([]);
			form.setFieldsValue({ routeId: undefined });
			loadRoutesByType(dbPath, selectedRouteType)
				.then(r => setPipelines(r))
				.finally(() => setLoadingPipelines(false));
		} else {
			setPipelines([]);
		}
	}, [selectedRouteType, dbPath, form]);

	const handleSelectFile = useCallback(async () => {
		const filePath = await selectIliXmlFile();
		console.log(filePath);
		if (filePath) {
			setXmlFilePath(filePath);
			form.setFieldsValue({ xmlFilePath: filePath });
		}
	}, [form]);

	const handleNextStep = useCallback(async () => {
		try {
			await form.validateFields(['xmlFilePath']);
			setCurrentStep(1);
		} catch {
			// Validation error — antd shows it
		}
	}, [form]);

	const handlePrevStep = useCallback(() => {
		setCurrentStep(0);
	}, []);

	const handleRouteTypeChange = useCallback((value) => {
		setSelectedRouteType(value);
	}, []);

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

			const selectedPipeline = pipelines.find(p => p.route_id === values.routeId);

			const params = {
				xmlFilePath: values.xmlFilePath,
				routeId: values.routeId,
				kmStart: selectedPipeline?.station_begin ?? 0,
				kmEnd: selectedPipeline?.station_end ?? 0,
				date: '',
				company: 'UNKNOWN',
				format: 'xml',
				sourceGcl: '',
				model: '',
				doCalcCoordinates: values.doCalcCoordinates !== false,
			};

			const modal = confirm({
				title: <span style={{ color: MEDIUM_DARK_BLUE }}>Импорт отчетов из файла XML</span>,
				icon: <ExclamationCircleOutlined />,
				content: (
					<div style={{ color: MEDIUM_DARK_BLUE }}>
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
				return;
			}
			iliImportError(err);
		}
	}, [dbPath, form, executeImport, pipelines]);

	const handleCancel = useCallback(() => {
		if (!isRunning) {
			closeIliImportDialog();
			form.resetFields();
			setXmlFilePath('');
			setCurrentStep(0);
			setSelectedRouteType(null);
			setPipelines([]);
		}
	}, [isRunning, form]);

	const formatPipelineLabel = (pipeline) => {
		const desc = pipeline.description || `Участок ${pipeline.route_id}`;
		const begin = pipeline.station_begin != null ? pipeline.station_begin : '?';
		const end = pipeline.station_end != null ? pipeline.station_end : '?';
		return `${desc} (км ${begin} – ${end})`;
	};

	return (
		<StyledModal
			title={null}
			open={dialogOpen}
			onCancel={handleCancel}
			closable={false}
			width={520}
			destroyOnClose
			maskClosable={!isRunning}
			footer={
				<div className="modal-dialog-footer">
					{currentStep === 0 ? (
						<>
							<button
								className="modal-dialog-button modal-dialog-button-confirm"
								onClick={handleNextStep}
								disabled={!xmlFilePath || isRunning}
							>
								Импортировать
							</button>
							<button
								className="modal-dialog-button modal-dialog-button-cancel"
								onClick={handleCancel}
								disabled={isRunning}
							>
								Отмена
							</button>
						</>
					) : (
						<>
							<button
								className="modal-dialog-button modal-dialog-button-confirm"
								onClick={handleSubmit}
								disabled={isRunning}
								autoFocus
							>
								Ок
							</button>
							<button
								className="modal-dialog-button modal-dialog-button-cancel"
								onClick={handlePrevStep}
								disabled={isRunning}
							>
								Отмена
							</button>
						</>
					)}
				</div>
			}
		>
			<CustomHeader>
				<HeaderTitle>{currentStep === 0 ? "Импорт отчетов из ВТД" : "Выбрать"}</HeaderTitle>
				<ControlButton onClick={handleCancel} title="Закрыть" disabled={isRunning}>
					<CloseOutlined />
				</ControlButton>
			</CustomHeader>

			<BodyWrapper>
				{error && (
					<Alert
						message="Ошибка импорта"
						description={error}
						type="error"
						showIcon
						closable
						style={{ marginBottom: 16 }}
					/>
				)}

				<StyledForm
					form={form}
					layout="vertical"
					initialValues={{
						doCalcCoordinates: true,
					}}
				>
					{/* ===== STEP 1: File Selection ===== */}
					<div style={{ display: currentStep === 0 ? 'block' : 'none' }}>
						<Form.Item
							name="xmlFilePath"
							label="В диалоге выбора файла необходимо выбрать файл с раширением .xml"
							rules={[{ message: 'Выберите XML файл' }]}
						>
							<Space.Compact style={{ width: '100%' }}>
								<FileInput
									value={xmlFilePath}
									placeholder="Путь к XML файлу..."
									readOnly
								/>
								<FileButton
									type="button"
									onClick={handleSelectFile}
									disabled={isRunning}
								>
									<UploadOutlined style={{ marginRight: 6 }} />
									Выбрать
								</FileButton>
							</Space.Compact>
						</Form.Item>
					</div>

					{/* ===== STEP 2: Route Type + Pipeline + Date ===== */}
					<div style={{ display: currentStep === 1 ? 'block' : 'none' }}>
						<InlineRow>
							<InlineLabel>Выберите тип</InlineLabel>
							<Form.Item name="routeType" style={{ flex: 1, marginBottom: 0 }}>
								<Select
									disabled={isRunning}
									options={ROUTE_TYPES}
									onChange={handleRouteTypeChange}
									style={{ color: MEDIUM_DARK_BLUE }}
								/>
							</Form.Item>
						</InlineRow>

						<InlineRow>
							<InlineLabel>Выберите участок</InlineLabel>
							<Form.Item name="routeId" style={{ flex: 1, marginBottom: 0 }}>
								<Select
									loading={loadingPipelines}
									disabled={isRunning || !selectedRouteType}
									showSearch
									optionFilterProp="label"
									options={pipelines.map(p => ({
										value: p.route_id,
										label: formatPipelineLabel(p),
									}))}
									style={{ color: MEDIUM_DARK_BLUE }}
								/>
							</Form.Item>
						</InlineRow>

						<Form.Item name="doCalcCoordinates" valuePropName="checked" style={{ marginBottom: 0 }}>
							<Checkbox disabled={isRunning} style={{ color: MEDIUM_DARK_BLUE }}>
								Рассчитать координаты после импорта
							</Checkbox>
						</Form.Item>
					</div>
				</StyledForm>
			</BodyWrapper>
		</StyledModal>
	);
};

const StyledModal = styled(Modal)`
	.ant-modal-content {
		overflow: hidden;
		border-radius: 8px;
		padding: 0;
		color: ${MEDIUM_DARK_BLUE} !important;
	}

	.ant-modal-body {
		padding: 0;
	}

	.ant-modal-footer {
		padding-bottom: 14px;
		padding-right: 26px;
		margin-top: 0;
	}

	.ant-modal-container {
		padding: 0 !important;
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

	&:hover:not(:disabled) {
		color: #000000;
		background-color: #ffffff;
	}

	&:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}
`;

const BodyWrapper = styled.div`
	padding: 20px 24px 8px 24px;
`;

const StyledForm = styled(Form)`
	.ant-form-item-label > label {
		font-size: 13px;
		font-weight: 500;
		color: ${MEDIUM_DARK_BLUE};
	}
`;

const FileInput = styled.input`
	flex: 1;
	padding: 4px 10px;
	border: 1px solid #d9d9d9;
	border-right: none;
	border-radius: 6px 0 0 6px;
	font-size: 13px;
	color: ${MEDIUM_DARK_BLUE};
	background: #f5f5f5;
	outline: none;
	width: 100%;

	&::placeholder {
		color: #aaa;
	}
`;

const InlineRow = styled.div`
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 12px;
`;

const InlineLabel = styled.label`
	font-size: 13px;
	font-weight: 500;
	color: ${MEDIUM_DARK_BLUE};
	white-space: nowrap;
	flex-shrink: 0;
	width: 130px;
`;

const FileButton = styled.button`
	padding: 4px 14px;
	border: 1px solid ${DARK_BLUE};
	border-radius: 0 6px 6px 0;
	font-size: 13px;
	font-weight: 500;
	cursor: pointer;
	background: ${DARK_BLUE};
	color: white;
	white-space: nowrap;
	transition: all 0.2s ease;

	&:hover:not(:disabled) {
		background: #FFAF30;
		border-color: #FFAF30;
	}

	&:disabled {
		background: #d9d9d9;
		border-color: #d9d9d9;
		color: rgba(0, 0, 0, 0.25);
		cursor: not-allowed;
	}
`;
