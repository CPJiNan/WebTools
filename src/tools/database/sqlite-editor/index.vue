<script lang="ts" setup>
import {computed, nextTick, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import type {Database, QueryExecResult, SqlJsStatic} from 'sql.js'
import {useToast} from '@/stores/toast'

const toast = useToast()

type CellValue = string | number | null | Uint8Array
type Mode = 'browse' | 'sql'

interface ColumnInfo {
  name: string
  type: string
  notnull: boolean
  pk: boolean
}

interface GridRow {
  id: string
  rowid: number | null
  values: Record<string, string>
  originals: Record<string, string>
  isNew: boolean
  deleted: boolean
  dirty: boolean
}

interface SqlResultTable {
  columns: string[]
  values: CellValue[][]
}

const PAGE_SIZE = 100

const SQL = ref<SqlJsStatic | null>(null)
const db = ref<Database | null>(null)
const ready = ref(false)
const loading = ref(true)
const loadError = ref<string | null>(null)

const fileName = ref('')
const mode = ref<Mode>('browse')
const tables = ref<string[]>([])
const selectedTable = ref<string | null>(null)

const columns = ref<ColumnInfo[]>([])
const rows = ref<GridRow[]>([])
const totalRows = ref(0)
const page = ref(1)
const hasRowid = ref(true)

const sqlText = ref("SELECT * FROM 'table' LIMIT 0,50")
const sqlRunning = ref(false)
const sqlMessage = ref<string | null>(null)
const sqlError = ref<string | null>(null)
const sqlResults = ref<SqlResultTable[]>([])
const sqlElapsed = ref<number | null>(null)

const editingCell = ref<{ rowId: string; col: string } | null>(null)
const editDraft = ref('')
const selectedRowIds = ref<Set<string>>(new Set())
const saving = ref(false)

const fileInputRef = ref<HTMLInputElement | null>(null)
const editInputRef = ref<HTMLInputElement | null>(null)
const fileNameInputRef = ref<HTMLInputElement | null>(null)
const tableNameInputRef = ref<HTMLInputElement | null>(null)

function setEditInputRef(el: unknown) {
  editInputRef.value = el instanceof HTMLInputElement ? el : null
}

function setTableNameInputRef(el: unknown) {
  tableNameInputRef.value = el instanceof HTMLInputElement ? el : null
}

const editingFileName = ref(false)
const fileNameDraft = ref('')
const renamingTable = ref<string | null>(null)
const tableNameDraft = ref('')

let rowSeq = 0

const dirtyCount = computed(
  () => rows.value.filter((r) => r.dirty || r.deleted || r.isNew).length,
)

const pageCount = computed(() => Math.max(1, Math.ceil(totalRows.value / PAGE_SIZE)))

const visibleRows = computed(() => rows.value.filter((r) => !r.deleted))

const canEditTable = computed(() => Boolean(selectedTable.value && hasRowid.value))

onMounted(async () => {
  try {
    SQL.value = await loadSqlEngine()
    ready.value = true
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : 'SQLite 引擎加载失败'
  } finally {
    loading.value = false
  }
})

type InitSqlJs = (config?: { locateFile?: (file: string, prefix?: string) => string }) => Promise<SqlJsStatic>

async function loadSqlEngine(): Promise<SqlJsStatic> {
  const [jsUrl, wasmUrl] = await Promise.all([
    import('sql.js/dist/sql-wasm-browser.js?url').then((m) => m.default as string),
    import('sql.js/dist/sql-wasm-browser.wasm?url').then((m) => m.default as string),
  ])

  const source = await fetch(jsUrl).then((res) => {
    if (!res.ok) throw new Error(`加载 sql.js 失败: ${res.status}`)
    return res.text()
  })

  const module = {exports: {} as unknown}
  const runner = new Function(
    'module',
    'exports',
    `${source}\n;return module.exports;`,
  ) as (module: { exports: unknown }, exports: unknown) => unknown

  const exported = runner(module, module.exports)
  const initSqlJs = resolveInitSqlJs(exported) ?? resolveInitSqlJs(module.exports)

  if (!initSqlJs) {
    throw new Error('initSqlJs is not a function')
  }

  return initSqlJs({locateFile: () => wasmUrl})
}

function resolveInitSqlJs(value: unknown): InitSqlJs | null {
  if (typeof value === 'function') return value as InitSqlJs
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if (typeof record.default === 'function') return record.default as InitSqlJs
    if (typeof record.Module === 'function') return record.Module as InitSqlJs
  }
  return null
}

onBeforeUnmount(() => {
  closeDatabase()
})

watch(selectedTable, (table) => {
  selectedRowIds.value = new Set()
  editingCell.value = null
  page.value = 1
  if (table) {
    loadTableData(table)
  } else {
    columns.value = []
    rows.value = []
    totalRows.value = 0
  }
})

