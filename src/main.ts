import '@beekeeperstudio/plugin/dist/eventForwarder';
import { getConnectionInfo, openTab, runQuery, setTabTitle } from '@beekeeperstudio/plugin';
import { buildSearchQuery, isSupportedDb, MAX_RESULTS } from './sql';
import { buildStructureTabOptions } from './navigation';
import type { SupportedDb } from './sql';
import './style.css';

interface ColumnHit {
  schemaName: string;
  tableName: string;
  columnName: string;
  columnType: string;
}

const input = document.querySelector<HTMLInputElement>('#search')!;
const rows = document.querySelector<HTMLTableSectionElement>('#rows')!;
const status = document.querySelector<HTMLParagraphElement>('#status')!;
const total = document.querySelector<HTMLSpanElement>('#total')!;
const connection = document.querySelector<HTMLSpanElement>('#connection')!;
const refresh = document.querySelector<HTMLButtonElement>('#refresh')!;
let supportedDatabase: SupportedDb | undefined;
let databaseName = '';
let searchTimer: number | undefined;
let requestSerial = 0;

function setMessage(message: string, isError = false): void {
  status.textContent = message;
  status.classList.toggle('error', isError);
}

function addCell(row: HTMLTableRowElement, value: string, className?: string): void {
  const cell = row.insertCell();
  cell.textContent = value;
  if (className) cell.className = className;
}

function showEmpty(message: string): void {
  rows.replaceChildren();
  const row = rows.insertRow();
  const cell = row.insertCell();
  cell.colSpan = 5;
  cell.className = 'empty';
  cell.textContent = message;
  total.textContent = '0';
}

function render(hits: ColumnHit[], hasMore: boolean): void {
  rows.replaceChildren();
  total.textContent = `${hits.length}${hasMore ? '+' : ''}`;
  if (!hits.length) {
    showEmpty('Nenhuma coluna encontrada para este termo.');
    return;
  }

  for (const hit of hits) {
    const row = rows.insertRow();
    addCell(row, hit.schemaName);
    addCell(row, hit.tableName);
    addCell(row, hit.columnName, 'column-name');
    addCell(row, hit.columnType, 'datatype');
    const action = row.insertCell();
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'open-button';
    button.textContent = 'Estrutura ↗';
    button.title = `Abrir estrutura de ${hit.tableName}`;
    button.addEventListener('click', async () => {
      try {
        await openTab('tableStructure', buildStructureTabOptions(
          supportedDatabase!, hit.tableName, hit.schemaName, databaseName,
        ));
      } catch (error) {
        setMessage(`Não foi possível abrir a tabela: ${String(error)}`, true);
      }
    });
    action.append(button);
  }
}

async function search(): Promise<void> {
  const currentSerial = ++requestSerial;
  const term = input.value.trim();
  if (!term) {
    showEmpty('Digite o nome de uma coluna para começar.');
    setMessage('Digite parte do nome de uma coluna para pesquisar.');
    return;
  }
  if (!supportedDatabase) {
    setMessage('Esta conexão não é compatível. Use PostgreSQL, MySQL ou MariaDB.', true);
    return;
  }

  setMessage('Pesquisando metadados do banco...');
  refresh.disabled = true;
  try {
    const response = await runQuery(buildSearchQuery(supportedDatabase, term));
    if (currentSerial !== requestSerial) return;
    if (response.error) throw new Error(String(response.error));
    const resultRows = response.results.flatMap((result) => result.rows || []);
    const hits: ColumnHit[] = resultRows.slice(0, MAX_RESULTS).map((row) => ({
      schemaName: String(row.schemaName ?? ''),
      tableName: String(row.tableName ?? ''),
      columnName: String(row.columnName ?? ''),
      columnType: String(row.columnType ?? ''),
    }));
    const hasMore = resultRows.length > MAX_RESULTS;
    render(hits, hasMore);
    setMessage(hasMore
      ? `Mais de ${MAX_RESULTS} correspondências. Refine a pesquisa.`
      : `${hits.length} coluna(s) encontrada(s). Clique em Estrutura para abrir a tabela.`);
  } catch (error) {
    if (currentSerial !== requestSerial) return;
    showEmpty('Falha na consulta de metadados.');
    setMessage(`Erro: ${error instanceof Error ? error.message : String(error)}`, true);
  } finally {
    if (currentSerial === requestSerial) refresh.disabled = false;
  }
}

function queueSearch(): void {
  window.clearTimeout(searchTimer);
  ++requestSerial;
  searchTimer = window.setTimeout(() => void search(), 250);
}

input.addEventListener('input', queueSearch);
refresh.addEventListener('click', () => {
  window.clearTimeout(searchTimer);
  void search();
});

async function start(): Promise<void> {
  try {
    const info = await getConnectionInfo();
    connection.textContent = `${info.connectionName} · ${info.databaseName} · ${info.databaseType}`;
    databaseName = info.databaseName;
    if (isSupportedDb(info.databaseType)) {
      supportedDatabase = info.databaseType;
      setMessage('Digite parte do nome de uma coluna para pesquisar.');
    } else {
      input.disabled = true;
      refresh.disabled = true;
      setMessage(`Conexão ${info.databaseType} ainda não suportada. Use PostgreSQL, MySQL ou MariaDB.`, true);
    }
    await setTabTitle('Column Finder');
    if (supportedDatabase && input.value.trim()) queueSearch();
  } catch (error) {
    connection.textContent = 'Conexão indisponível';
    input.disabled = true;
    refresh.disabled = true;
    setMessage(`Não foi possível acessar a conexão: ${String(error)}`, true);
  }
}

void start();
