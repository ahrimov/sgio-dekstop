export function buildFilterClauses(atribs, filters) {
  const typeByField = {};
  atribs.forEach(atrib => {
    typeByField[atrib.name] = atrib.type;
  });

  return Object.entries(filters)
    .map(([key, value]) => {
      const type = typeByField[key];
      if (Array.isArray(value) && value.length === 2 && type === "NUMBER") {
        const min = Number(value[0]), max = Number(value[1]);
        if (!isNaN(min) && !isNaN(max)) {
          return `${key} BETWEEN ${min} AND ${max}`;
        }
        if (!isNaN(min)) return `${key} >= ${min}`;
        if (!isNaN(max)) return `${key} <= ${max}`;
        return null;
      }

      if (Array.isArray(value) && value.length > 0) {
        const safeValues = value.map(v => `'${v.replace(/'/g, "''")}'`).join(", ");
        return `${key} IN (${safeValues})`;
      }

      if (typeof value === "string" && value.length > 0) {
        if (type === "STRING") {
          return `${key} LIKE '%${value.replace(/'/g, "''")}%'`;
        }
        if (type === "ENUM") {
          return `${key} = '${value.replace(/'/g, "''")}'`;
        }
        if (type === "NUMBER" && !isNaN(Number(value))) {
          return `${key} = ${Number(value)}`;
        }
      }
      return null;
    })
    .filter(Boolean);
}
