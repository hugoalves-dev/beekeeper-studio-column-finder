import type { SupportedDb } from './sql';

/**
 * SDK 1.7.2 expects 'table'; current Beekeeper hosts use 'name'.
 * In MySQL/MariaDB the host's table cache has no distinct schema property,
 * so passing the database name in 'schema' makes navigation fail.
 */
export function buildStructureTabOptions(
  databaseType: SupportedDb,
  tableName: string,
  schemaName: string,
  databaseName: string,
) {
  return {
    table: tableName,
    name: tableName,
    ...(databaseType === 'postgresql' ? { schema: schemaName } : {}),
    database: databaseName,
  };
}
