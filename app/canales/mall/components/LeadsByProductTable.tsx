'use client'

import type { MallBoothLeadDetail } from '@/lib/redshift'
import { BOOTH_REGIONS, BOOTH_REGIONS_ORDER } from '@/lib/constants'

const PRODUCTS = [
  'Residential Solar',
  'Commercial Solar',
  'Roofing',
  'PPS',
  'Water Products',
]

const PRODUCT_COLORS: Record<string, string> = {
  'Residential Solar': '#5B8CFF',
  'Commercial Solar':  '#22C7E6',
  'Roofing':           '#1FD79B',
  'PPS':               '#FB9F3A',
  'Water Products':    '#FF4D9D',
  'Sin venta':         '#8A8A8F',
}

const PRODUCT_LABELS: Record<string, string> = {
  'Residential Solar': 'Res. Solar',
  'Commercial Solar':  'Com. Solar',
  'Roofing':           'Roofing',
  'PPS':               'PPS',
  'Water Products':    'Water',
  'Sin venta':         'Sin venta',
}

const TH: React.CSSProperties = {
  padding: '8px 14px',
  background: '#F5F6FA',
  border: '1px solid #E4E5E9',
  fontWeight: 700,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#4B4B4E',
  fontFamily: "'Montserrat', sans-serif",
  whiteSpace: 'nowrap',
  textAlign: 'center',
}

const TD: React.CSSProperties = {
  padding: '8px 14px',
  border: '1px solid #E4E5E9',
  fontSize: 13,
  fontFamily: "'Montserrat', sans-serif",
  textAlign: 'center',
}

interface Props {
  leads: MallBoothLeadDetail[]
}

export default function LeadsByProductTable({ leads }: Props) {
  if (leads.length === 0) {
    return <p style={{ fontSize: 13, color: '#8A8A8F', fontFamily: "'Montserrat',sans-serif" }}>No hay leads en el período seleccionado.</p>
  }

  // Build matrix: product → region → count
  const matrix: Record<string, Record<string, number>> = {}
  const displayProducts = [...PRODUCTS, 'Sin venta']

  for (const p of displayProducts) {
    matrix[p] = {}
    for (const r of BOOTH_REGIONS_ORDER) matrix[p][r] = 0
  }

  for (const l of leads) {
    const product = l.dealPipeline ?? 'Sin venta'
    const region  = BOOTH_REGIONS[l.location] ?? null
    if (!region) continue
    if (!matrix[product]) matrix[product] = {}
    matrix[product][region] = (matrix[product][region] ?? 0) + 1
  }

  // Row and column totals
  function rowTotal(product: string) {
    return Object.values(matrix[product] ?? {}).reduce((s, n) => s + n, 0)
  }
  function colTotal(region: string) {
    return displayProducts.reduce((s, p) => s + (matrix[p]?.[region] ?? 0), 0)
  }
  const grandTotal = leads.length

  // Max per product for % bar
  const maxCell = Math.max(1, ...displayProducts.flatMap(p => Object.values(matrix[p] ?? {})))

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 13, minWidth: 480 }}>
        <thead>
          <tr>
            <th style={{ ...TH, textAlign: 'left', minWidth: 120 }}>Producto</th>
            {BOOTH_REGIONS_ORDER.map(r => (
              <th key={r} style={TH}>{r}</th>
            ))}
            <th style={{ ...TH, background: '#EEF1FB', color: '#1D429B' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {displayProducts.map((product, pi) => {
            const total = rowTotal(product)
            if (total === 0) return null
            const color = PRODUCT_COLORS[product] ?? '#8A8A8F'
            const label = PRODUCT_LABELS[product] ?? product
            const rowBg = pi % 2 === 0 ? '#FFFFFF' : '#F9FAFC'
            return (
              <tr key={product}>
                <td style={{
                  ...TD,
                  textAlign: 'left',
                  fontWeight: 700,
                  padding: '8px 12px',
                  background: rowBg,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: 3,
                      background: color,
                      flexShrink: 0,
                    }} />
                    <span style={{ color: '#21274E' }}>{label}</span>
                  </div>
                </td>
                {BOOTH_REGIONS_ORDER.map(region => {
                  const count = matrix[product]?.[region] ?? 0
                  const barPct = count > 0 ? Math.round((count / maxCell) * 100) : 0
                  return (
                    <td key={region} style={{ ...TD, background: rowBg, position: 'relative', minWidth: 80 }}>
                      {count > 0 ? (
                        <>
                          <div style={{
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            width: `${barPct}%`,
                            height: 3,
                            background: color,
                            borderRadius: '0 0 0 0',
                            opacity: 0.5,
                          }} />
                          <span style={{ fontWeight: 700, color: '#21274E', position: 'relative', zIndex: 1 }}>{count}</span>
                        </>
                      ) : (
                        <span style={{ color: '#D0D2D9' }}>—</span>
                      )}
                    </td>
                  )
                })}
                <td style={{
                  ...TD,
                  fontWeight: 700,
                  background: pi % 2 === 0 ? '#F0F3FC' : '#EAF0FF',
                  color: color,
                }}>
                  {total}
                </td>
              </tr>
            )
          })}

          {/* Totals row */}
          <tr>
            <td style={{
              ...TD,
              textAlign: 'left',
              fontWeight: 700,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#21274E',
              background: '#EEF1FB',
              padding: '8px 12px',
            }}>
              Total
            </td>
            {BOOTH_REGIONS_ORDER.map(region => (
              <td key={region} style={{ ...TD, fontWeight: 700, color: '#1D429B', background: '#EEF1FB' }}>
                {colTotal(region) || '—'}
              </td>
            ))}
            <td style={{ ...TD, fontWeight: 700, color: '#FFFFFF', background: '#1D429B' }}>
              {grandTotal}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