watch(page, () => {
  if (selectedTable.value) {
    loadTableData(selectedTable.value, false)
  }
})

function closeDatabase() {
  if (db.value) {
    db.value.close()
    db.value = null
  }
}

function createEmptyDatabase() {
  if (!SQL.value) return
  closeDatabase()
  db.value = new SQL.value.Database()
  fileName.value = 'untitled.db'
  editingFileName.value = false
  refreshTables()
  selectedTable.value = null
  sqlResults.value = []
  sqlMessage.value = null
  sqlError.value = null
  toast.success('已新建数据库')
}

function startEditFileName() {
  if (!fileName.value) return
  editingFileName.value = true
  fileNameDraft.value = fileName.value
  nextTick(() => {
    fileNameInputRef.value?.focus()
    fileNameInputRef.value?.select()
  })
}

function normalizeFileName(raw: string): string {
  let name = raw.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
  if (!name) return ''
  if (!/\.(db|sqlite|sqlite3)$/i.test(name)) {
    name = `${name}.db`
  }
  return name
}

function commitFileName() {
  if (!editingFileName.value) return
  const next = normalizeFileName(fileNameDraft.value)
  if (!next) {
    toast.info('文件名不能为空')
    nextTick(() => fileNameInputRef.value?.focus())
    return
  }
  fileName.value = next
  editingFileName.value = false
}

function cancelFileNameEdit() {
  editingFileName.value = false
  fileNameDraft.value = fileName.value
}

function onFileNameKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitFileName()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelFileNameEdit()
  }
}

function quoteIdent(name: string) {
  return `"${name.replace(/"/g, '""')}"`
}

function quoteString(value: string) {
  return `'${value.replace(/'/g, "''")}'`
}

function normalizeTableName(raw: string): string {
  return raw.trim()
}

function startRenameTable(table: string) {
  if (!db.value) return
  renamingTable.value = table
  tableNameDraft.value = table
  nextTick(() => {
    const input = tableNameInputRef.value
    if (!input) return
    input.focus()
    input.select()
  })
}

function cancelRenameTable() {
  renamingTable.value = null
  tableNameDraft.value = ''
}

