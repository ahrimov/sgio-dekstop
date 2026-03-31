export function buildFilterClauses(atribs, filters) {
  const typeByField = {};
  atribs.forEach(atrib => {
    typeByField[atrib.name] = atrib.type;
  });

  const isNumericType = (type) => {
    return type === "NUMBER" || type === "INTEGER" || type === "FLOAT" || type === "DOUBLE";
  };

  return Object.entries(filters)
    .map(([key, value]) => {
      const type = typeByField[key];
      
      // Обработка диапазона для числовых типов
      if (Array.isArray(value) && value.length === 2 && isNumericType(type)) {
        const min = Number(value[0]), max = Number(value[1]);
        if (!isNaN(min) && !isNaN(max)) {
          return `${key} BETWEEN ${min} AND ${max}`;
        }
        if (!isNaN(min)) return `${key} >= ${min}`;
        if (!isNaN(max)) return `${key} <= ${max}`;
        return null;
      }

      if (typeof value === "number" && isNumericType(type)) {
        return `${key} = ${value}`;
      }

      // Обработка одиночного значения
      if (typeof value === "string" && value.length > 0) {
        if (type === "STRING") {
          return `${key} LIKE '%${value.replace(/'/g, "''")}%'`;
        }
        if (type === "ENUM") {
          return `${key} = '${value.replace(/'/g, "''")}'`;
        }
        if (isNumericType(type) && !isNaN(Number(value))) {
          return `${key} = ${Number(value)}`;
        }
      }

      // Обработка массива значений (для ENUM)
      if (Array.isArray(value) && value.length > 0) {
        const safeValues = value.map(v => `'${v.replace(/'/g, "''")}'`).join(", ");
        return `${key} IN (${safeValues})`;
      }


      return null;
    })
    .filter(Boolean);
}
