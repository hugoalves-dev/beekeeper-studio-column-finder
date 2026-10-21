export type SupportedDb = 'mysql' | 'mariadb' | 'postgresql';

export const MAX_RESULTS = 500;

/** Hex-encode user input because the plugin SDK's runQuery has no parameters. */
function toSqlUtf8Hex(term: string): string {
  return [...new TextEncoder().encode(term)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

export function isSupportedDb(databaseType: string): databaseType is SupportedDb {
  return databaseType === 'mysql' || databaseType === 'mariadb' || databaseType === 'postgresql';
}

export function buildSearchQuery(databaseType: SupportedDb, term: string): string {
  const hex = toSqlUtf8Hex(term);
  if (!hex) throw new Error('O termo de pesquisa não pode ser vazio.');

  if (databaseType === 'postgresql') {
    return `
SELECT
  c.table_schema AS "schemaName",
  c.table_name AS "tableName",
  c.column_name AS "columnName",
  CASE
    WHEN c.data_type = 'USER-DEFINED' THEN COALESCE(c.domain_name, c.udt_name)
    ELSE c.data_type
  END AS "columnType"
FROM information_schema.columns AS c
WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
  AND c.table_schema NOT LIKE 'pg_toast%'
  AND strpos(lower(c.column_name), lower(convert_from(decode('${hex}', 'hex'), 'UTF8'))) > 0
ORDER BY c.table_schema, c.table_name, c.ordinal_position
LIMIT ${MAX_RESULTS + 1}`.trim();
  }

  return `
SELECT
  c.TABLE_SCHEMA AS schemaName,
  c.TABLE_NAME AS tableName,
  c.COLUMN_NAME AS columnName,
  c.COLUMN_TYPE AS columnType
FROM information_schema.COLUMNS AS c
WHERE c.TABLE_SCHEMA = DATABASE()
  AND LOCATE(LOWER(CONVERT(0x${hex} USING utf8mb4)), LOWER(c.COLUMN_NAME)) > 0
ORDER BY c.TABLE_NAME, c.ORDINAL_POSITION
LIMIT ${MAX_RESULTS + 1}`.trim();
}
