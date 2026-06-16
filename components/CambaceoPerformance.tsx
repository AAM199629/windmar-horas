'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { VendedorPerformanceRow, CoordinadorRow } from '@/lib/performance'
import type { CambaceoDealDetail } from '@/lib/redshift'
import KpiCard from '@/app/canales/mall/components/KpiCard'
import { useAnim } from '@/app/canales/mall/hooks/useAnim'

// ── Types ────────────────────────────────────────────────────────────────────

interface LeadDetail {
  leadId: string | null
  createdDate: string
  createdAt: string
  coordinador: string
  leadSource: string
  canvaserName: string | null
  dealId: string | null
  dealClosingDate: string | null
  dealPipeline: string | null
  dealVendedor: string | null
}

type ModalState =
  | { type: 'deals'; title: string; deals: CambaceoDealDetail[] }
  | { type: 'leads'; title: string; leads: LeadDetail[] }
  | null

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS_ES: Record<string, string> = {
  '01': 'Enero',    '02': 'Febrero',   '03': 'Marzo',     '04': 'Abril',
  '05': 'Mayo',     '06': 'Junio',     '07': 'Julio',     '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
}

function fmtMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-')
  return `${MONTHS_ES[m] ?? m} ${y}`
}

function getMonths(): string[] {
  const months: string[] = []
  const now   = new Date()
  const start = new Date(2026, 0, 1)
  let d = new Date(now.getFullYear(), now.getMonth(), 1)
  while (d >= start) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  }
  return months
}

