export async function uploadCsvZip(
  file: File
): Promise<{ imported: { persons: number; families: number } }> {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch('/api/editor/import/csv', { method: 'POST', body: formData })
  if (!res.ok) {
    const body = await res.json().catch(() => ({ errors: ['Lỗi không xác định'] }))
    throw Object.assign(new Error('Import failed'), { errors: (body as { errors?: string[] }).errors ?? [] })
  }
  return res.json()
}

export async function downloadCsv(): Promise<void> {
  const res = await fetch('/api/editor/export/csv')
  if (!res.ok) throw new Error(`Export failed: ${res.status}`)
  const blob = await res.blob()
  const today = new Date().toISOString().slice(0, 10)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `gia-pha-export-${today}.zip`
  a.click()
  URL.revokeObjectURL(url)
}
