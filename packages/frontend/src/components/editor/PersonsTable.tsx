import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AgGridReact } from 'ag-grid-react'
import type {
  ColDef,
  GetRowIdParams,
  CellValueChangedEvent,
  GridReadyEvent,
  GridApi,
} from 'ag-grid-community'
import { useAuth } from '../../contexts/AuthContext'
import ParentCellEditor from './ParentCellEditor'
import ExportImportToolbar from './ExportImportToolbar'
import type { PersonWithParents } from '@giapha/shared/types'

type RowState = PersonWithParents & {
  _isNew:     boolean
  _isDirty:   boolean
  _isDeleted: boolean
}

const GENDER_LABELS: Record<string, string> = { male: 'Nam', female: 'Nữ', other: 'Khác' }

const LUNAR_MONTH_NAMES = ['Giêng','Hai','Ba','Tư','Năm','Sáu','Bảy','Tám','Chín','Mười','Mười Một','Chạp']

function formatBirthDate(row: RowState | undefined): string {
  if (!row) return '—'
  const { birthDay, birthMonth, birthYear, birthIsLunar } = row
  if (!birthYear && !birthMonth && !birthDay) return '—'
  const parts: string[] = []
  if (birthDay) parts.push(String(birthDay))
  if (birthMonth) {
    parts.push(birthIsLunar ? (LUNAR_MONTH_NAMES[birthMonth - 1] ?? String(birthMonth)) : String(birthMonth))
  }
  if (birthYear) parts.push(String(birthYear))
  return parts.join('/') + (birthIsLunar ? ' (ÂL)' : '')
}

function formatDeathDate(row: RowState | undefined): string {
  if (!row) return '—'
  if (row.isAlive) return '—'
  const { deathDay, deathMonth, deathYear, deathIsLunar } = row
  if (!deathYear && !deathMonth && !deathDay) return '—'
  const parts: string[] = []
  if (deathDay) parts.push(String(deathDay))
  if (deathMonth) {
    parts.push(deathIsLunar ? (LUNAR_MONTH_NAMES[deathMonth - 1] ?? String(deathMonth)) : String(deathMonth))
  }
  if (deathYear) parts.push(String(deathYear))
  return parts.join('/') + (deathIsLunar ? ' (ÂL)' : '')
}