function commitRenameTable() {
  if (!renamingTable.value || !db.value) return

  const oldName = renamingTable.value
  const newName = normalizeTableName(tableNameDraft.value)

  if (!newName) {
    toast.info('表名不能为空')
    nextTick(() => tableNameInputRef.value?.focus())
    return
  }

  if (newName === oldName) {
    cancelRenameTable()
    return
  }

  if (newName.toLowerCase().startsWith('sqlite_')) {
    toast.error('表名不能使用 sqlite_ 前缀')
    nextTick(() => tableNameInputRef.value?.focus())
    return
  }

  if (tables.value.some((t) => t.toLowerCase() === newName.toLowerCase() && t !== oldName)) {
    toast.error('表名已存在')
    nextTick(() => tableNameInputRef.value?.focus())
    return
  }

  if (selectedTable.value === oldName && dirtyCount.value > 0) {
    const ok = window.confirm('当前有未保存的修改，是否继续？')
    if (!ok) {
      cancelRenameTable()
      return
    }
  }

  try {
    const typeResult = db.value.exec(
      `SELECT type
       FROM sqlite_master
       WHERE name = ${quoteString(oldName)}
         AND type IN ('table', 'view') LIMIT 1`,
    )
    const objectType = String(typeResult[0]?.values[0]?.[0] ?? '')
    if (objectType !== 'table') {
      cancelRenameTable()
      return
    }

    db.value.run(`ALTER TABLE ${quoteIdent(oldName)} RENAME TO ${quoteIdent(newName)}`)

    renamingTable.value = null
    tableNameDraft.value = ''
    if (selectedTable.value === oldName) {
      selectedTable.value = newName
    }
    refreshTables()
    toast.success(`已将表重命名为 ${newName}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '重命名失败')
  }
}

function onTableNameKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitRenameTable()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelRenameTable()
  }
}

function cellToDisplay(value: CellValue): string {
  if (value === null || value === undefined) return ''
  if (value instanceof Uint8Array) {
    return value.length ? `<BLOB ${value.length}B>` : '<BLOB>'
  }
  return String(value)
}

function isBlobDisplay(value: string) {
  return value.startsWith('<BLOB')
}

function refreshTables() {
  if (!db.value) {
    tables.value = []
    return
  }
  try {
    const result = db.value.exec(
      `SELECT name
       FROM sqlite_master
       WHERE type IN ('table', 'view')
         AND name NOT LIKE 'sqlite_%'
       ORDER BY type = 'view', name`,
    )
    tables.value = result[0]?.values.map((row) => String(row[0])) ?? []
    if (selectedTable.value && !tables.value.includes(selectedTable.value)) {
      selectedTable.value = tables.value[0] ?? null
    }
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '读取表列表失败')
    tables.value = []
  }
}

function loadTableSchema(table: string): ColumnInfo[] {
  if (!db.value) return []
  const result = db.value.exec(`PRAGMA table_info(${quoteIdent(table)})`)
  if (!result[0]) return []
  return result[0].values.map((row) => ({
    name: String(row[1]),
    type: String(row[2] || ''),
    notnull: Number(row[3]) === 1,
    pk: Number(row[5]) > 0,
  }))
}

function tableSupportsRowid(table: string): boolean {
  if (!db.value) return false
  try {
    db.value.exec(`SELECT rowid
                   FROM ${quoteIdent(table)} LIMIT 0`)
    return true
  } catch {
    return false
  }
}

function loadTableData(table: string, resetPage = true) {
  if (!db.value) return
  if (resetPage) page.value = 1

  try {
    columns.value = loadTableSchema(table)
    hasRowid.value = tableSupportsRowid(table)

    const countResult = db.value.exec(`SELECT COUNT(*)
                                       FROM ${quoteIdent(table)}`)
    totalRows.value = Number(countResult[0]?.values[0]?.[0] ?? 0)

    const offset = (page.value - 1) * PAGE_SIZE
    const colList = columns.value.map((c) => quoteIdent(c.name)).join(', ')
    const selectCols = hasRowid.value
      ? `rowid AS __rowid__, ${colList || 'NULL'}`
      : colList || 'NULL'

    const result = db.value.exec(
      `SELECT ${selectCols}
       FROM ${quoteIdent(table)} LIMIT ${PAGE_SIZE}
       OFFSET ${offset}`,
    )

    const data = result[0]
    if (!data) {
      rows.value = []
      return
    }

    const names = data.columns
    rows.value = data.values.map((raw) => {
      const values: Record<string, string> = {}
      let rowid: number | null = null

      names.forEach((name, index) => {
        if (name === '__rowid__') {
          rowid = Number(raw[index])
          return
        }
        values[name] = cellToDisplay(raw[index] as CellValue)
      })

      return {
        id: `r-${++rowSeq}`,
        rowid,
        values,
        originals: {...values},
        isNew: false,
        deleted: false,
        dirty: false,
      } satisfies GridRow
    })
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '加载表数据失败')
    columns.value = []
    rows.value = []
    totalRows.value = 0
  }
}

function selectTable(name: string) {
  if (dirtyCount.value > 0) {
    const ok = window.confirm('当前有未保存的修改，是否继续？')
    if (!ok) return
  }
  selectedTable.value = name
  mode.value = 'browse'
}

function newDatabase() {
  if (dirtyCount.value > 0) {
    const ok = window.confirm('当前有未保存的修改，是否继续？')
    if (!ok) return
  }
  createEmptyDatabase()
}

function triggerImport() {
  fileInputRef.value?.click()
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || !SQL.value) return

  if (dirtyCount.value > 0) {
    const ok = window.confirm('当前有未保存的修改，是否继续？')
    if (!ok) return
  }

  try {
    const buffer = new Uint8Array(await file.arrayBuffer())
    closeDatabase()
    db.value = new SQL.value.Database(buffer)
    fileName.value = file.name || 'imported.db'
    editingFileName.value = false
    refreshTables()
    selectedTable.value = tables.value[0] ?? null
    sqlResults.value = []
    sqlMessage.value = null
    sqlError.value = null
    toast.success(`已导入 ${fileName.value}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '导入失败')
  }
}

function exportDatabase() {
  if (!db.value) {
    toast.info('请新建或导入数据库')
    return
  }
  try {
    const data = db.value.export()
    const bytes = new Uint8Array(data.byteLength)
    bytes.set(data)
    const blob = new Blob([bytes], {type: 'application/x-sqlite3'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.value.endsWith('.db') ? fileName.value : `${fileName.value}.db`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`已导出 ${fileName.value}`)
  } catch (err) {
    toast.error(err instanceof Error ? err.message : '导出失败')
  }
}

function startEdit(row: GridRow, col: string) {
  if (!canEditTable.value || row.deleted) return
  if (isBlobDisplay(row.values[col] ?? '')) return
  editingCell.value = {rowId: row.id, col}
  editDraft.value = row.values[col] ?? ''
  nextTick(() => {
    const input = editInputRef.value
    if (!input) return
    input.focus()
    input.select()
  })
}

function commitEdit() {
  if (!editingCell.value) return
  const {rowId, col} = editingCell.value
  const row = rows.value.find((r) => r.id === rowId)
  if (row) {
    row.values[col] = editDraft.value
    row.dirty =
      row.isNew ||
      columns.value.some((c) => (row.values[c.name] ?? '') !== (row.originals[c.name] ?? ''))
  }
  editingCell.value = null
}

function cancelEdit() {
  editingCell.value = null
}

function onEditKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    commitEdit()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    cancelEdit()
  }
}

