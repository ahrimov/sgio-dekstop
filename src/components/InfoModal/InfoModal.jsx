import React from 'react';
import { Modal } from 'antd';
import { useUnit } from 'effector-react';
import { $infoModalVisible, closeInfoModal } from './store.js'; // пути поправь

export function InfoModal() {
    const visible = useUnit($infoModalVisible);

    return (
        <Modal
            open={visible}
            onCancel={closeInfoModal}
            onOk={closeInfoModal}
            title="О приложении"
            okText="OK"
            cancelButtonProps={{ style: { display: 'none' } }}
            centered
        >
            <div>
                СГИО.Декстоп 1.0.0<br />
                "ООО Геосервис-Информ"<br />
                О любых проблемах пишите на почту support@corelight.ru
                <br />
            </div>
        </Modal>
    );
}
