'use client'

import { useEffect, useRef } from 'react'
import type { MallBoothLeadDetail } from '@/lib/redshift'

interface Props {
  leads: MallBoothLeadDetail[]
  title: string
  onClose: () => void
}

export default function LeadModal({ leads, title, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const sold   = leads.filter(l => l.isSold).length
  const unsold = leads.length - sold

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={dialogRef}
        className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#0D1654] rounded-t-xl">
          <div>
            <h2 className="text-base font-semibold text-white">{title}</h2>
            <p className="text-xs text-blue-200 mt-0.5">
              {leads.length} lead{leads.length !== 1 ? 's' : ''}
              {sold > 0 && ` · ${sold} vendido${sold !== 1 ? 's' : ''}`}
              {unsold > 0 && ` · ${unsold} sin venta`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white transition-colors p-1 rounded"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-auto flex-1 px-5 py-4">
          <table className="text-sm border-collapse w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#0D1654] text-left text-xs text-white uppercase tracking-wide">
                <th className="px-3 py-2 border border-[#1565C0] font-semibold">Lead ID</th>
                <th className="px-3 py-2 border border-[#1565C0] font-semibold">Nombre</th>
                <th className="px-3 py-2 border border-[#1565C0] font-semibold">Registrado Por</th>
                <th className="px-3 py-2 border border-[#1565C0] font-semibold">Fecha</th>
                <th className="px-3 py-2 border border-[#1565C0] font-semibold text-center">¿Vendido?</th>
                <th className="px-3 py-2 border border-[#1565C0] font-semibold">Pipeline</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <tr key={lead.leadId || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 border border-slate-200 text-slate-500 font-mono text-xs">
                    {lead.leadId ? lead.leadId.slice(-8) : '—'}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 text-[#0D1654] font-medium">
                    {lead.leadName || '—'}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 text-slate-700">
                    {lead.registradoPor}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 text-slate-600">
                    {lead.createdDate}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 text-center">
                    {lead.isSold
                      ? <span className="text-xs bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-medium">Sí</span>
                      : <span className="text-xs text-slate-400">No</span>
                    }
                  </td>
                  <td className="px-3 py-2 border border-slate-200 text-slate-700">
                    {lead.dealPipeline || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