export default function PersonsTable() {
  const { token } = useAuth()
  const [rows, setRows]       = useState<RowState[]>([])
  const [saving, setSaving]   = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const gridApiRef            = useRef<GridApi<RowState> | null>(null)

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }),
    [token]
  )

  async function loadPersons() {
    const res  = await fetch('/api/editor/persons/with-parents', { headers: authHeaders })
    const data = (await res.json()) as PersonWithParents[]
    setRows(data.map(p => ({ ...p, _isNew: false, _isDirty: false, _isDeleted: false })))
  }

  useEffect(() => { loadPersons() }, [])

  // Persons visible in the grid (exclude pending-delete)
  const visibleRows = useMemo(() => rows.filter(r => !r._isDeleted), [rows])

  const pendingCount = useMemo(
    () => rows.filter(r => r._isDirty || r._isNew || r._isDeleted).length,
    [rows]
  )

  // Lookup map used by cell formatters and ParentCellEditor
  const personMap = useMemo(
    () => Object.fromEntries(rows.map(r => [r.id, r])),
    [rows]
  )

  function parentFormatter(id: string | null): string {
    if (!id) return '—'
    const p = personMap[id]
    return p ? `${p.name}${p.birthYear ? ` (${p.birthYear})` : ''}` : '—'
  }

  const colDefs = useMemo<ColDef<RowState>[]>(() => [
    {
      field: 'name',
      headerName: 'Tên',
      flex: 2,
      editable: true,
      sortable: true,
      filter: true,
    },
    {
      field: 'gender',
      headerName: 'GT',
      width: 90,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: { values: ['male', 'female', 'other', ''] },
      valueFormatter: p => GENDER_LABELS[p.value as string] ?? '—',
    },
    {
      field: 'birthYear',
      headerName: 'Ngày sinh',
      width: 150,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: p => formatBirthDate(p.data),
    },
    {
      colId: 'isAlive',
      headerName: 'Đã mất',
      width: 100,
      editable: true,
      valueGetter: (p: { data?: RowState }) => !p.data?.isAlive,
      valueSetter: (p: { data: RowState; newValue: boolean }) => { p.data.isAlive = !p.newValue; return true },
      cellEditor: 'agCheckboxCellEditor',
      cellRenderer: 'agCheckboxCellRenderer',
    },
    {
      field: 'deathYear',
      headerName: 'Ngày mất',
      width: 150,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      valueFormatter: p => formatDeathDate(p.data),
    },
    {
      field: 'fatherId',
      headerName: 'Bố',
      flex: 1,
      editable: true,
      cellEditor: ParentCellEditor,
      cellEditorPopup: true,
      // Prevent AG Grid from intercepting keys used by the dropdown
      suppressKeyboardEvent: p => p.editing && ['Enter', 'ArrowDown', 'ArrowUp', 'Escape'].includes(p.event.key),
      cellEditorParams: (p: { data: RowState }) => ({
        persons: visibleRows,
        selfId: p.data?.id ?? null,
      }),
      valueFormatter: p => parentFormatter(p.value as string | null),
    },
    {
      field: 'motherId',
      headerName: 'Mẹ',
      flex: 1,
      editable: true,
      cellEditor: ParentCellEditor,
      cellEditorPopup: true,
      suppressKeyboardEvent: p => p.editing && ['Enter', 'ArrowDown', 'ArrowUp', 'Escape'].includes(p.event.key),
      cellEditorParams: (p: { data: RowState }) => ({
        persons: visibleRows,
        selfId: p.data?.id ?? null,
      }),
      valueFormatter: p => parentFormatter(p.value as string | null),
    },
    {
      field: 'childOrder',
      headerName: 'Con thứ',
      width: 90,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: { min: 1, precision: 0 },
      valueFormatter: p => p.value != null ? String(p.value) : '—',
    },
    {
      field: 'ngoaiToc',
      headerName: 'Ngoại tộc',
      width: 100,
      editable: true,
      cellEditor: 'agCheckboxCellEditor',
      cellRenderer: 'agCheckboxCellRenderer',
    },
    {
      field: 'thuTuDoi',
      headerName: 'Đời',
      width: 80,
      editable: true,
      cellEditor: 'agNumberCellEditor',
      cellEditorParams: { min: 1, precision: 0 },
      valueFormatter: p => p.value != null ? String(p.value) : '—',
    },
    {
      field: 'spouseOrders',
      headerName: 'Vợ/chồng thứ',
      width: 120,
      editable: true,
      valueGetter: p => {
        const arr = p.data?.spouseOrders as number[] | undefined
        return arr && arr.length > 0 ? arr.join(', ') : ''
      },
      valueSetter: p => {
        const raw = String(p.newValue ?? '').trim()
        p.data.spouseOrders = raw === ''
          ? []
          : raw.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1)
        return true
      },
      valueFormatter: p => {
        const v = p.value as string
        return v && v.length > 0 ? v : '—'
      },
    },
    {
      field: 'phone',
      headerName: 'ĐT',
      flex: 1,
      editable: true,
    },
    {
      field: 'address',
      headerName: 'Địa chỉ',
      flex: 2,
      editable: true,
    },
    {
      field: 'nickname',
      headerName: 'Tên gọi',
      flex: 1,
      editable: true,
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1,
      editable: true,
    },
    {
      headerName: '',
      width: 48,
      sortable: false,
      editable: false,
      cellRenderer: (p: { data: RowState }) => (
        <button
          title="Xóa"
          onClick={() => handleDelete(p.data.id)}
          className="text-stone-400 hover:text-red-500 transition-colors text-base leading-none"
        >
          🗑
        </button>
      ),
    },
  ], [visibleRows, personMap])

  const getRowId = useCallback((p: GetRowIdParams<RowState>) => p.data.id, [])

  const getRowStyle = useCallback((p: { data?: RowState }) => {
    if (!p.data) return undefined
    if (p.data._isNew)   return { background: '#f0fdf4' } // green-50 for new
    if (p.data._isDirty) return { background: '#fffbeb' } // amber-50 for dirty
    return undefined
  }, [])

  const onCellValueChanged = useCallback((e: CellValueChangedEvent<RowState>) => {
    setRows(prev => prev.map(r =>
      r.id === e.data.id ? { ...r, ...e.data, _isDirty: true } : r
    ))
  }, [])

  function handleDelete(id: string) {
    const row = rows.find(r => r.id === id)
    if (!row) return
    const label = row.name || 'thành viên này'
    if (!confirm(`Xóa ${label}?`)) return
    setRows(prev => prev.map(r => r.id === id ? { ...r, _isDeleted: true } : r))
  }

  function handleAddRow() {
    const tempId = crypto.randomUUID()
    const newRow: RowState = {
      id:           tempId,
      name:         '',
      gender:       null,
      nickname:     null,
      avatarUrl:    null,
      bio:          null,
      address:      null,
      email:        null,
      phone:        null,
      birthYear:    null,
      birthMonth:   null,
      birthDay:     null,
      birthIsLunar: false,
      deathYear:    null,
      deathMonth:   null,
      deathDay:     null,
      deathIsLunar: false,
      isAlive:      true,
      notes:        null,
      ngoaiToc:     false,
      thuTuDoi:     null,
      fatherId:     null,
      motherId:     null,
      childOrder:   null,
      spouseOrders: [],
      _isNew:       true,
      _isDirty:     true,
      _isDeleted:   false,
    }
    setRows(prev => [...prev, newRow])
    // Navigate grid to last row after React re-render
    setTimeout(() => {
      const api = gridApiRef.current
      if (!api) return
      const lastIndex = api.getDisplayedRowCount() - 1
      api.ensureIndexVisible(lastIndex, 'bottom')
      api.startEditingCell({ rowIndex: lastIndex, colKey: 'name' })
    }, 50)
  }

  async function handleSave() {
    setSaving(true)
    setSaveError(null)

    const upsert = rows
      .filter(r => (r._isDirty || r._isNew) && !r._isDeleted)
      .map(({ _isNew, _isDirty, _isDeleted, avatarUrl, ...fields }) => ({
        ...fields,
        id: _isNew ? undefined : fields.id,
      }))

    const deleteIds = rows
      .filter(r => r._isDeleted && !r._isNew)
      .map(r => r.id)

    try {
      const res = await fetch('/api/editor/persons/batch', {
        method: 'POST',
        headers: authHeaders,
        body: JSON.stringify({ upsert, delete: deleteIds }),
      })
      const result = (await res.json()) as {
        saved: string[]
        deleted: string[]
        errors: { name: string; error: string }[]
      }

      if (result.errors.length > 0) {
        setSaveError(`Lỗi khi lưu: ${result.errors.map(e => e.name).join(', ')}`)
      }

      await loadPersons()
    } catch {
      setSaveError('Lỗi kết nối khi lưu')
    } finally {
      setSaving(false)
    }
  }

  // AG Grid 36 doesn't react to rowData/columnDefs prop changes; push updates via the API
  useEffect(() => {
    const api = gridApiRef.current
    if (!api) return
    api.setGridOption('rowData', visibleRows)
    // Force re-evaluation of valueFormatters (parent name display) after data loads
    api.refreshCells({ force: true })
  }, [visibleRows])

  const onGridReady = useCallback((e: GridReadyEvent<RowState>) => {
    gridApiRef.current = e.api
    e.api.setGridOption('rowData', visibleRows)
  }, [visibleRows])

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="px-4 py-3 flex items-center gap-3 bg-white border-b border-stone-100 shrink-0">
        <button
          onClick={handleAddRow}
          className="text-sm bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors"
        >
          + Thêm người
        </button>

        <button
          onClick={handleSave}
          disabled={saving || pendingCount === 0}
          className="text-sm bg-stone-800 hover:bg-stone-900 disabled:opacity-40 text-white px-4 py-1.5 rounded-lg transition-colors"
        >
          {saving ? 'Đang lưu…' : pendingCount > 0 ? `Cập nhật (${pendingCount})` : 'Cập nhật'}
        </button>

        {saveError && (
          <span className="text-xs text-red-600">{saveError}</span>
        )}

        <div className="ml-auto">
          <ExportImportToolbar token={token ?? ''} onImportSuccess={loadPersons} />
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-hidden p-4">
        <div style={{ height: '100%', width: '100%' }}>
          <AgGridReact<RowState>
            rowData={visibleRows}
            columnDefs={colDefs}
            getRowId={getRowId}
            getRowStyle={getRowStyle}
            onCellValueChanged={onCellValueChanged}
            onGridReady={onGridReady}
            pagination
            paginationPageSize={50}
            paginationPageSizeSelector={[25, 50, 100]}
            stopEditingWhenCellsLoseFocus
            singleClickEdit
          />
        </div>
      </div>
    </div>
  )
}
