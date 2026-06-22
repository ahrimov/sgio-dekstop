import { createStore, createEvent } from 'effector';

/**
 * Effector store for ILI report reversal state ("Разворот отчета ВТД").
 * Tracks dialog visibility, progress, and results.
 */

// Events
export const openIliReverseDialog = createEvent();
export const closeIliReverseDialog = createEvent();
export const startIliReverse = createEvent();
export const updateIliReverseProgress = createEvent();
export const iliReverseComplete = createEvent();
export const iliReverseError = createEvent();
export const resetIliReverse = createEvent();

// Store
export const $iliReverseState = createStore({
	dialogOpen: false,
	isRunning: false,
	currentStep: 0,
	totalSteps: 5,
	percent: 0,
	message: '',
	error: null,
	result: null,
})
	.on(openIliReverseDialog, state => ({
		...state,
		dialogOpen: true,
		error: null,
		result: null,
	}))
	.on(closeIliReverseDialog, state => ({
		...state,
		dialogOpen: false,
	}))
	.on(startIliReverse, state => ({
		...state,
		isRunning: true,
		currentStep: 0,
		percent: 0,
		message: 'Начало разворота отчёта...',
		error: null,
		result: null,
	}))
	.on(updateIliReverseProgress, (state, { step, message, percent }) => ({
		...state,
		currentStep: step,
		message,
		percent,
	}))
	.on(iliReverseComplete, (state, result) => ({
		...state,
		isRunning: false,
		percent: 100,
		message: 'Разворот отчёта завершён!',
		result,
		dialogOpen: false,
	}))
	.on(iliReverseError, (state, error) => ({
		...state,
		isRunning: false,
		error: typeof error === 'string' ? error : error?.message || 'Неизвестная ошибка',
	}))
	.on(resetIliReverse, () => ({
		dialogOpen: false,
		isRunning: false,
		currentStep: 0,
		totalSteps: 5,
		percent: 0,
		message: '',
		error: null,
		result: null,
	}));
