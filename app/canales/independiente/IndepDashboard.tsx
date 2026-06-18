'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { MallBoothDealDetail, MallBoothLeadDetail } from '@/lib/redshift'
import DealModal from '../mall/DealModal'
import LeadModal from '../mall/LeadModal'
import KpiCard from '../mall/components/KpiCard'
import TrendStrip from '../mall/components/TrendStrip'
import LocationBars from '../mall/components/LocationBars'
import HeatmapTable from '../mall/components/HeatmapTable'
import PipelineDonut from '../mall/components/PipelineDonut'
import SellerCards from '../mall/components/SellerCards'
import type { SellerStat } from '../mall/components/SellerCards'
import { useAnim } from '../mall/hooks/useAnim'
import EarningsTable from '@/components/EarningsTable'

// ─── Constantes ──────────────────────────────────────────────────────────────

const MONTH_LABELS: Record<number, string> = {
  1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic',
}

const PIPELINES = [
  'Residential Solar',
  'Commercial Solar',
  'Roofing',
  'PPS',
  'Water Products',
]

const PIPELINE_SHORT: Record<string, string> = {
  'Residential Solar': 'Res. Solar',
  'Commercial Solar':  'Com. Solar',
  'Roofing':           'Roofing',
  'PPS':               'PPS',
  'Water Products':    'Water',
}

const PIPELINE_COLORS = ['#5B8CFF', '#22C7E6', '#1FD79B', '#FB9F3A', '#FF4D9D']

const HEATMAP_MAX_ROWS = 15

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface ModalState {
  deals: MallBoothDealDetail[]
  title: string
}

// ─── Tokens de diseño ────────────────────────────────────────────────────────

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

// ─── Helpers de UI ───────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '96px 0', gap: 12, color: '#8A8A8F',
      fontFamily: "'Montserrat', sans-serif", fontSize: 14,
    }}>
      <svg className="animate-spin" style={{ width: 24, height: 24, flexShrink: 0 }} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Cargando datos de Redshift…
    </div>
  )
}

function LeadsSpinner() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8A8A8F', fontSize: 13, fontFamily: "'Montserrat',sans-serif" }}>
      <svg className="animate-spin" style={{ width: 16, height: 16 }} viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
      </svg>
      Cargando leads…
    </div>
  )
}

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

// ─── Componente principal ────────────────────────────────────────────────────

