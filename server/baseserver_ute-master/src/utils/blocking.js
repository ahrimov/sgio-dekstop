const uteLockMatrix = {
    route: [
        'lrs-route-calc',
        'km-route-calc',
        'group-route-idx',
        'offline-line-idx',
        'line-route-idx',
        'interval-divining',
    ],
    ili: [
        'ili-insp-calc',
        'ili-insp-link',
        'ili-import-xml',
        'ili-cluster',
        'sto-ehz-insp-proc',
        'sto-ili-insp-proc',
        'ili-pressure',
        'interval-divining',
    ],
    map: [
        'export_map',
        'import_map',
    ],
};

/**
 * Проверка на блокировку
 * @param {string} data лог
 * @param {string} serviceName имя сервиса
 * @returns {boolean} Возвращает true(проверка пройдена, сервис может быть запущен) или false(проверка не пройдена).
 */

function canCallUteProcess(data, serviceName) {
    let canCall = true;
    try {
        /**
		 * Функция выделяет из строки блок с информацией по группе вызванной задаче и парсит в JSON-объект
		 * @param str  скрока лога
		 * @returns {{}}
		 */
        const parseServicePoint = (str) => {
            let res = {};
            try {
                const serviceBlock = str.slice(str.indexOf('{'), str.indexOf('}') + 1);
                res = JSON.parse(serviceBlock);
            } catch (ex) {}
            return res;
        };

        /**
		 * Поиск групп, в которых состоит сервис
		 * @param serviceName Имя сервиса(из api)
		 * @returns {string[]}
		 */
        const getServiceGroup = (serviceName) => {
            const serviceGroup = [];
            for (const group of Object.keys(uteLockMatrix)) {
                if (uteLockMatrix[group].indexOf(serviceName) !== -1) {
                    serviceGroup.push(group);
                }
            }
            return serviceGroup;
        };
        // search in log for start and end line of process service
        // split the contents by new line
        // проверки специально убраны,потому что их появление значит отсутсвие лога = продолжение работы сервиса.
        const lines = data.split(/\r?\n/);
        const serviceGroups = getServiceGroup(serviceName);
        // проверка блокировок
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.indexOf('service : ') !== -1) {
                const startServicePoint = parseServicePoint(line);
                if (serviceGroups.indexOf(startServicePoint.serviceGroup) !== -1) canCall = false;
                for (let ii = i; ii < lines.length; ii++) {
                    const subLine = lines[ii];
                    if (subLine.indexOf('Server \'baseserver_ute\' listening on port') !== -1) {
                        canCall = true;
                        i = ii;
                        break;
                    }
                    if (subLine.indexOf('finished : ') !== -1) {
                        const endServicePoint = parseServicePoint(subLine);
                        if (startServicePoint.serviceGroup === endServicePoint.serviceGroup) {
                            canCall = true;
                            i = ii;
                            break;
                        } else if (serviceGroups.indexOf(startServicePoint.serviceGroup) !== -1) canCall = false;
                    }
                    i = ii;
                }
            }
        }
    } catch (e) { }
    return canCall;
}

module.exports = {
    canCallUteProcess,
};