function toggleRowSelect(rowId: string) {
  const next = new Set(selectedRowIds.value)
  if (next.has(rowId)) next.delete(rowId)
  else next.add(rowId)
  selectedRowIds.value = next
}

function toggleSelectAll() {
  if (selectedRowIds.value.size === visibleRows.value.length) {
    selectedRowIds.value = new Set()
    return
  }
  selectedRowIds.value = new Set(visibleRows.value.map((r) => r.id))
}

function addRow() {
  if (!selectedTable.value || !canEditTable.value) return
  const values: Record<string, string> = {}
  for (const col of columns.value) {
    values[col.name] = ''
  }
  const row: GridRow = {
    id: `r-${++rowSeq}`,
    rowid: null,
    values,
    originals: {...values},
    isNew: true,
    deleted: false,
    dirty: true,
  }
  rows.value = [row, ...rows.value]
  startEdit(row, columns.value[0]?.name ?? '')
}

function deleteSelectedRows() {
  if (!canEditTable.value || selectedRowIds.value.size === 0) return
  rows.value = rows.value.map((row) => {
    if (!selectedRowIds.value.has(row.id)) return row
    if (row.isNew) {
      return {...row, deleted: true, dirty: false}
    }
    return {...row, deleted: true, dirty: true}
  })
  rows.value = rows.value.filter((r) => !(r.isNew && r.deleted))
  selectedRowIds.value = new Set()
}

function discardChanges() {
  if (!selectedTable.value || dirtyCount.value === 0) return
  const ok = window.confirm('确定丢弃所有未保存的更改？')
  if (!ok) return
  loadTableData(selectedTable.value, false)
  selectedRowIds.value = new Set()
  editingCell.value = null
}

function parseCellForSql(raw: string): string | number | null {
  if (raw === '') return null
  if (raw === 'NULL' || raw === 'null') return null
  if (/^-?\d+$/.test(raw)) return Number(raw)
  if (/^-?\d+\.\d+$/.test(raw)) return Number(raw)
  return raw
}

function saveChanges() {
  if (!db.value || !selectedTable.value || !canEditTable.value) return
  commitEdit()

  const table = selectedTable.value
  const pending = rows.value.filter((r) => r.deleted || r.dirty || r.isNew)
  if (pending.length === 0) {
    toast.info('没有要保存的更改')
    return
  }

  saving.value = true
  try {
    db.value.run('BEGIN')

    for (const row of pending) {
      if (row.deleted && row.rowid != null) {
        db.value.run(`DELETE
                      FROM ${quoteIdent(table)}
                      WHERE rowid = ?`, [row.rowid])
        continue
      }

      if (row.isNew && !row.deleted) {
        const cols = columns.value.map((c) => quoteIdent(c.name))
        const placeholders = columns.value.map(() => '?').join(', ')
        const params = columns.value.map((c) => parseCellForSql(row.values[c.name] ?? ''))
        db.value.run(
          `INSERT INTO ${quoteIdent(table)} (${cols.join(', ')})
           VALUES (${placeholders})`,
          params,
        )
        continue
      }

      if (row.dirty && row.rowid != null && !row.deleted) {
        const sets = columns.value.map((c) => `${quoteIdent(c.name)} = ?`).join(', ')
        const params = [
          ...columns.value.map((c) => parseCellForSql(row.values[c.name] ?? '')),
          row.rowid,
        ]
        db.value.run(
          `UPDATE ${quoteIdent(table)}
           SET ${sets}
           WHERE rowid = ?`,
          params,
        )
      }
    }

    db.value.run('COMMIT')
    toast.success(`已保存 ${pending.length} 处更改`)
    loadTableData(table, false)
    refreshTables()
    selectedRowIds.value = new Set()
  } catch (err) {
    try {
      db.value.run('ROLLBACK')
    } catch {
    }
    toast.error(err instanceof Error ? err.message : '保存失败')
  } finally {
    saving.value = false
  }
}

function splitStatements(sql: string): string[] {
  const statements: string[] = []
  let current = ''
  let inSingle = false
  let inDouble = false
  let inLineComment = false
  let inBlockComment = false

  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i]
    const next = sql[i + 1]

    if (inLineComment) {
      current += ch
      if (ch === '\n') inLineComment = false
      continue
    }

    if (inBlockComment) {
      current += ch
      if (ch === '*' && next === '/') {
        current += '/'
        i++
        inBlockComment = false
      }
      continue
    }

    if (!inSingle && !inDouble) {
      if (ch === '-' && next === '-') {
        current += ch
        inLineComment = true
        continue
      }
      if (ch === '/' && next === '*') {
        current += ch
        inBlockComment = true
        continue
      }
    }

    if (ch === "'" && !inDouble) {
      inSingle = !inSingle
      current += ch
      continue
    }

    if (ch === '"' && !inSingle) {
      inDouble = !inDouble
      current += ch
      continue
    }

    if (ch === ';' && !inSingle && !inDouble) {
      const trimmed = current.trim()
      if (trimmed) statements.push(trimmed)
      current = ''
      continue
    }

    current += ch
  }

  const tail = current.trim()
  if (tail) statements.push(tail)
  return statements
}

