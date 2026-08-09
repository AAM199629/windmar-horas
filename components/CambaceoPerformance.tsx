'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { VendedorPerformanceRow } from '@/lib/performance'
import type { CambaceoDealDetail } from '@/lib/redshift'
import KpiCard from '@/app/canales/mall/components/KpiCard'
import { useAnim } from '@/app/canales/mall/hooks/useAnim'
import EarningsTable from '@/components/EarningsTable'

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

interface CoordStat {
  name: string
  leads: number
  ventas: number
  convRate: number
}

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
              background: 'rgba(255,255,255,.12)', border: 'none', borderRadius: 10,
              width: 32, height: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <svg style={{ width: 16, height: 16 }} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
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
                      {d.isCancelled
                        ? <span style={{ fontSize: 11, color: '#E0334B' }}>{d.cancellationReason ?? d.onHoldStatus ?? 'Cancelada'}</span>
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

// ── CoordBars ─────────────────────────────────────────────────────────────────

function CoordBars({ rows, animOn, onClickLeads, onClickVentas }: {
  rows: CoordStat[]
  animOn: boolean
  onClickLeads: (name: string) => void
  onClickVentas: (name: string) => void
}) {
  const maxLeads = Math.max(...rows.map(r => r.leads), 1)
  const totLeads  = rows.reduce((s, r) => s + r.leads, 0)
  const totVentas = rows.reduce((s, r) => s + r.ventas, 0)
  const totConv   = totLeads > 0 ? (totVentas / totLeads) * 100 : 0

  return (
    <div>
      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 56px 56px 68px',
        gap: '0 12px',
        padding: '0 0 10px',
        borderBottom: '2px solid #F1F2F5',
        marginBottom: 4,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A8F' }}>Coordinador</span>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1D429B', textAlign: 'center' }}>Leads</span>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1FA971', textAlign: 'center' }}>Ventas</span>
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A8F', textAlign: 'right' }}>Conv.</span>
      </div>

      {rows.map((row, idx) => {
        const leadsBarPct = (row.leads / maxLeads) * 100
        const ventasPct   = row.leads > 0 ? (row.ventas / row.leads) * 100 : 0
        const delay       = idx * 55

        return (
          <div key={row.name} style={{
            display: 'grid',
            gridTemplateColumns: '1fr 56px 56px 68px',
            gap: '0 12px',
            alignItems: 'center',
            padding: '11px 0',
            borderBottom: '1px solid #F7F8FA',
          }}>
            {/* Name + bar */}
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#21274E', marginBottom: 6, lineHeight: 1.2 }}>{row.name}</div>
              {/* Track */}
              <div style={{ height: 7, borderRadius: 999, background: '#EEF3FD', position: 'relative', overflow: 'hidden' }}>
                {/* Leads fill */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: animOn ? `${leadsBarPct}%` : '0%',
                  transition: `width 0.7s ease ${delay}ms`,
                  background: 'rgba(29,66,155,0.20)',
                  borderRadius: 999,
                }} />
                {/* Ventas fill — proportional within leads fill */}
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: animOn ? `${(leadsBarPct * ventasPct) / 100}%` : '0%',
                  transition: `width 0.9s ease ${delay + 80}ms`,
                  background: '#1FA971',
                  borderRadius: 999,
                }} />
              </div>
            </div>

            {/* Leads count */}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => onClickLeads(row.name)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontFamily: "'Montserrat', sans-serif",
                  fontWeight: 700, fontSize: 14, color: '#1D429B',
                }}
              >
                {row.leads}
              </button>
            </div>

            {/* Ventas count */}
            <div style={{ textAlign: 'center' }}>
              {row.ventas > 0 ? (
                <button
                  onClick={() => onClickVentas(row.name)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: "'Montserrat', sans-serif",
                    fontWeight: 700, fontSize: 14, color: '#1FA971',
                  }}
                >
                  {row.ventas}
                </button>
              ) : (
                <span style={{ color: '#C5C5C9', fontSize: 13 }}>0</span>
              )}
            </div>

            {/* Conv rate */}
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: row.convRate > 0.1 ? '#1FA971' : '#8A8A8F',
              }}>
                {(row.convRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )
      })}

      {/* Totals row */}
      {rows.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 56px 56px 68px',
          gap: '0 12px',
          alignItems: 'center',
          padding: '14px 0 4px',
          borderTop: '2px solid #E4E5E9',
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#8A8A8F' }}>Total</span>
          <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#1D429B' }}>{totLeads}</span>
          <span style={{ textAlign: 'center', fontWeight: 700, fontSize: 14, color: '#1FA971' }}>{totVentas}</span>
          <span style={{ textAlign: 'right', fontSize: 12, fontWeight: 600, color: '#8A8A8F' }}>{totConv.toFixed(1)}%</span>
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function CambaceoPerformance({
  vendedores,
  month,
}: {
  vendedores: VendedorPerformanceRow[]
  month: string
}) {
  const router  = useRouter()
  const rootRef = useRef<HTMLDivElement>(null)
  const animOn  = useAnim(rootRef)
  const months  = getMonths()

  const today            = new Date().toISOString().slice(0, 10)
  const currentMonthStart = `${today.slice(0, 7)}-01`

  const [fromDate, setFromDate] = useState(currentMonthStart)
  const [toDate,   setToDate]   = useState(today)

  const [allDeals,   setAllDeals]   = useState<CambaceoDealDetail[] | null>(null)
  const [allLeads,   setAllLeads]   = useState<LeadDetail[] | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [modal,      setModal]      = useState<ModalState>(null)

  // Fetch full year on mount, filter client-side
  useEffect(() => {
    const yr     = today.slice(0, 4)
    const yStart = `${yr}-01-01`
    Promise.all([
      fetch(`/api/canales/cambaceo/deals?from=${yStart}&to=${today}`).then(r => r.json()),
      fetch(`/api/canales/cambaceo/leads?from=${yStart}&to=${today}`).then(r => r.json()),
    ])
      .then(([deals, leads]) => {
        if (Array.isArray(deals)) setAllDeals(deals)
        else setFetchError(deals?.error ?? 'Error al cargar deals')
        if (Array.isArray(leads)) setAllLeads(leads)
      })
      .catch(e => setFetchError(e?.message ?? 'Error desconocido'))
      .finally(() => setLoading(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Filtered by date range
  const filteredDeals = useMemo(
    () => (allDeals ?? []).filter(d => d.closingDate >= fromDate && d.closingDate <= toDate),
    [allDeals, fromDate, toDate],
  )
  const filteredLeads = useMemo(
    () => (allLeads ?? []).filter(l => l.createdDate >= fromDate && l.createdDate <= toDate),
    [allLeads, fromDate, toDate],
  )

  // KPIs
  const totalSales         = filteredDeals.filter(d => !d.isCancelled).length
  const totalCancellations = filteredDeals.filter(d => d.isCancelled).length
  const cancRate           = totalSales + totalCancellations > 0
    ? totalCancellations / (totalSales + totalCancellations) : 0

  // Coordinator stats aggregated from leads
  const coordStats: CoordStat[] = useMemo(() => {
    const map = new Map<string, { leads: number; ventas: number }>()
    for (const l of filteredLeads) {
      if (!l.coordinador) continue
      if (!map.has(l.coordinador)) map.set(l.coordinador, { leads: 0, ventas: 0 })
      const s = map.get(l.coordinador)!
      s.leads++
      if (l.dealId) s.ventas++
    }
    return Array.from(map.entries())
      .map(([name, s]) => ({ name, ...s, convRate: s.leads > 0 ? s.ventas / s.leads : 0 }))
      .sort((a, b) => b.ventas - a.ventas || b.leads - a.leads)
  }, [filteredLeads])

  // STIP totals
  const totalTurnos = vendedores.reduce((s, v) => s + v.turnos, 0)
  const totalMissed = vendedores.reduce((s, v) => s + v.missed, 0)

  // Modal openers
  function openLeadsForCoord(coordinador: string) {
    const leads = filteredLeads.filter(l => l.coordinador === coordinador)
    setModal({ type: 'leads', title: `${coordinador} — Leads`, leads })
  }

  function openVentasForCoord(coordinador: string) {
    const leads = filteredLeads.filter(l => l.coordinador === coordinador && l.dealId != null)
    setModal({ type: 'leads', title: `${coordinador} — Leads Convertidos`, leads })
  }

  function openDealsForVendedor(email: string, name: string, canvassingOnly: boolean) {
    const deals = filteredDeals.filter(d => d.email === email && (!canvassingOnly || d.isCanvassing))
    const title = canvassingOnly
      ? `${name} — Ventas Canvassing`
      : `${name} — Todas las ventas`
    setModal({ type: 'deals', title, deals })
  }

  return (
    <>
      {modal && <Modal state={modal} onClose={() => setModal(null)} />}

      <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>

        {/* ── Filter bar (date range) ─────────────────────────────────── */}
        <div style={{
          ...CARD_STYLE,
          padding: '14px 24px',
          borderRadius: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 20,
        }}>
          {([
            { label: 'Desde', value: fromDate, min: undefined, max: toDate,   onChange: setFromDate },
            { label: 'Hasta', value: toDate,   min: fromDate,  max: today,    onChange: setToDate },
          ] as { label: string; value: string; min?: string; max?: string; onChange: (v: string) => void }[]).map(({ label, value, min, max, onChange }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1D429B' }}>
                {label}
              </span>
              <div style={{ background: '#F1F2F5', border: '1px solid #E4E5E9', borderRadius: 12, padding: '6px 14px' }}>
                <input
                  type="date"
                  value={value}
                  min={min}
                  max={max}
                  onChange={e => onChange(e.target.value)}
                  style={{
                    border: 'none', background: 'transparent',
                    fontSize: 13, fontWeight: 600, color: '#21274E',
                    fontFamily: "'Montserrat', sans-serif",
                    cursor: 'pointer', outline: 'none', padding: 0,
                  }}
                />
              </div>
            </div>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#8A8A8F' }}>
            Toca cualquier número para ver el detalle
          </span>
        </div>

        {/* ── KPI band ───────────────────────────────────────────────── */}
        {loading ? (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '72px 0', gap: 12,
            color: '#8A8A8F', fontFamily: "'Montserrat', sans-serif", fontSize: 14,
          }}>
            <svg className="animate-spin" style={{ width: 22, height: 22, flexShrink: 0 }} viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Cargando datos de Redshift…
          </div>
        ) : fetchError ? (
          <div style={{
            background: '#FFF0F2', border: '1px solid #FECDD3',
            borderRadius: 16, padding: '20px 24px',
            color: '#E0334B', fontFamily: "'Montserrat', sans-serif", fontSize: 13,
          }}>
            <p style={{ fontWeight: 700, marginBottom: 4 }}>Error al cargar datos</p>
            <p style={{ fontFamily: 'monospace', fontSize: 11, opacity: 0.7 }}>{fetchError}</p>
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}>
              <KpiCard
                label="Ventas Totales"
                value={totalSales + totalCancellations}
                sub="en el período"
                color="#1D429B"
                glow="#3D6BFF"
                animOn={animOn}
              />
              <KpiCard
                label="Canceladas"
                value={totalCancellations}
                sub="ventas canceladas"
                color="#E0334B"
                glow="#FF5D6C"
                animOn={animOn}
              />
              <KpiCard
                label="Tasa de Cancelación"
                value={Math.round(cancRate * 100)}
                sub={`${Math.round(cancRate * 100)}% del total`}
                color="#6B48FF"
                glow="#8A6BFF"
                animOn={animOn}
                isGauge
                gaugePct={cancRate}
              />
              <KpiCard
                label="Pipeline Activo"
                value={totalSales}
                sub="ventas activas"
                color="#1FA971"
                glow="#1FA971"
                animOn={animOn}
              />
            </div>

            {/* ── Coordinator bar chart ──────────────────────────────── */}
            <div style={CARD_STYLE}>
              <SectionHead
                eyebrow="CANVASEO · LEADS"
                title="Por Coordinador de Canvaseo"
                chip={`${coordStats.length} coordinadores`}
              />
              {coordStats.length === 0 ? (
                <p style={{ fontSize: 13, color: '#8A8A8F' }}>
                  No hay leads de canvaseo en el período seleccionado.
                </p>
              ) : (
                <CoordBars
                  rows={coordStats}
                  animOn={animOn}
                  onClickLeads={openLeadsForCoord}
                  onClickVentas={openVentasForCoord}
                />
              )}
            </div>
          </>
        )}

        {/* ── Vendedores (STIP) ──────────────────────────────────────── */}
        <div style={CARD_STYLE}>
          <div style={{
            display: 'flex', flexWrap: 'wrap',
            alignItems: 'flex-start', justifyContent: 'space-between',
            gap: 16, marginBottom: 20,
          }}>
            <div>
              <p style={EYEBROW}>SHIFTER · TURNOS</p>
              <h3 style={SECTION_TITLE}>Vendedores</h3>
              <div style={ACCENT_RULE} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1D429B' }}>
                  Mes
                </span>
                <div style={{ background: '#F1F2F5', border: '1px solid #E4E5E9', borderRadius: 12, padding: '6px 14px' }}>
                  <select
                    value={month}
                    onChange={e => router.push(`/canales/cambaceo?view=dashboard&month=${e.target.value}`)}
                    style={{
                      border: 'none', background: 'transparent',
                      fontSize: 13, fontWeight: 600, color: '#21274E',
                      fontFamily: "'Montserrat', sans-serif",
                      cursor: 'pointer', outline: 'none', padding: 0,
                    }}
                  >
                    {months.map(m => <option key={m} value={m}>{fmtMonth(m)}</option>)}
                  </select>
                </div>
              </div>
              <div style={{
                background: '#F1F2F5', border: '1px solid #E4E5E9',
                borderRadius: 999, padding: '6px 14px',
                fontSize: 12, fontWeight: 600, color: '#4B4B4E',
                fontFamily: "'Montserrat', sans-serif",
              }}>
                {vendedores.length} vendedores · {totalTurnos} turnos · {totalMissed} missed
              </div>
            </div>
          </div>

          {vendedores.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8A8A8F' }}>No hay turnos de cambaceo en {fmtMonth(month)}.</p>
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
                            onClick={() => openDealsForVendedor(v.email, v.name, true)}
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
                            onClick={() => openDealsForVendedor(v.email, v.name, false)}
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

        {/* ── Tagline ──────────────────────────────────────────────────── */}
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

      <EarningsTable defaultCanal="cambaceo" />
    </>
  )
}
