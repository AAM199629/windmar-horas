'use client'

import { useEffect, useRef } from 'react'
import type { MallBoothDealDetail } from '@/lib/redshift'

interface Props {
  deals: MallBoothDealDetail[]
  title: string
  onClose: () => void
}

function fmt(amount: number | null): string {
  if (amount == null) return '—'
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export default function DealModal({ deals, title, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const active    = deals.filter(d => !d.isCancelled)
  const cancelled = deals.filter(d => d.isCancelled)

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
              {active.length} activa{active.length !== 1 ? 's' : ''}
              {cancelled.length > 0 && ` · ${cancelled.length} cancelada${cancelled.length !== 1 ? 's' : ''}`}
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
            <thead>
              <tr className="bg-[#0D1654] text-left text-xs text-white uppercase tracking-wide">
                <th className="px-3 py-2 border border-[#1565C0] font-semibold">Vendedor</th>
                <th className="px-3 py-2 border border-[#1565C0] font-semibold">Fecha Cierre</th>
                <th className="px-3 py-2 border border-[#1565C0] font-semibold">Pipeline</th>
                <th className="px-3 py-2 border border-[#1565C0] font-semibold text-right">Monto</th>
                <th className="px-3 py-2 border border-[#1565C0] font-semibold">CDBG</th>
                <th className="px-3 py-2 border border-[#1565C0] font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody>
              {deals.map((deal, i) => (
                <tr key={deal.zohoId || i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-2 border border-slate-200 text-slate-800 font-medium">
                    {deal.vendedor}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 text-slate-600">
                    {deal.closingDate}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 text-slate-700">
                    {deal.pipeline}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 text-slate-800 text-right font-mono">
                    {fmt(deal.amount)}
                  </td>
                  <td className="px-3 py-2 border border-slate-200 text-center">
                    {deal.isCdbg
                      ? <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full font-medium">CDBG</span>
                      : ''}
                  </td>
                  <td className="px-3 py-2 border border-slate-200">
                    {deal.isCancelled
                      ? (
                        <span className="text-xs text-red-700">
                          {deal.cancellationReason ?? deal.onHoldStatus ?? 'On Hold'}
                        </span>
                      )
                      : <span className="text-xs text-emerald-700 font-medium">Activo</span>
                    }
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