function runSql() {
  if (!db.value) {
    toast.info('请新建或导入数据库')
    return
  }
  commitEdit()

  const statements = splitStatements(sqlText.value)
  if (statements.length === 0) {
    toast.info('请输入 SQL 语句')
    return
  }

  sqlRunning.value = true
  sqlError.value = null
  sqlMessage.value = null
  sqlResults.value = []
  const started = performance.now()

  try {
    const collected: SqlResultTable[] = []
    let changes = 0

    for (const statement of statements) {
      const result: QueryExecResult[] = db.value.exec(statement)
      for (const part of result) {
        collected.push({
          columns: part.columns,
          values: part.values as CellValue[][],
        })
      }
      changes += db.value.getRowsModified()
    }

    sqlElapsed.value = Math.round(performance.now() - started)
    sqlResults.value = collected

    if (collected.length === 0) {
      sqlMessage.value = `执行成功，影响 ${changes} 行。（${sqlElapsed.value} ms）`
    } else {
      const rowCount = collected.reduce((sum, t) => sum + t.values.length, 0)
      sqlMessage.value = `返回 ${collected.length} 个结果集，共 ${rowCount} 行。（${sqlElapsed.value} ms）`
    }

    refreshTables()
    if (selectedTable.value) {
      loadTableData(selectedTable.value, false)
    }
  } catch (err) {
    sqlError.value = err instanceof Error ? err.message : 'SQL 执行失败'
    sqlElapsed.value = Math.round(performance.now() - started)
  } finally {
    sqlRunning.value = false
  }
}

function onSqlKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
    event.preventDefault()
    runSql()
  }
}

function formatSqlCell(value: CellValue): string {
  return cellToDisplay(value) || 'NULL'
}

function isNullishDisplay(value: CellValue): boolean {
  return value === null || value === undefined || cellToDisplay(value) === ''
}

function goPrevPage() {
  if (page.value > 1) page.value -= 1
}

function goNextPage() {
  if (page.value < pageCount.value) page.value += 1
}

function isEditing(rowId: string, col: string) {
  return editingCell.value?.rowId === rowId && editingCell.value?.col === col
}
</script>

