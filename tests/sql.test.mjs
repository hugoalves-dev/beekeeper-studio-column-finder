import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

const source = readFileSync(new URL('../src/sql.ts', import.meta.url), 'utf8');
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { buildSearchQuery, isSupportedDb, MAX_RESULTS } = await import(
  `data:text/javascript,${encodeURIComponent(transpiled)}`
);

test('recognizes PostgreSQL, MySQL and MariaDB', () => {
  assert.equal(isSupportedDb('postgresql'), true);
  assert.equal(isSupportedDb('mysql'), true);
  assert.equal(isSupportedDb('mariadb'), true);
  assert.equal(isSupportedDb('sqlite'), false);
});

test('PostgreSQL searches all user schemas and preserves aliases', () => {
  const query = buildSearchQuery('postgresql', 'cliente');
  assert.match(query, /FROM information_schema\.columns AS c/);
  assert.match(query, /c\.table_schema NOT IN \('pg_catalog', 'information_schema'\)/);
  assert.match(query, /AS "schemaName"/);
  assert.match(query, /AS "columnName"/);
  assert.match(query, /strpos\(lower\(c\.column_name\),/);
  assert.doesNotMatch(query, /DATABASE\(\)/);
  assert.match(query, new RegExp(`LIMIT ${MAX_RESULTS + 1}$`));
});

test('MySQL and MariaDB search only the selected database', () => {
  for (const db of ['mysql', 'mariadb']) {
    const query = buildSearchQuery(db, 'nome');
    assert.match(query, /c\.TABLE_SCHEMA = DATABASE\(\)/);
    assert.match(query, /CONVERT\(0x6e6f6d65 USING utf8mb4\)/);
    assert.match(query, new RegExp(`LIMIT ${MAX_RESULTS + 1}$`));
  }
});

test('special characters are encoded as UTF-8 hex rather than executable SQL', () => {
  const input = "d'_% OR 1=1; -- ç";
  for (const db of ['mysql', 'mariadb', 'postgresql']) {
    const query = buildSearchQuery(db, input);
    const hex = Buffer.from(input, 'utf8').toString('hex');
    assert.match(query, new RegExp(hex));
    assert.ok(!query.includes(input));
    assert.ok(query.trimStart().startsWith('SELECT'));
  }
});

test('empty search terms are rejected', () => {
  assert.throws(() => buildSearchQuery('postgresql', ''), /não pode ser vazio/);
});
