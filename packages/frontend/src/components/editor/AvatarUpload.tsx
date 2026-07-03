import { useRef, useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'

type Props = {
  /** Full upload URL. Defaults to the editor endpoint when personId is provided. */
  uploadUrl?: string
  /** Legacy convenience: used to build the default editor URL */
  personId?: string
  currentUrl: string | null
  onUploaded: (url: string) => void
}

export default function AvatarUpload({ uploadUrl, personId, currentUrl, onUploaded }: Props) {
  const { token } = useAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resolvedUrl = uploadUrl ?? (personId ? `/api/editor/persons/${personId}/avatar` : null)

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !resolvedUrl) return
    if (file.size > 2 * 1024 * 1024) { setError('Tệp tối đa 2 MB'); return }
    setError(null)
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(resolvedUrl, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) throw new Error('Upload failed')
      const data = (await res.json()) as { avatarUrl: string }
      onUploaded(data.avatarUrl)
    } catch {
      setError('Tải ảnh thất bại')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-20 h-20 rounded-full bg-stone-100 border-2 border-dashed border-stone-300 flex items-center justify-center overflow-hidden cursor-pointer hover:bg-stone-50"
        onClick={() => inputRef.current?.click()}
      >
        {currentUrl ? (
          <img src={currentUrl} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <svg className="w-8 h-8 text-stone-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
          </svg>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleChange} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
        className="text-xs text-amber-700 hover:underline disabled:opacity-50">
        {uploading ? 'Đang tải…' : 'Đổi ảnh'}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
