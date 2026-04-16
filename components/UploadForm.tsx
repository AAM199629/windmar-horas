'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

export default function UploadForm() {
  const [state, setState] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setState('loading')
    const fd = new FormData()
    fd.append('file', file)

    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const json = await res.json()

    if (res.ok) {
      setState('success')
      setResult(json)
      router.refresh()
    } else {
      setState('error')
      setResult(json)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-[#00A651] transition-colors">
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          className="hidden"
          id="csv-input"
          onChange={() => setState('idle')}
        />
        <label htmlFor="csv-input" className="cursor-pointer">
          <div className="text-4xl mb-2">📄</div>
          <p className="text-slate-700 font-medium">Selecciona el CSV de Shifter</p>
          <p className="text-slate-400 text-sm mt-1">Exporta el reporte semanal desde Shifter/Akcelita y súbelo aquí</p>
        </label>
        {fileRef.current?.files?.[0] && (
          <p className="mt-3 text-sm text-[#00A651] font-medium">{fileRef.current.files[0].name}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={state === 'loading'}
        className="w-full bg-[#00A651] hover:bg-[#008f44] disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition-colors"
      >
        {state === 'loading' ? 'Procesando…' : 'Subir y procesar CSV'}
      </button>

      {state === 'success' && result && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
          <p className="font-semibold mb-1">✅ Cargado exitosamente</p>
          <p>Semana: <strong>{String(result.weekKey)}</strong> ({String(result.weekStart)} → {String(result.weekEnd)})</p>
          <p>{String(result.employees)} empleados · {String(result.totalShifts)} turnos procesados</p>
        </div>
      )}

      {state === 'error' && result && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
          <p className="font-semibold">❌ Error al procesar</p>
          <p>{String(result.error)}</p>
        </div>
      )}
    </form>
  )
}
