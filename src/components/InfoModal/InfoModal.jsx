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
            title="СГИО.Десктоп"
            okText="OK"
            cancelButtonProps={{ style: { display: 'none' } }}
            centered
        >
            <div>
                Версия: 1.0.0<br />
                {new Date().getFullYear()}<br />
                <br />
            </div>
        </Modal>
    );
}
