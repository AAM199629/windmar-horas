'use client'

import { useState, useRef } from 'react'

export default function VentasUploadForm({ uploadedAt }: { uploadedAt: string | null }) {
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg]             = useState('')
  const [isError, setIsError]     = useState(false)
  const inputRef                  = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setUploading(true)
    setMsg('')
    const form = new FormData()
    form.append('file', file)
    const res  = await fetch('/api/asalariados/upload', { method: 'POST', body: form })
    const data = await res.json()
    if (res.ok) {
      setIsError(false)
      setMsg(`✓ ${data.count} registros cargados`)
      window.location.reload()
    } else {
      setIsError(true)
      setMsg(data.error ?? 'Error al procesar el archivo')
    }
    setUploading(false)
  }

  return (
    <div className="space-y-3">
      {uploadedAt && (
        <p className="text-xs text-slate-500">
          Último upload: <span className="font-semibold text-slate-700">
            {new Date(uploadedAt).toLocaleDateString('es-PR', { dateStyle: 'medium' })}
          </span>
        </p>
      )}

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#E88B0C] transition-colors"
      >
        <p className="text-sm font-medium text-slate-600">
          {uploading ? 'Procesando…' : 'Arrastra o haz clic para subir CSV de ventas'}
        </p>
        <p className="text-xs text-slate-400 mt-1">Ventas Follow Up 2025 — export de Smartsheet</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
      </div>

      {msg && (
        <p className={`text-sm font-medium ${isError ? 'text-red-600' : 'text-green-600'}`}>{msg}</p>
      )}
    </div>
  )
}