export default function IndepDashboard({ year }: { year: number }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const animOn  = useAnim(rootRef)

  // ── Estado ──
  const [allDeals, setAllDeals]     = useState<MallBoothDealDetail[]>([])
  const [loading, setLoading]       = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [modal, setModal]           = useState<ModalState | null>(null)

  const [allLeads, setAllLeads]     = useState<MallBoothLeadDetail[] | null>(null)
  const [leadsError, setLeadsError] = useState<string | null>(null)
  const [leadModal, setLeadModal]   = useState<{ leads: MallBoothLeadDetail[]; title: string } | null>(null)

  const today = new Date().toISOString().slice(0, 10)
  const [fromDate, setFromDate] = useState(`${year}-01-01`)
  const [toDate,   setToDate]   = useState(today)

  // ── Fetch ──
  useEffect(() => {
    fetch('/api/canales/independiente/deals')
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllDeals(data)
        else setFetchError(data.error ?? 'Error al cargar datos')
      })
      .catch(e => setFetchError(e.message))
      .finally(() => setLoading(false))

    fetch(`/api/canales/independiente/leads?year=${year}`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setAllLeads(data)
        else { setLeadsError(data.error ?? 'Error desconocido'); setAllLeads([]) }
      })
      .catch(e => { setLeadsError(e.message); setAllLeads([]) })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Rango de meses ──
  const fromMonth = Math.max(1, Math.min(12, Number(fromDate.slice(5, 7))))
  const toMonth   = Math.max(1, Math.min(12, Number(toDate.slice(5, 7))))

  const months = useMemo(() => {
    const r: number[] = []
    for (let m = fromMonth; m <= toMonth; m++) r.push(m)
    return r
  }, [fromMonth, toMonth])

  const filtered = useMemo(
    () => allDeals.filter(d => d.month >= fromMonth && d.month <= toMonth),
    [allDeals, fromMonth, toMonth],
  )

  // ── KPIs ──
  const totalSales         = useMemo(() => filtered.filter(d => !d.isCancelled).length, [filtered])
  const totalCancellations = useMemo(() => filtered.filter(d => d.isCancelled).length, [filtered])
  const cancRate           = totalSales + totalCancellations > 0
    ? totalCancellations / (totalSales + totalCancellations)
    : 0

  // ── Ventas por canal / evento (orden dinámico) ──
  const salesByLocation = useMemo(() => {
    const map: Record<string, number> = {}
    for (const d of filtered) {
      if (!d.isCancelled) map[d.location] = (map[d.location] ?? 0) + 1
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const maxSales    = salesByLocation[0]?.[1] ?? 1
  const uniqueEvents = salesByLocation.length

  // ── Tendencia mensual ──
  const salesByMonth = useMemo(
    () => months.map(m => filtered.filter(d => d.month === m && !d.isCancelled).length),
    [filtered, months],
  )

  // ── Detalle mensual (para heatmap + modales) ──
  const monthlyData = useMemo(() => {
    const data: Record<string, Record<number, { ventas: MallBoothDealDetail[]; canceladas: MallBoothDealDetail[] }>> = {}
    for (const d of filtered) {
      if (!data[d.location]) data[d.location] = {}
      if (!data[d.location][d.month]) data[d.location][d.month] = { ventas: [], canceladas: [] }
      if (d.isCancelled) data[d.location][d.month].canceladas.push(d)
      else data[d.location][d.month].ventas.push(d)
    }
    return data
  }, [filtered])

  // ── Top N ubicaciones para el heatmap ──
  const heatmapLocations = useMemo(
    () => salesByLocation.slice(0, HEATMAP_MAX_ROWS).map(([loc]) => loc),
    [salesByLocation],
  )

  const heatmapData = useMemo(() => {
    const out: Record<string, Record<number, { ventas: number; canceladas: number }>> = {}
    for (const loc of heatmapLocations) {
      const mMap = monthlyData[loc]
      if (!mMap) continue
      out[loc] = {}
      for (const [mStr, cell] of Object.entries(mMap)) {
        out[loc][Number(mStr)] = {
          ventas:    cell.ventas.length,
          canceladas: cell.canceladas.length,
        }
      }
    }
    return out
  }, [monthlyData, heatmapLocations])

  // ── Pipeline mix (donut) ──
  const pipelineMix = useMemo(() =>
    PIPELINES.map((p, i) => ({
      name:  PIPELINE_SHORT[p],
      value: filtered.filter(d => !d.isCancelled && d.pipeline.toLowerCase() === p.toLowerCase()).length,
      color: PIPELINE_COLORS[i],
    })),
    [filtered],
  )

  // ── Leads filtrados ──
  const filteredLeads = useMemo(() => {
    if (!allLeads) return null
    return allLeads.filter(l => l.createdDate >= fromDate && l.createdDate <= toDate)
  }, [allLeads, fromDate, toDate])

  // ── Seller stats ──
  const sellerStats: SellerStat[] = useMemo(() => {
    if (!filteredLeads) return []
    const map: Record<string, { leads: number; converted: number; locCount: Record<string, number> }> = {}
    for (const l of filteredLeads) {
      if (!l.registradoPor) continue
      if (!map[l.registradoPor]) map[l.registradoPor] = { leads: 0, converted: 0, locCount: {} }
      map[l.registradoPor].leads++
      if (l.isSold) map[l.registradoPor].converted++
      map[l.registradoPor].locCount[l.location] = (map[l.registradoPor].locCount[l.location] ?? 0) + 1
    }
    return Object.entries(map)
      .map(([name, s]) => {
        const topLoc = Object.entries(s.locCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
        return { name, location: topLoc, leads: s.leads, converted: s.converted }
      })
      .sort((a, b) => b.leads - a.leads)
      .slice(0, 16)
  }, [filteredLeads])

  // ── Modal helpers ──
  function openDealModal(deals: MallBoothDealDetail[], title: string) {
    if (deals.length === 0) return
    setModal({ deals, title })
  }

  // ─────────────────────────────────────────────────────────────────────────
  if (loading) return <Spinner />

  if (fetchError) {
    return (
      <div style={{
        padding: 16, background: '#FFF1F2', border: '1px solid #FFD2D7',
        borderRadius: 12, color: '#E0334B', fontSize: 14,
        fontFamily: "'Montserrat', sans-serif",
      }}>
        Error al cargar datos: {fetchError}
      </div>
    )
  }

  const rangeLabel = months.length > 0
    ? `${MONTH_LABELS[months[0]]}–${MONTH_LABELS[months[months.length - 1]]}`
    : ''

  return (
    <>
      {modal && (
        <DealModal deals={modal.deals} title={modal.title} onClose={() => setModal(null)} />
      )}
      {leadModal && (
        <LeadModal leads={leadModal.leads} title={leadModal.title} onClose={() => setLeadModal(null)} />
      )}

      <div ref={rootRef} style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>

        {/* ── Filtro de período ─────────────────────────────────────────── */}
        <div style={{
          ...CARD_STYLE,
          padding: '16px 24px',
          borderRadius: 20,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 28,
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#1D429B' }}>
            PERÍODO
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            {[
              { label: 'Desde', value: fromDate, max: toDate, onChange: setFromDate },
              { label: 'Hasta', value: toDate,   min: fromDate, max: today, onChange: setToDate },
            ].map(f => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 12, color: '#8A8A8F' }}>{f.label}</span>
                <div style={{
                  background: '#F1F2F5',
                  border: '1px solid #E4E5E9',
                  borderRadius: 12,
                  padding: '6px 12px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#21274E',
                  display: 'flex',
                  alignItems: 'center',
                }}>
                  <input
                    type="date"
                    value={f.value}
                    max={f.max}
                    min={'min' in f ? f.min : undefined}
                    onChange={e => f.onChange(e.target.value)}
                    style={{
                      border: 'none', background: 'transparent', color: 'inherit',
                      fontSize: 'inherit', fontWeight: 'inherit', fontFamily: 'inherit',
                      cursor: 'pointer', outline: 'none', padding: 0,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#8A8A8F' }}>
            Toca cualquier número para ver el detalle
          </span>
        </div>

        {/* ── Banda de KPIs ─────────────────────────────────────────────── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: 16,
        }}>
          <KpiCard
            label="Ventas totales"
            value={totalSales + totalCancellations}
            sub={`${uniqueEvents} ubicaciones · ${rangeLabel}`}
            color="#1D429B"
            glow="#3D6BFF"
            animOn={animOn}
          />
          <KpiCard
            label="Canceladas"
            value={totalCancellations}
            sub="del período seleccionado"
            color="#E0334B"
            glow="#FF5D6C"
            animOn={animOn}
          />
          <KpiCard
            label="Tasa de cancelación"
            isGauge
            gaugePct={cancRate}
            sub={`${Math.round(cancRate * 100)}% del total`}
            color="#F89B24"
            glow="#F89B24"
            animOn={animOn}
          />
          <KpiCard
            label="Pipeline activo"
            value={totalSales}
            sub="oportunidades en curso"
            color="#1FA971"
            glow="#1FA971"
            animOn={animOn}
          />
        </div>

        {/* ── Strip de tendencia ────────────────────────────────────────── */}
        {months.length > 1 && (
          <TrendStrip months={months} values={salesByMonth} />
        )}

        {/* ── Ventas por Canal / Evento ─────────────────────────────────── */}
        <div style={CARD_STYLE}>
          <SectionHead
            eyebrow="RANKING DEL PERÍODO"
            title="Ventas por Ubicación"
            chip={`${uniqueEvents} ubicaciones · ${totalSales} ventas`}
          />
          {salesByLocation.length === 0 ? (
            <p style={{ fontSize: 13, color: '#8A8A8F' }}>Sin datos para el período seleccionado.</p>
          ) : (
            <LocationBars
              items={salesByLocation}
              maxSales={maxSales}
              animOn={animOn}
              onClickBar={loc => openDealModal(
                filtered.filter(d => d.location === loc && !d.isCancelled),
                `${loc} — todas las ventas`,
              )}
            />
          )}
        </div>

        {/* ── Fila: Heatmap + Donut ─────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
          <div style={{ ...CARD_STYLE, flex: '1.65 1 400px', minWidth: 0 }}>
            <SectionHead
              eyebrow="MAPA DE CALOR MENSUAL"
              title="Detalle Mensual"
              chip={uniqueEvents > HEATMAP_MAX_ROWS ? `Top ${HEATMAP_MAX_ROWS} ubicaciones` : undefined}
            />
            {heatmapLocations.length === 0 ? (
              <p style={{ fontSize: 13, color: '#8A8A8F' }}>Sin datos para el período seleccionado.</p>
            ) : (
              <HeatmapTable
                locations={heatmapLocations}
                months={months}
                data={heatmapData}
                locLabel={loc => loc}
                onClickCell={(loc, m, type) => {
                  const cell = monthlyData[loc]?.[m]
                  if (!cell) return
                  const deals = type === 'ventas' ? cell.ventas : cell.canceladas
                  openDealModal(deals, `${loc} · ${MONTH_LABELS[m]} — ${type}`)
                }}
                onClickTotal={loc => openDealModal(
                  months.flatMap(m => monthlyData[loc]?.[m]?.ventas ?? []),
                  `${loc} — total ventas`,
                )}
                onClickMonthTotal={m => openDealModal(
                  filtered.filter(d => d.month === m && !d.isCancelled),
                  `Todas las ubicaciones · ${MONTH_LABELS[m]}`,
                )}
                onClickGrandTotal={() => openDealModal(
                  filtered.filter(d => !d.isCancelled),
                  'Todas las ubicaciones — total ventas',
                )}
              />
            )}
          </div>

          <div style={{ ...CARD_STYLE, flex: '1 1 280px', minWidth: 260 }}>
            <SectionHead eyebrow="MIX DEL PIPELINE" title="Por Pipeline" />
            <PipelineDonut
              segments={pipelineMix}
              total={totalSales}
              animOn={animOn}
            />
          </div>
        </div>

        {/* ── Vendedores con más leads ──────────────────────────────────── */}
        <div style={CARD_STYLE}>
          <SectionHead
            eyebrow="LEADS POR VENDEDOR"
            title="Top Vendedores"
            chip={filteredLeads != null ? `${filteredLeads.length} leads` : undefined}
          />
          {allLeads === null ? (
            <LeadsSpinner />
          ) : leadsError ? (
            <p style={{ fontSize: 13, color: '#E0334B', fontFamily: "'Montserrat',sans-serif" }}>
              Error al cargar leads: {leadsError}
            </p>
          ) : (
            <SellerCards sellers={sellerStats} />
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

      <EarningsTable defaultCanal="indep" />
    </>
  )
}