function fmtAmount(n: number | null): string {
  if (n == null) return '—'
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 0 })}`
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const CARD_STYLE: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 24,
  boxShadow: '0 8px 24px rgba(33,39,78,.10)',
  padding: '28px 30px',
  fontFamily: "'Montserrat', sans-serif",
}

const EYEBROW: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.14em',
  color: '#1D429B',
  marginBottom: 4,
}

const SECTION_TITLE: React.CSSProperties = {
  fontFamily: "'Bebas Neue', sans-serif",
  fontSize: 30,
  lineHeight: 1,
  color: '#21274E',
  marginBottom: 8,
}

const ACCENT_RULE: React.CSSProperties = {
  width: 72,
  height: 3,
  borderRadius: 999,
  background: '#F89B24',
  boxShadow: '0 0 8px rgba(248,155,36,.5)',
  marginBottom: 20,
}

// ── SectionHead ───────────────────────────────────────────────────────────────

function SectionHead({ eyebrow, title, chip }: {
  eyebrow: string
  title: string
  chip?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
      <div>
        <p style={EYEBROW}>{eyebrow}</p>
        <h3 style={SECTION_TITLE}>{title}</h3>
        <div style={ACCENT_RULE} />
      </div>
      {chip && (
        <div style={{
          background: '#F1F2F5',
          border: '1px solid #E4E5E9',
          borderRadius: 999,
          padding: '6px 14px',
          fontSize: 12,
          fontWeight: 600,
          color: '#4B4B4E',
          whiteSpace: 'nowrap',
          alignSelf: 'center',
          fontFamily: "'Montserrat', sans-serif",
        }}>
          {chip}
        </div>
      )}
    </div>
  )
}

// ── TH / TD helpers ───────────────────────────────────────────────────────────

const TH: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.12em',
  color: '#FFFFFF',
  background: '#21274E',
  fontFamily: "'Montserrat', sans-serif",
  whiteSpace: 'nowrap',
}

const TH_CENTER: React.CSSProperties = { ...TH, textAlign: 'center' }

const TD: React.CSSProperties = {
  padding: '11px 16px',
  borderBottom: '1px solid #F1F2F5',
  fontSize: 13,
  fontFamily: "'Montserrat', sans-serif",
  verticalAlign: 'middle',
}

const TD_CENTER: React.CSSProperties = { ...TD, textAlign: 'center' }

// ── Modal ─────────────────────────────────────────────────────────────────────

function Modal({ state, onClose }: { state: NonNullable<ModalState>; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,.40)', backdropFilter: 'blur(4px)', padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#FFFFFF',
        borderRadius: 20,
        boxShadow: '0 24px 48px rgba(33,39,78,.25)',
        width: '100%',
        maxWidth: 900,
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Montserrat', sans-serif",
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 22px',
          background: '#21274E',
          borderRadius: '20px 20px 0 0',
        }}>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>{state.title}</h2>
            <p style={{ fontSize: 12, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>
              {state.type === 'deals'
                ? `${state.deals.length} venta${state.deals.length !== 1 ? 's' : ''}`
                : `${state.leads.length} lead${state.leads.length !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,.12)',
              border: 'none',
              borderRadius: 10,
              width: 32, height: 32,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <svg style={{ width: 16, height: 16 }} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '0 0 8px' }}>
          {state.type === 'deals' ? (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  {['Vendedor', 'Fecha Cierre', 'Pipeline', 'Monto', 'Canvassing', 'Estado'].map(h => (
                    <th key={h} style={{ ...TH, background: '#21274E' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.deals.map((d, i) => (
                  <tr key={d.zohoId || i} style={{ background: i % 2 === 0 ? '#FFFFFF' : '#F7F8FA' }}>
                    <td style={TD}><span style={{ fontWeight: 600, color: '#21274E' }}>{d.vendedor}</span></td>
                    <td style={TD}><span style={{ color: '#8A8A8F' }}>{d.closingDate}</span></td>
                    <td style={TD}>{d.pipeline}</td>
                    <td style={{ ...TD, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmtAmount(d.amount)}</td>
                    <td style={TD_CENTER}>
                      {d.isCanvassing
                        ? <span style={{ fontSize: 11, background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>Sí</span>
                        : <span style={{ color: '#C5C5C9' }}>—</span>}
                    </td>
                    <td style={TD}>
                      {d.onHoldStatus || d.cancellationReason
                        ? <span style={{ fontSize: 11, color: '#E0334B' }}>{d.cancellationReason ?? d.onHoldStatus}</span>
                        : <span style={{ fontSize: 11, color: '#1FA971', fontWeight: 600 }}>Activo</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  {['Lead ID', 'Fecha', 'Canvaser', 'Lead Source', '¿Vendido?', 'Fecha Venta', 'Vendedor', 'Pipeline'].map(h => (
                    <th key={h} style={{ ...TH, background: '#21274E' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {state.leads.map((l, i) => (
                  <tr key={l.leadId ?? i} style={{ background: i % 2 === 0 ? '#FFFFFF' : '#F7F8FA' }}>
                    <td style={TD}><span style={{ fontFamily: 'monospace', fontSize: 11, color: '#8A8A8F' }}>{l.leadId ? l.leadId.slice(-8) : '—'}</span></td>
                    <td style={TD}><span style={{ color: '#8A8A8F' }}>{l.createdDate}</span></td>
                    <td style={TD}>{l.canvaserName ?? '—'}</td>
                    <td style={TD}><span style={{ fontSize: 11, color: '#8A8A8F' }}>{l.leadSource}</span></td>
                    <td style={TD_CENTER}>
                      {l.dealId
                        ? <span style={{ fontSize: 11, background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: 99, fontWeight: 600 }}>Sí</span>
                        : <span style={{ fontSize: 11, color: '#C5C5C9' }}>No</span>}
                    </td>
                    <td style={TD}><span style={{ color: '#8A8A8F' }}>{l.dealClosingDate ?? '—'}</span></td>
                    <td style={TD}><span style={{ fontWeight: 600 }}>{l.dealVendedor ?? '—'}</span></td>
                    <td style={TD}>{l.dealPipeline ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CambaceoPerformance({
  vendedores,
  coordinadores,
  month,
}: {
  vendedores: VendedorPerformanceRow[]
  coordinadores: CoordinadorRow[]
  month: string
}) {
  const router  = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const animOn  = useAnim(rootRef)
  const months  = getMonths()

  const [allDeals, setAllDeals]         = useState<CambaceoDealDetail[] | null>(null)
  const [allLeads, setAllLeads]         = useState<LeadDetail[] | null>(null)
  const [loadingDeals, setLoadingDeals] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [modal, setModal]               = useState<ModalState>(null)

  const totalTurnos = vendedores.reduce((s, v) => s + v.turnos, 0)
  const totalMissed = vendedores.reduce((s, v) => s + v.missed, 0)
  const totalVentas = vendedores.reduce((s, v) => s + v.ventasCanal, 0)
  const totalLeads  = coordinadores.reduce((s, c) => s + c.leads, 0)

  const ensureDeals = useCallback(async () => {
    if (allDeals) return allDeals
    setLoadingDeals(true)
    try {
      const res  = await fetch(`/api/canales/cambaceo/deals?month=${month}`)
      const data = await res.json()
      if (Array.isArray(data)) { setAllDeals(data); return data }
      return []
    } finally {
      setLoadingDeals(false)
    }
  }, [allDeals, month])

  const ensureLeads = useCallback(async () => {
    if (allLeads) return allLeads
    setLoadingLeads(true)
    try {
      const res  = await fetch(`/api/canales/cambaceo/leads?month=${month}`)
      const data = await res.json()
      if (Array.isArray(data)) { setAllLeads(data); return data }
      return []
    } finally {
      setLoadingLeads(false)
    }
  }, [allLeads, month])

  async function openDealModal(filter: (d: CambaceoDealDetail) => boolean, title: string) {
    const deals = await ensureDeals()
    setModal({ type: 'deals', title, deals: deals.filter(filter) })
  }

  async function openLeadModal(filter: (l: LeadDetail) => boolean, title: string) {
    const leads = await ensureLeads()
    setModal({ type: 'leads', title, leads: leads.filter(filter) })
  }

  const isBusy = loadingDeals || loadingLeads

  return (
    <>
      {modal && <Modal state={modal} onClose={() => setModal(null)} />}

      {isBusy && (
        <div style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 40,
          background: '#FFFFFF',
          border: '1px solid #E4E5E9',
          borderRadius: 14,
          boxShadow: '0 8px 24px rgba(33,39,78,.14)',
          padding: '10px 16px',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, color: '#21274E',
          fontFamily: "'Montserrat', sans-serif",
          fontWeight: 600,
        }}>
          <svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          Cargando detalle…
        </div>
      )}

      <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>

        {/* ── Selector de mes ────────────────────────────────────────────── */}
        <div style={{
          ...CARD_STYLE,
          padding: '14px 24px',
          borderRadius: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 20,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1D429B' }}>
            MES
          </span>
          <div style={{
            background: '#F1F2F5',
            border: '1px solid #E4E5E9',
            borderRadius: 12,
            padding: '6px 14px',
            display: 'flex',
            alignItems: 'center',
          }}>
            <select
              value={month}
              onChange={e => {
                setAllDeals(null)
                setAllLeads(null)
                router.push(`/canales/cambaceo?view=performance&month=${e.target.value}`)
              }}
              style={{
                border: 'none',
                background: 'transparent',
                fontSize: 13,
                fontWeight: 600,
                color: '#21274E',
                fontFamily: "'Montserrat', sans-serif",
                cursor: 'pointer',
                outline: 'none',
                padding: 0,
              }}
            >
              {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
            </select>
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#8A8A8F' }}>
            Toca cualquier número para ver el detalle
          </span>
        </div>

        {/* ── Banda de KPIs ──────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: 16,
        }}>
          <KpiCard
            label="Vendedores"
            value={vendedores.length}
            sub={fmtMonth(month)}
            color="#1D429B"
            glow="#3D6BFF"
            animOn={animOn}
          />
          <KpiCard
            label="Turnos"
            value={totalTurnos}
            sub="turnos en el mes"
            color="#6B48FF"
            glow="#8A6BFF"
            animOn={animOn}
          />
          <KpiCard
            label="Missed"
            value={totalMissed}
            sub="turnos sin registrar"
            color="#E0334B"
            glow="#FF5D6C"
            animOn={animOn}
          />
          <KpiCard
            label="Ventas Canv."
            value={totalVentas}
            sub="ventas de canvaseo"
            color="#1FA971"
            glow="#1FA971"
            animOn={animOn}
          />
          <KpiCard
            label="Leads"
            value={totalLeads}
            sub="leads del mes"
            color="#1D429B"
            glow="#3D6BFF"
            animOn={animOn}
          />
        </div>

        {/* ── Coordinadores ──────────────────────────────────────────────── */}
        <div style={CARD_STYLE}>
          <SectionHead
            eyebrow="CANVASEO"
            title="Por Coordinador de Canvaseo"
            chip={`${coordinadores.length} coordinadores · ${fmtMonth(month)}`}
          />
          {coordinadores.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8A8A8F' }}>
              No hay data de coordinadores para {fmtMonth(month)}.
            </p>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #F1F2F5' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, width: 40 }}>#</th>
                    <th style={TH}>Coordinador</th>
                    <th style={TH_CENTER}>Leads</th>
                    <th style={TH_CENTER}>Ventas</th>
                    <th style={TH_CENTER}>Conv. %</th>
                  </tr>
                </thead>
                <tbody>
                  {coordinadores.map((c, idx) => {
                    const convRate = c.leads > 0 ? ((c.ventas / c.leads) * 100).toFixed(1) : null
                    return (
                      <tr key={`${c.coordinador}-${idx}`} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                        <td style={{ ...TD, color: '#C5C5C9', fontSize: 12 }}>{idx + 1}</td>
                        <td style={TD}>
                          <span style={{ fontWeight: 700, color: '#21274E' }}>{c.coordinador}</span>
                        </td>
                        <td style={TD_CENTER}>
                          <button
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontFamily: "'Montserrat', sans-serif",
                              fontWeight: 700, fontSize: 15, color: '#1D429B',
                            }}
                            onClick={() => openLeadModal(
                              l => l.coordinador === c.coordinador,
                              `${c.coordinador} — Leads · ${fmtMonth(month)}`,
                            )}
                          >
                            {c.leads}
                          </button>
                        </td>
                        <td style={TD_CENTER}>
                          {c.ventas > 0 ? (
                            <button
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontFamily: "'Montserrat', sans-serif",
                                fontWeight: 700, fontSize: 15, color: '#1FA971',
                              }}
                              onClick={() => openLeadModal(
                                l => l.coordinador === c.coordinador && l.dealId != null,
                                `${c.coordinador} — Leads convertidos · ${fmtMonth(month)}`,
                              )}
                            >
                              {c.ventas}
                            </button>
                          ) : (
                            <span style={{ color: '#C5C5C9' }}>0</span>
                          )}
                        </td>
                        <td style={{ ...TD_CENTER, color: '#8A8A8F', fontSize: 12, fontWeight: 600 }}>
                          {convRate != null ? `${convRate}%` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                  {/* Totals row */}
                  <tr style={{ background: '#F1F2F5', borderTop: '2px solid #E4E5E9' }}>
                    <td style={{ ...TD, color: '#8A8A8F', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }} colSpan={2}>
                      Total
                    </td>
                    <td style={{ ...TD_CENTER, fontWeight: 700, color: '#1D429B', fontSize: 15 }}>
                      {coordinadores.reduce((s, c) => s + c.leads, 0)}
                    </td>
                    <td style={{ ...TD_CENTER, fontWeight: 700, color: '#1FA971', fontSize: 15 }}>
                      {coordinadores.reduce((s, c) => s + c.ventas, 0)}
                    </td>
                    <td style={{ ...TD_CENTER, color: '#8A8A8F', fontSize: 12, fontWeight: 600 }}>
                      {(() => {
                        const l = coordinadores.reduce((s, c) => s + c.leads, 0)
                        const v = coordinadores.reduce((s, c) => s + c.ventas, 0)
                        return l > 0 ? `${((v / l) * 100).toFixed(1)}%` : '—'
                      })()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Vendedores ─────────────────────────────────────────────────── */}
        <div style={CARD_STYLE}>
          <SectionHead
            eyebrow="STIP"
            title="Vendedores"
            chip={`${vendedores.length} vendedores · ${fmtMonth(month)}`}
          />
          {vendedores.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8A8A8F' }}>
              No hay turnos de cambaceo en {fmtMonth(month)}.
            </p>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 14, border: '1px solid #F1F2F5' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ ...TH, width: 40 }}>#</th>
                    <th style={TH}>Vendedor</th>
                    <th style={TH_CENTER}>Turnos</th>
                    <th style={TH_CENTER}>Missed</th>
                    <th style={TH_CENTER}>Ventas Canv.</th>
                    <th style={TH_CENTER}>Total Ventas</th>
                  </tr>
                </thead>
                <tbody>
                  {vendedores.map((v, idx) => (
                    <tr key={v.email} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA' }}>
                      <td style={{ ...TD, color: '#C5C5C9', fontSize: 12 }}>{idx + 1}</td>
                      <td style={TD}>
                        <p style={{ fontWeight: 700, color: '#21274E', margin: 0, lineHeight: 1.3 }}>{v.name}</p>
                        <p style={{ fontSize: 11, color: '#8A8A8F', margin: 0 }}>{v.email}</p>
                      </td>
                      <td style={{ ...TD_CENTER, fontWeight: 600, color: '#21274E' }}>{v.turnos}</td>
                      <td style={TD_CENTER}>
                        <span style={{ fontWeight: 700, color: v.missed > 0 ? '#E0334B' : '#C5C5C9' }}>
                          {v.missed}
                        </span>
                      </td>
                      <td style={TD_CENTER}>
                        {v.ventasCanal > 0 ? (
                          <button
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontFamily: "'Montserrat', sans-serif",
                              fontWeight: 700, fontSize: 15, color: '#1FA971',
                            }}
                            onClick={() => openDealModal(
                              d => d.email === v.email && d.isCanvassing,
                              `${v.name} — Ventas Canvassing · ${fmtMonth(month)}`,
                            )}
                          >
                            {v.ventasCanal}
                          </button>
                        ) : (
                          <span style={{ color: '#C5C5C9' }}>0</span>
                        )}
                      </td>
                      <td style={TD_CENTER}>
                        {v.totalVentas > 0 ? (
                          <button
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontFamily: "'Montserrat', sans-serif",
                              fontWeight: 600, fontSize: 14, color: '#21274E',
                            }}
                            onClick={() => openDealModal(
                              d => d.email === v.email,
                              `${v.name} — Todas las ventas · ${fmtMonth(month)}`,
                            )}
                          >
                            {v.totalVentas}
                          </button>
                        ) : (
                          <span style={{ color: '#C5C5C9' }}>0</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Tagline ───────────────────────────────────────────────────── */}
        <p style={{
          textAlign: 'center',
          fontStyle: 'italic',
          fontWeight: 500,
          color: '#1D429B',
          fontSize: 17,
          fontFamily: "'Montserrat', sans-serif",
          padding: '4px 0 12px',
        }}>
          No es solo energía, es tranquilidad para ti y tu familia.
        </p>

      </div>
    </>
  )
}
