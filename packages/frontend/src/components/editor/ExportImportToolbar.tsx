import { useRef, useState } from 'react'
import { downloadCsv, uploadCsvZip } from '../../utils/csv-client'

type Props = { token: string; onImportSuccess?: () => void }

export default function ExportImportToolbar({ token, onImportSuccess }: Props) {
  const [exporting, setExporting] = useState(false)
  const [importing, setImporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [importResult, setImportResult] = useState<{ persons: number; families: number } | null>(null)
  const [importErrors, setImportErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleExport() {
    setExporting(true)
    setExportError(null)
    try {
      await downloadCsv(token)
    } catch {
      setExportError('Export thất bại. Vui lòng thử lại.')
    } finally {
      setExporting(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportResult(null)
    setImportErrors([])
    try {
      const result = await uploadCsvZip(file, token)
      setImportResult(result.imported)
      onImportSuccess?.()
    } catch (err: unknown) {
      const importErr = err as { errors?: string[] }
      setImportErrors(importErr.errors ?? ['Import thất bại'])
    } finally {
      setImporting(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <button
        aria-label="Export CSV"
        onClick={handleExport}
        disabled={exporting}
        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
      >
        {exporting ? 'Đang export...' : 'Export CSV'}
      </button>
      {exportError && <span className="text-sm text-red-600">{exportError}</span>}

      <button
        aria-label="Import CSV"
        onClick={() => fileInputRef.current?.click()}
        disabled={importing}
        className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
      >
        {importing ? 'Đang import...' : 'Import CSV'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".zip"
        className="hidden"
        onChange={handleFileChange}
      />

      {importResult && (
        <span className="text-sm text-green-700">
          ✓ Import thành công: {importResult.persons} thành viên, {importResult.families} gia đình
        </span>
      )}
      {importErrors.length > 0 && (
        <div className="text-sm text-red-600">
          {importErrors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}
    </div>
  )
}