<template>
  <div class="sqlite">
    <div v-if="loading" class="sqlite__state">正在加载 SQLite 引擎...</div>
    <div v-else-if="loadError" class="sqlite__state sqlite__state--error">{{ loadError }}</div>

    <template v-else-if="ready">
      <div class="sqlite__toolbar">
        <div class="sqlite__toolbar-left">
          <button class="sqlite__btn pressable" type="button" @click="newDatabase">新建</button>
          <button class="sqlite__btn pressable" type="button" @click="triggerImport">导入</button>
          <button
            :disabled="!db"
            class="sqlite__btn pressable"
            type="button"
            @click="exportDatabase"
          >
            导出
          </button>
          <button
            v-if="fileName && !editingFileName"
            :title="fileName"
            class="sqlite__btn sqlite__filename pressable"
            type="button"
            @click="startEditFileName"
          >
            {{ fileName }}
          </button>
          <input
            v-else-if="fileName && editingFileName"
            ref="fileNameInputRef"
            v-model="fileNameDraft"
            class="sqlite__btn sqlite__filename sqlite__filename-input"
            spellcheck="false"
            type="text"
            @blur="commitFileName"
            @keydown="onFileNameKeydown"
          />
          <input
            ref="fileInputRef"
            accept=".db,.sqlite,.sqlite3,application/x-sqlite3,application/octet-stream"
            class="sqlite__file-input"
            type="file"
            @change="onImportFile"
          />
        </div>
        <div class="sqlite__tabs">
          <button
            :class="['sqlite__tab', mode === 'browse' && 'sqlite__tab--active']"
            type="button"
            @click="mode = 'browse'"
          >
            表格
          </button>
          <button
            :class="['sqlite__tab', mode === 'sql' && 'sqlite__tab--active']"
            type="button"
            @click="mode = 'sql'"
          >
            SQL 语句
          </button>
        </div>
      </div>

      <div class="sqlite__body">
        <aside class="sqlite__sidebar">
          <div class="sqlite__sidebar-head">
            <span>表 / 视图</span>
            <span class="sqlite__badge">{{ tables.length }}</span>
          </div>
          <div v-if="!db" class="sqlite__sidebar-empty">
            请新建或导入数据库。
          </div>
          <div v-else-if="tables.length === 0" class="sqlite__sidebar-empty">
            暂无表。
          </div>
          <template v-for="table in tables" :key="table">
            <input
              v-if="renamingTable === table"
              :ref="setTableNameInputRef"
              v-model="tableNameDraft"
              :class="[
                'sqlite__table-item',
                'sqlite__table-item-input',
                selectedTable === table && 'sqlite__table-item--active',
              ]"
              spellcheck="false"
              type="text"
              @blur="commitRenameTable"
              @keydown="onTableNameKeydown"
              @click.stop
            />
            <button
              v-else
              :class="['sqlite__table-item', selectedTable === table && 'sqlite__table-item--active']"
              :title="`${table}（双击重命名）`"
              type="button"
              @click="selectTable(table)"
              @dblclick.stop="startRenameTable(table)"
            >
              {{ table }}
            </button>
          </template>
        </aside>

        <section class="sqlite__main">
          <div v-if="mode === 'browse'" class="sqlite__browse">
            <div v-if="!db" class="sqlite__placeholder">
              请新建或导入数据库。
            </div>

            <template v-else>
              <div class="sqlite__browse-bar">
                <div class="sqlite__browse-title">
                  <strong>{{ selectedTable }}</strong>
                  <span class="sqlite__muted">共 {{ totalRows }} 行</span>
                  <span v-if="!hasRowid" class="sqlite__warn">该表不支持 rowid，只读浏览</span>
                </div>
                <div class="sqlite__browse-actions">
                  <button
                    :disabled="!canEditTable"
                    class="sqlite__btn pressable"
                    type="button"
                    @click="addRow"
                  >
                    新增行
                  </button>
                  <button
                    :disabled="!canEditTable || selectedRowIds.size === 0"
                    class="sqlite__btn pressable"
                    type="button"
                    @click="deleteSelectedRows"
                  >
                    删除选中
                  </button>
                  <button
                    :disabled="dirtyCount === 0"
                    class="sqlite__btn pressable"
                    type="button"
                    @click="discardChanges"
                  >
                    丢弃更改
                  </button>
                  <button
                    :disabled="!canEditTable || dirtyCount === 0 || saving"
                    class="sqlite__btn sqlite__btn--primary pressable"
                    type="button"
                    @click="saveChanges"
                  >
                    {{ saving ? '保存中...' : `保存更改${dirtyCount ? ` (${dirtyCount})` : ''}` }}
                  </button>
                </div>
              </div>

              <div class="sqlite__table-wrap">
                <table class="sqlite__table">
                  <thead>
                  <tr>
                    <th class="sqlite__th-check">
                      <input
                        :checked="visibleRows.length > 0 && selectedRowIds.size === visibleRows.length"
                        :disabled="!canEditTable || visibleRows.length === 0"
                        type="checkbox"
                        @change="toggleSelectAll"
                      />
                    </th>
                    <th
                      v-for="col in columns"
                      :key="col.name"
                      :title="col.type || 'ANY'"
                    >
                      {{ col.name }}
                      <span v-if="col.pk" class="sqlite__pk">PK</span>
                    </th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-if="visibleRows.length === 0">
                    <td :colspan="columns.length + 1" class="sqlite__empty-cell">
                      表为空。
                    </td>
                  </tr>
                  <tr
                    v-for="row in visibleRows"
                    :key="row.id"
                    :class="{
                        'sqlite__tr--dirty': row.dirty || row.isNew,
                        'sqlite__tr--new': row.isNew,
                      }"
                  >
                    <td class="sqlite__td-check">
                      <input
                        :checked="selectedRowIds.has(row.id)"
                        :disabled="!canEditTable"
                        type="checkbox"
                        @change="toggleRowSelect(row.id)"
                      />
                    </td>
                    <td
                      v-for="col in columns"
                      :key="col.name"
                      :class="[
                          'sqlite__td',
                          canEditTable && 'sqlite__td--editable',
                          (row.values[col.name] ?? '') === '' && 'sqlite__td--null',
                        ]"
                      @dblclick="startEdit(row, col.name)"
                    >
                      <input
                        v-if="isEditing(row.id, col.name)"
                        :ref="setEditInputRef"
                        v-model="editDraft"
                        class="sqlite__cell-input"
                        type="text"
                        @blur="commitEdit"
                        @keydown="onEditKeydown"
                      />
                      <span v-else class="sqlite__cell-text">
                          {{ row.values[col.name] === '' ? 'NULL' : row.values[col.name] }}
                        </span>
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>

              <div class="sqlite__pager">
                <button
                  :disabled="page <= 1"
                  class="sqlite__btn pressable"
                  type="button"
                  @click="goPrevPage"
                >
                  上一页
                </button>
                <span class="sqlite__muted">第 {{ page }} / {{ pageCount }} 页</span>
                <button
                  :disabled="page >= pageCount"
                  class="sqlite__btn pressable"
                  type="button"
                  @click="goNextPage"
                >
                  下一页
                </button>
              </div>
            </template>
          </div>

          <div v-else class="sqlite__sql">
            <div class="sqlite__sql-editor">
              <textarea
                v-model="sqlText"
                class="sqlite__textarea"
                placeholder="输入 SQL 语句，Ctrl/⌘ + Enter 执行"
                spellcheck="false"
                @keydown="onSqlKeydown"
              />
              <div class="sqlite__sql-actions">
                <button
                  :disabled="sqlRunning"
                  class="sqlite__btn sqlite__btn--primary pressable"
                  type="button"
                  @click="runSql"
                >
                  {{ sqlRunning ? '执行中...' : '执行 SQL' }}
                </button>
              </div>
            </div>

            <div v-if="sqlError" class="sqlite__sql-error">{{ sqlError }}</div>
            <div v-else-if="sqlMessage" class="sqlite__sql-message">{{ sqlMessage }}</div>

            <div v-for="(result, index) in sqlResults" :key="index" class="sqlite__result">
              <div class="sqlite__result-head">
                结果集 {{ index + 1 }}
                <span class="sqlite__muted">{{ result.values.length }} 行 × {{ result.columns.length }} 列</span>
              </div>
              <div class="sqlite__table-wrap">
                <table class="sqlite__table">
                  <thead>
                  <tr>
                    <th v-for="col in result.columns" :key="col">{{ col }}</th>
                  </tr>
                  </thead>
                  <tbody>
                  <tr v-if="result.values.length === 0">
                    <td :colspan="Math.max(result.columns.length, 1)" class="sqlite__empty-cell">
                      无数据
                    </td>
                  </tr>
                  <tr v-for="(row, rIndex) in result.values" :key="rIndex">
                    <td
                      v-for="(cell, cIndex) in row"
                      :key="cIndex"
                      :class="['sqlite__td', isNullishDisplay(cell) && 'sqlite__td--null']"
                    >
                      <span class="sqlite__cell-text">{{ formatSqlCell(cell) }}</span>
                    </td>
                  </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.sqlite {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 560px;
}

