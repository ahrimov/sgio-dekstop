import { createStore, createEvent } from 'effector';

/**
 * Effector store for ILI XML import state.
 * Tracks import dialog visibility, progress, and results.
 */

// Events
export const openIliImportDialog = createEvent();
export const closeIliImportDialog = createEvent();
export const startIliImport = createEvent();
export const updateIliImportProgress = createEvent();
export const iliImportComplete = createEvent();
export const iliImportError = createEvent();
export const resetIliImport = createEvent();

// Store
export const $iliImportState = createStore({
	dialogOpen: false,
	isRunning: false,
	currentStep: 0,
	totalSteps: 12,
	percent: 0,
	message: '',
	error: null,
	result: null,
})
	.on(openIliImportDialog, state => ({
		...state,
		dialogOpen: true,
		error: null,
		result: null,
	}))
	.on(closeIliImportDialog, state => ({
		...state,
		dialogOpen: false,
	}))
	.on(startIliImport, state => ({
		...state,
		isRunning: true,
		currentStep: 0,
		percent: 0,
		message: 'Начало импорта...',
		error: null,
		result: null,
	}))
	.on(updateIliImportProgress, (state, { step, message, percent }) => ({
		...state,
		currentStep: step,
		message,
		percent,
	}))
	.on(iliImportComplete, (state, result) => ({
		...state,
		isRunning: false,
		percent: 100,
		message: 'Импорт завершен!',
		result,
		dialogOpen: false,
	}))
	.on(iliImportError, (state, error) => ({
		...state,
		isRunning: false,
		error: typeof error === 'string' ? error : error?.message || 'Неизвестная ошибка',
	}))
	.on(resetIliImport, () => ({
		dialogOpen: false,
		isRunning: false,
		currentStep: 0,
		totalSteps: 12,
		percent: 0,
		message: '',
		error: null,
		result: null,
	}));
