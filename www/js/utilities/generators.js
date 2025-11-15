function autonumericID(idName, layer){
    return new Promise((resolve, reject) => {
      requestToDB(`SELECT MAX(${idName}) as id FROM ${layer.id}`, function(data){
        let id = 0
        if(typeof data.rows.item(0).id != 'undefined')
          id = data.rows.item(0).id + 1
        resolve(id)
      }, 'Ошибка генерации id')
    })
}

function createColorGenerator() {
  const carouselColors = [
    'rgba(255, 206, 86, 1)',
    'rgba(255, 99, 132, 1)',
    'rgba(54, 162, 235, 1)',
    'rgba(75, 192, 192, 1)',
    'rgba(153, 102, 255, 1)',
    'rgba(255, 159, 64, 1)',
    'rgba(64, 102, 255, 1)',
    'rgba(201, 64, 255, 1)',
    'rgba(255, 64, 64, 1)',
    'rgba(131, 131, 131, 1)',
    'rgba(138, 67, 0, 1)',
    'rgba(0, 148, 7, 1)',
    'rgba(121, 0, 58, 1)',
    'rgba(74, 50, 148, 1)',
  ];

  const shuffled = [...carouselColors].sort(() => 0.5 - Math.random());
  let index = 0;

  return function () {
    if (index >= shuffled.length) {
      index = 0;
    }
    return shuffled[index++];
  }
}

const generateColor = createColorGenerator();
