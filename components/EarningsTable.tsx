'use client'

import { useEffect, useMemo, useState } from 'react'
import type { MallBoothDealDetail, CambaceoEarningsDeal } from '@/lib/redshift'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Canal = 'mall' | 'indep' | 'cambaceo'

interface Props {
  defaultCanal?: Canal
}

interface EarningsRow {
  name: string
  solar: number
  roofing: number
  water: number
  anker: number
  total: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function commissionRate(pipeline: string): number {
  const p = pipeline.toLowerCase()
  if (p.includes('solar'))  return 0.12
  if (p.includes('roof'))   return 0.10
  if (p.includes('water'))  return 0.10
  if (p.includes('anker'))  return 0.10
  return 0
}

function pipelineCategory(pipeline: string): 'solar' | 'roofing' | 'water' | 'anker' | null {
  const p = pipeline.toLowerCase()
  if (p.includes('solar'))  return 'solar'
  if (p.includes('roof'))   return 'roofing'
  if (p.includes('water'))  return 'water'
  if (p.includes('anker'))  return 'anker'
  return null
}

function fmt(n: number): string {
  return '$' + Math.round(n).toLocaleString('en-US')
}

function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function last12Months(): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = []
  const LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${LABELS[d.getMonth()]} ${d.getFullYear()}`
    months.push({ value, label })
  }
  return months
}

// ─── Estilos ─────────────────────────────────────────────────────────────────

const CARD: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: 24,
  boxShadow: '0 8px 24px rgba(33,39,78,.10)',
  padding: '28px 30px',
  marginTop: 32,
}

const TH: React.CSSProperties = {
  padding: '10px 16px',
  background: '#21274E',
  color: '#FFFFFF',
  fontWeight: 700,
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  fontFamily: "'Montserrat', sans-serif",
  whiteSpace: 'nowrap' as const,
  border: 'none',
}

const TD: React.CSSProperties = {
  padding: '11px 16px',
  fontSize: 13,
  fontFamily: "'Montserrat', sans-serif",
  borderBottom: '1px solid #F1F2F5',
  verticalAlign: 'middle' as const,
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function EarningsTable({ defaultCanal = 'mall' }: Props) {
  const [canal, setCanal]   = useState<Canal>(defaultCanal)
  const [month, setMonth]   = useState(currentYearMonth)
  const [deals, setDeals]   = useState<(MallBoothDealDetail | CambaceoEarningsDeal)[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const months = useMemo(() => last12Months(), [])

  useEffect(() => {
    setLoading(true)
    setError(null)

    let url: string
    if (canal === 'cambaceo') {
      url = `/api/canales/cambaceo/earnings?month=${month}`
    } else if (canal === 'mall') {
      url = `/api/canales/mall/deals`
    } else {
      url = `/api/canales/independiente/deals`
    }

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setDeals(data)
        else setError(data.error ?? 'Error al cargar datos')
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [canal, month])

  // Para mall/indep filtramos client-side por mes
  const filtered = useMemo(() => {
    if (canal === 'cambaceo') return deals
    const [year, mm] = month.split('-').map(Number)
    return (deals as MallBoothDealDetail[]).filter(d => {
      const [dy, dm] = d.closingDate.split('-').map(Number)
      return dy === year && dm === mm
    })
  }, [deals, canal, month])

  const rows = useMemo<EarningsRow[]>(() => {
    const map = new Map<string, EarningsRow>()

    const getKey = (deal: MallBoothDealDetail | CambaceoEarningsDeal): string =>
      canal === 'cambaceo'
        ? ((deal as CambaceoEarningsDeal).coordinador ?? 'Sin coordinador')
        : ((deal as MallBoothDealDetail).location ?? 'Sin ubicación')

    // First pass: register all unique booths/coordinators
    for (const deal of filtered) {
      const key = getKey(deal)
      if (!map.has(key)) {
        map.set(key, { name: key, solar: 0, roofing: 0, water: 0, anker: 0, total: 0 })
      }
    }

    // Second pass: accumulate commissions for qualifying deals
    for (const deal of filtered) {
      if (deal.isCancelled || deal.amount == null || deal.amount <= 0) continue
      const rate = commissionRate(deal.pipeline)
      if (rate === 0) continue
      const cat  = pipelineCategory(deal.pipeline)
      const gain = deal.amount * rate
      const row  = map.get(getKey(deal))!
      if (cat) row[cat] += gain
      row.total += gain
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total)
  }, [filtered, canal])

  const totals = useMemo<Omit<EarningsRow, 'name'>>(() => {
    return rows.reduce(
      (acc, r) => ({
        solar:   acc.solar   + r.solar,
        roofing: acc.roofing + r.roofing,
        water:   acc.water   + r.water,
        anker:   acc.anker   + r.anker,
        total:   acc.total   + r.total,
      }),
      { solar: 0, roofing: 0, water: 0, anker: 0, total: 0 },
    )
  }, [rows])

  const CANAL_TABS: { key: Canal; label: string }[] = [
    { key: 'cambaceo', label: 'Cambaceo' },
    { key: 'mall',     label: 'Booth Malls' },
    { key: 'indep',    label: 'Booth Ind.' },
  ]

  const rowLabel = canal === 'cambaceo' ? 'Coordinador' : 'Booth'

  return (
    <div style={CARD}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.14em', color: '#1D429B', marginBottom: 6,
          fontFamily: "'Montserrat', sans-serif",
        }}>
          GANANCIAS POR CANAL · COMISIONES DEL MES
        </p>
        <h2 style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 'clamp(28px, 3vw, 40px)',
          lineHeight: 0.95,
          margin: 0,
          color: '#21274E',
        }}>
          Tabla de{' '}
          <span style={{ color: '#F89B24' }}>Ganancias</span>
        </h2>
        <div style={{ width: 72, height: 3, background: '#F89B24', borderRadius: 2, marginTop: 8 }} />
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', marginBottom: 24 }}>
        {/* Canal tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {CANAL_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setCanal(tab.key)}
              style={{
                padding: '7px 16px',
                borderRadius: 20,
                border: 'none',
                cursor: 'pointer',
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 12,
                fontWeight: 700,
                background: canal === tab.key ? '#1D429B' : '#F1F2F5',
                color:      canal === tab.key ? '#FFFFFF'  : '#4B4B4E',
                transition: 'all 0.15s',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Mes selector */}
        <select
          value={month}
          onChange={e => setMonth(e.target.value)}
          style={{
            padding: '7px 12px',
            borderRadius: 10,
            border: '1px solid #E4E5E9',
            background: '#F5F6FA',
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 12,
            fontWeight: 600,
            color: '#21274E',
            cursor: 'pointer',
          }}
        >
          {months.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* Estado */}
      {loading && (
        <p style={{ fontFamily: "'Montserrat', sans-serif", color: '#8A8A8F', fontSize: 13 }}>
          Cargando datos…
        </p>
      )}
      {error && (
        <div style={{
          borderRadius: 12, background: '#FEF2F2', border: '1px solid #FCA5A5',
          padding: '12px 16px', color: '#B91C1C', fontSize: 13,
          fontFamily: "'Montserrat', sans-serif",
        }}>
          {error}
        </div>
      )}

      {/* Tabla */}
      {!loading && !error && (
        <div style={{ overflowX: 'auto' }}>
          {rows.length === 0 ? (
            <p style={{
              fontFamily: "'Montserrat', sans-serif", color: '#8A8A8F',
              fontSize: 13, padding: '16px 0',
            }}>
              No hay datos para este canal y mes.
            </p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
              <thead>
                <tr>
                  {[rowLabel, 'Solar 12%', 'Roofing 10%', 'Water 10%', 'Anker 10%', 'Total'].map((h, i) => (
                    <th key={h} style={{
                      ...TH,
                      textAlign: i === 0 ? 'left' : 'right',
                      borderRadius: i === 0 ? '10px 0 0 10px' : i === 5 ? '0 10px 10px 0' : undefined,
                    }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={row.name} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFD' }}>
                    <td style={{ ...TD, fontWeight: 600, color: '#21274E' }}>{row.name}</td>
                    {(['solar', 'roofing', 'water', 'anker'] as const).map(cat => (
                      <td key={cat} style={{
                        ...TD,
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        color: row[cat] > 0 ? '#1FA971' : '#C5C5C9',
                      }}>
                        {row[cat] > 0 ? fmt(row[cat]) : '—'}
                      </td>
                    ))}
                    <td style={{
                      ...TD,
                      textAlign: 'right',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color: '#1D429B',
                    }}>
                      {fmt(row.total)}
                    </td>
                  </tr>
                ))}
                {/* Fila de totales */}
                <tr style={{ background: '#F5F6FA', borderTop: '2px solid #E4E5E9' }}>
                  <td style={{ ...TD, fontWeight: 800, color: '#21274E', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Total del mes
                  </td>
                  {(['solar', 'roofing', 'water', 'anker'] as const).map(cat => (
                    <td key={cat} style={{
                      ...TD,
                      textAlign: 'right',
                      fontWeight: 700,
                      fontVariantNumeric: 'tabular-nums',
                      color: totals[cat] > 0 ? '#1FA971' : '#C5C5C9',
                    }}>
                      {totals[cat] > 0 ? fmt(totals[cat]) : '—'}
                    </td>
                  ))}
                  <td style={{
                    ...TD,
                    textAlign: 'right',
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: '#1D429B',
                    fontSize: 15,
                  }}>
                    {fmt(totals.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
