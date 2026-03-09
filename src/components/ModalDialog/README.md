# ModalDialog - Глобальная модальная система

Единая модальная система для всего приложения, которую можно вызвать из любой точки.

## Использование

### 1. Alert (только кнопка OK)

```javascript
import { showAlert } from '../../store/modalDialog';

// Простой alert
showAlert('Заголовок', 'Сообщение');

// Alert с callback
showAlert('Успех', 'Операция выполнена успешно', () => {
	console.log('Пользователь нажал OK');
});

// Alert с кастомным текстом кнопки
showAlert('Внимание', 'Важное сообщение', null, 'Понятно');

// Alert с Promise
const result = await showAlert('Информация', 'Данные сохранены');
console.log('Диалог закрыт');
```

### 2. Confirm (кнопки OK и Отмена)

```javascript
import { showConfirm } from '../../store/modalDialog';

// Простой confirm
showConfirm('Подтверждение', 'Вы уверены?');

// Confirm с callbacks
showConfirm(
	'Удаление',
	'Удалить этот элемент?',
	() => {
		console.log('Подтверждено');
		// Выполнить действие
	},
	() => {
		console.log('Отменено');
	}
);

// Confirm с кастомными текстами кнопок
showConfirm('Сохранение', 'Сохранить изменения?', null, null, 'Сохранить', 'Не сохранять');

// Confirm с Promise
const confirmed = await showConfirm('Подтверждение', 'Продолжить?');
if (confirmed) {
	console.log('Пользователь подтвердил');
} else {
	console.log('Пользователь отменил');
}
```

### 3. Примеры использования в компонентах

```javascript
import React from 'react';
import { showAlert, showConfirm } from '../../store/modalDialog';

function MyComponent() {
	const handleSave = async () => {
		const confirmed = await showConfirm(
			'Сохранение',
			'Сохранить изменения перед выходом?',
			null,
			null,
			'Сохранить',
			'Отмена'
		);

		if (confirmed) {
			// Сохранить данные
			await saveData();
			showAlert('Успех', 'Данные успешно сохранены');
		}
	};

	const handleDelete = async () => {
		const confirmed = await showConfirm(
			'Удаление',
			'Вы действительно хотите удалить этот элемент? Это действие нельзя отменить.',
			null,
			null,
			'Удалить',
			'Отмена'
		);

		if (confirmed) {
			try {
				await deleteItem();
				showAlert('Успех', 'Элемент удален');
			} catch (error) {
				showAlert('Ошибка', `Не удалось удалить элемент: ${error.message}`);
			}
		}
	};

	return (
		<div>
			<button onClick={handleSave}>Сохранить</button>
			<button onClick={handleDelete}>Удалить</button>
		</div>
	);
}
```

## API

### showAlert(title, message, onConfirm, confirmText)

Показывает диалог с одной кнопкой OK.

**Параметры:**

- `title` (string) - Заголовок диалога
- `message` (string) - Текст сообщения
- `onConfirm` (Function, optional) - Callback при нажатии OK
- `confirmText` (string, optional) - Текст кнопки OK (по умолчанию: 'OK')

**Возвращает:** Promise<boolean> - всегда true

### showConfirm(title, message, onConfirm, onCancel, confirmText, cancelText)

Показывает диалог с кнопками OK и Отмена.

**Параметры:**

- `title` (string) - Заголовок диалога
- `message` (string) - Текст сообщения
- `onConfirm` (Function, optional) - Callback при нажатии OK
- `onCancel` (Function, optional) - Callback при нажатии Отмена
- `confirmText` (string, optional) - Текст кнопки OK (по умолчанию: 'OK')
- `cancelText` (string, optional) - Текст кнопки Отмена (по умолчанию: 'Отмена')

**Возвращает:** Promise<boolean> - true если подтверждено, false если отменено

### closeModal()

Программно закрывает открытый диалог.

```javascript
import { closeModal } from '../../store/modalDialog';

closeModal();
```

## Особенности

- **Глобальный доступ**: Можно вызвать из любой точки приложения
- **Promise-based**: Поддержка async/await для удобной работы
- **Кастомизация**: Настраиваемые тексты кнопок
- **Анимации**: Плавное появление и исчезновение
- **Keyboard support**: Автофокус на кнопке подтверждения
- **Z-index**: 10000 - отображается поверх всех элементов
- **Responsive**: Адаптивная ширина для мобильных устройств
- **Effector**: Использует Effector для управления состоянием
