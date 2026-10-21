import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/navigation.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { buildStructureTabOptions } = await import(
  `data:text/javascript,${encodeURIComponent(output)}`
);

test('MySQL does not pass a schema', () => {
  assert.deepEqual(buildStructureTabOptions('mysql', 'orders', 'shop', 'shop'), {
    table: 'orders', name: 'orders', database: 'shop',
  });
});
test('MariaDB does not pass a schema', () => {
  assert.equal(Object.hasOwn(buildStructureTabOptions('mariadb', 'orders', 'shop', 'shop'), 'schema'), false);
});
test('PostgreSQL passes its actual schema', () => {
  assert.deepEqual(buildStructureTabOptions('postgresql', 'orders', 'accounting', 'app'), {
    table: 'orders', name: 'orders', schema: 'accounting', database: 'app',
  });
});