.sqlite__state {
  padding: 48px 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.sqlite__state--error {
  color: #ef4444;
}

.sqlite__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--bg-secondary) 45%, transparent);
}

.sqlite__toolbar-left {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sqlite__filename {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sqlite__filename-input {
  max-width: 260px;
  width: 12em;
  min-width: 8em;
  outline: none;
  cursor: text;
  box-shadow: var(--ring);
  border-color: color-mix(in srgb, var(--color-primary) 45%, var(--surface-border-strong));
  background: var(--surface-solid);
}

.sqlite__tabs {
  display: inline-flex;
  margin-left: auto;
  padding: 3px;
  gap: 2px;
  border-radius: var(--radius-full);
  background: color-mix(in srgb, var(--bg-tertiary) 55%, transparent);
  border: 1px solid var(--surface-border-strong);
}

.sqlite__tab {
  padding: 6px 12px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 550;
  color: var(--text-secondary);
  transition: background-color var(--duration-fast) var(--ease-out),
  color var(--duration-fast) var(--ease-out);
}

.sqlite__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 7px 12px;
  border-radius: var(--radius-full);
  font-size: 13px;
  font-weight: 550;
  letter-spacing: -0.01em;
  color: var(--text-primary);
  background: color-mix(in srgb, var(--bg-secondary) 70%, transparent);
  border: 1px solid var(--surface-border-strong);
  transition: transform var(--duration-press) var(--ease-out),
  background-color var(--duration-hover) var(--ease-hover),
  border-color var(--duration-hover) var(--ease-hover),
  opacity var(--duration-fast) var(--ease-out);
}

.sqlite__btn:hover:not(:disabled) {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--surface-solid));
  border-color: color-mix(in srgb, var(--color-primary) 22%, var(--surface-border-strong));
}

.sqlite__btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.sqlite__btn--primary {
  color: #fff;
  background: var(--color-primary);
  border-color: color-mix(in srgb, var(--color-primary) 80%, #000);
}

.sqlite__btn--primary:hover:not(:disabled) {
  background: var(--color-primary-hover);
  border-color: var(--color-primary-hover);
}

.sqlite__file-input {
  display: none;
}

.sqlite__body {
  display: grid;
  grid-template-columns: 200px minmax(0, 1fr);
  gap: 12px;
  min-height: 480px;
}

.sqlite__sidebar {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 12px;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--bg-secondary) 40%, transparent);
  min-height: 0;
  max-height: 640px;
  overflow: auto;
}

.sqlite__sidebar-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 4px;
  font-size: 12px;
  font-weight: 650;
  color: var(--text-secondary);
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.sqlite__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 18px;
  padding: 0 6px;
  border-radius: var(--radius-full);
  font-size: 11px;
  font-weight: 650;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
}

.sqlite__sidebar-empty {
  padding: 10px 6px;
  font-size: 12px;
  line-height: 1.55;
  color: var(--text-muted);
}

