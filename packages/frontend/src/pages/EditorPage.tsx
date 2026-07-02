import { useEffect, useState, useCallback, useMemo } from 'react'
import { AllCommunityModule, ModuleRegistry, type ColDef, type RowClickedEvent } from 'ag-grid-community'
import { AgGridReact } from 'ag-grid-react'
import AppNav from '../components/layout/AppNav'
import PersonForm from '../components/editor/PersonForm'
import FamilyPanel from '../components/editor/FamilyPanel'
import { useAuth } from '../contexts/AuthContext'
import type { PersonFull } from '@giapha/shared/types'

ModuleRegistry.registerModules([AllCommunityModule])

type Tab = 'persons' | 'families'

export default function EditorPage() {
  const { token } = useAuth()
  const [tab, setTab]           = useState<Tab>('persons')
  const [persons, setPersons]   = useState<PersonFull[]>([])
  const [selected, setSelected] = useState<PersonFull | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  )

  async function loadPersons() {
    const res = await fetch('/api/persons', { headers: authHeaders })
    const data = (await res.json()) as PersonFull[]
    setPersons(data)
  }

  useEffect(() => { loadPersons() }, [])

  const colDefs = useMemo<ColDef<PersonFull>[]>(() => [
    { field: 'name', headerName: 'Tên', flex: 2, sortable: true, filter: true },
    { field: 'gender', headerName: 'GT', width: 80, valueFormatter: p => ({ male: 'Nam', female: 'Nữ', other: 'Khác' })[p.value as string] ?? '—' },
    { field: 'birthYear', headerName: 'Sinh', width: 80 },
    { field: 'isAlive', headerName: 'Còn sống', width: 100, valueFormatter: p => p.value ? 'Có' : 'Không' },
    { field: 'phone', headerName: 'ĐT', flex: 1 },
    { field: 'address', headerName: 'Địa chỉ', flex: 2 },
  ], [])

  const handleRowClick = useCallback((e: RowClickedEvent<PersonFull>) => {
    if (!e.data) return
    setSelected(e.data)
    setFormMode('edit')
    setShowForm(true)
  }, [])

  async function handleDelete() {
    if (!selected) return
    if (!confirm(`Xóa ${selected.name}?`)) return
    await fetch(`/api/editor/persons/${selected.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    })
    setPersons(ps => ps.filter(p => p.id !== selected.id))
    setSelected(null)
    setShowForm(false)
  }

  function handleSaved(saved: PersonFull) {
    setPersons(ps => {
      const idx = ps.findIndex(p => p.id === saved.id)
      return idx >= 0 ? ps.map((p, i) => i === idx ? saved : p) : [...ps, saved]
    })
    setShowForm(false)
    setSelected(saved)
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-50">
      <AppNav />
      <div className="border-b border-stone-200 bg-white px-4 flex items-center gap-1">
        {(['persons', 'families'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${tab === t ? 'border-amber-600 text-amber-700' : 'border-transparent text-stone-500 hover:text-stone-800'}`}
          >
            {t === 'persons' ? 'Thành viên' : 'Gia đình'}
          </button>
        ))}
      </div>

      <div className="flex-1 flex overflow-hidden">
        {tab === 'persons' ? (
          <>
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="px-4 py-3 flex gap-2 bg-white border-b border-stone-100">
                <button onClick={() => { setFormMode('create'); setSelected(null); setShowForm(true) }}
                  className="text-sm bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors">
                  + Thêm người
                </button>
                {selected && (
                  <button onClick={handleDelete}
                    className="text-sm border border-red-300 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors">
                    Xóa {selected.name}
                  </button>
                )}
              </div>
              <div className="flex-1 overflow-hidden p-4">
                <div style={{ height: '100%', width: '100%' }}>
                  <AgGridReact<PersonFull>
                    rowData={persons}
                    columnDefs={colDefs}
                    onRowClicked={handleRowClick}
                    rowSelection={{ mode: 'singleRow' }}
                  />
                </div>
              </div>
            </div>

            {showForm && (
              <div className="w-96 border-l border-stone-200 bg-white overflow-y-auto p-5 shrink-0">
                <h2 className="font-semibold text-stone-800 mb-4">
                  {formMode === 'create' ? 'Thêm thành viên mới' : `Chỉnh sửa: ${selected?.name}`}
                </h2>
                <PersonForm
                  person={formMode === 'edit' ? selected : null}
                  onSaved={handleSaved}
                  onCancel={() => setShowForm(false)}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full">
            <FamilyPanel persons={persons} />
          </div>
        )}
      </div>
    </div>
  )
}
