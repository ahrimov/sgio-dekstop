import { $modalDialog, showAlert } from '../../store/modalDialog.js';

let warned = false;

export function warnTileCacheLimit(limitBytes) {
	if (warned) return;
	warned = true;
	const show = () => {
		void showAlert(
			'Достигнут лимит хранения тайлов',
			`Лимит хранения тайлов — ${limitBytes / 1024 ** 3} ГиБ. Новые тайлы больше не сохраняются на устройство. Онлайн-карта продолжит работать, существующие файлы сохранены. Освободите место в папке тайлов или увеличьте OnlineTileCacheLimitGb в config.xml, затем перезапустите приложение.`
		);
	};
	// Do not replace an existing confirmation or another modal dialog.
	if (!$modalDialog.getState().isOpen) {
		show();
		return;
	}
	const unsubscribe = $modalDialog.updates.watch(state => {
		if (!state.isOpen) {
			unsubscribe();
			setTimeout(show, 0);
		}
	});
}