.sqlite__sidebar-empty code {
  display: block;
  margin-top: 8px;
  padding: 8px;
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--bg-tertiary) 50%, transparent);
  font-size: 11px;
  word-break: break-all;
  color: var(--text-secondary);
}

.sqlite__table-item {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  transition: background-color var(--duration-fast) var(--ease-out);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sqlite__table-item:hover {
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
}

.sqlite__table-item-input {
  outline: none;
  cursor: text;
  box-shadow: var(--ring);
  border: 1px solid color-mix(in srgb, var(--color-primary) 45%, var(--surface-border-strong));
  background: var(--surface-solid);
  font: inherit;
  font-size: 13px;
  font-weight: 500;
}

.sqlite__main {
  min-width: 0;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, var(--bg-secondary) 35%, transparent);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sqlite__placeholder,
.sqlite__empty-cell {
  padding: 36px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.sqlite__browse,
.sqlite__sql {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.sqlite__browse-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.sqlite__browse-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 10px;
  font-size: 15px;
  color: var(--text-primary);
}

.sqlite__browse-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.sqlite__muted {
  font-size: 12px;
  color: var(--text-muted);
  font-weight: 500;
}

.sqlite__warn {
  font-size: 12px;
  color: #f59e0b;
  font-weight: 550;
}

.sqlite__table-wrap {
  overflow: auto;
  border: 1px solid var(--surface-border-strong);
  border-radius: var(--radius-md);
  max-height: 420px;
  background: var(--surface-solid);
}

.sqlite__table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  min-width: 100%;
}

.sqlite__table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: color-mix(in srgb, var(--bg-tertiary) 55%, var(--surface-solid));
  color: var(--text-secondary);
  font-weight: 650;
  font-size: 12px;
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid var(--surface-border-strong);
  white-space: nowrap;
}

.sqlite__th-check,
.sqlite__td-check {
  width: 40px;
  text-align: center;
  padding-left: 10px;
  padding-right: 10px;
}

.sqlite__td {
  padding: 0;
  border-bottom: 1px solid color-mix(in srgb, var(--surface-border-strong) 70%, transparent);
  color: var(--text-primary);
  vertical-align: middle;
  max-width: 280px;
}

.sqlite__cell-text {
  display: block;
  padding: 8px 12px;
  min-height: 34px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sqlite__cell-input {
  width: 100%;
  min-width: 80px;
  padding: 8px 12px;
  border: none;
  outline: 2px solid var(--color-primary);
  outline-offset: -2px;
  background: var(--surface-solid);
  color: var(--text-primary);
  font: inherit;
}

.sqlite__tr--dirty {
  background: color-mix(in srgb, #f59e0b 8%, transparent);
}

.sqlite__tr--new {
  background: color-mix(in srgb, var(--color-primary) 7%, transparent);
}

.sqlite__pk {
  display: inline-block;
  margin-left: 4px;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 700;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 12%, transparent);
  vertical-align: middle;
}

.sqlite__pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.sqlite__sql-editor {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sqlite__textarea {
  width: 100%;
  min-height: 160px;
  resize: vertical;
  padding: 12px 14px;
  border-radius: var(--radius-md);
  border: 1px solid var(--surface-border-strong);
  background: var(--surface-solid);
  color: var(--text-primary);
  font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  outline: none;
  transition: border-color var(--duration-fast) var(--ease-out),
  box-shadow var(--duration-fast) var(--ease-out);
}

.sqlite__textarea:focus {
  border-color: color-mix(in srgb, var(--color-primary) 45%, var(--surface-border-strong));
  box-shadow: var(--ring);
}

.sqlite__sql-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sqlite__sql-error {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, #ef4444 10%, transparent);
  border: 1px solid color-mix(in srgb, #ef4444 22%, transparent);
  color: #ef4444;
  font-size: 13px;
  white-space: pre-wrap;
}

.sqlite__sql-message {
  padding: 10px 12px;
  border-radius: var(--radius-md);
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 16%, transparent);
  color: var(--text-secondary);
  font-size: 13px;
}

.sqlite__result {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.sqlite__result-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
  font-weight: 650;
  color: var(--text-primary);
}

[data-theme="dark"] .sqlite__table-wrap {
  background: color-mix(in srgb, #fff 3%, var(--surface-solid));
}

[data-theme="dark"] .sqlite__table th {
  background: color-mix(in srgb, #fff 6%, var(--surface-solid));
}

[data-theme="dark"] .sqlite__btn--primary {
  color: #fff;
}

@media (max-width: 860px) {
  .sqlite__body {
    grid-template-columns: 1fr;
  }

  .sqlite__sidebar {
    max-height: 180px;
  }

  .sqlite__tabs {
    margin-left: 0;
    width: 100%;
  }

  .sqlite__tab {
    flex: 1;
    text-align: center;
  }
}
</style>
