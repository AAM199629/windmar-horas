'use client'

import type { MallBoothLeadDetail } from '@/lib/redshift'
import { LOCATION_ORDER, getSellerRegion } from '@/lib/constants'

const LOC_SHORT: Record<string, string> = {
  'Home Depot - Caguas':           'Caguas',
  'Home Depot - Colobos':          'Colobos',
  'Home Depot - Escorial':         'Escorial',
  'Home Depot - Hatillo':          'Hatillo',
  'Home Depot - Humacao':          'Humacao',
  'Home Depot - Mayaguez':         'Mayagüez',
  'Home Depot - Montehiedra':      'Montehiedra',
  'Home Depot - Plaza del Sol':    'Pl. del Sol',
  'Home Depot - Ponce':            'Ponce',
  'Home Depot - Rexville':         'Rexville',
  'Malls - Plaza las Americas':    'Pl. Américas',
  'Malls - Plaza del Caribe':      'Pl. Caribe',
  'Malls - Santa Rosa':            'Santa Rosa',
  'Malls - Aguadilla Mall':        'Aguadilla',
}

const REGION_ORDER = ['San Juan I y III', 'San Juan II', 'Ponce', 'Hatillo', 'Mayagüez', 'Sin región']

const REGION_COLORS: Record<string, string> = {
  'San Juan I y III': '#1D429B',
  'San Juan II':      '#2E6BC4',
  'Ponce':            '#E87722',
  'Hatillo':          '#5B8CFF',
  'Mayagüez':         '#7C3AED',
  'Sin región':       '#8A8A8F',
}

const TH: React.CSSProperties = {
  border: '1px solid #E4E5E9',
  fontWeight: 700,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#4B4B4E',
  fontFamily: "'Montserrat', sans-serif",
  background: '#F5F6FA',
}

const TD: React.CSSProperties = {
  padding: '6px 8px',
  border: '1px solid #E4E5E9',
  fontSize: 12,
  fontFamily: "'Montserrat', sans-serif",
  textAlign: 'center',
}

interface Props {
  leads: MallBoothLeadDetail[]
  onClickCell: (leads: MallBoothLeadDetail[], title: string) => void
}

export default function LeadsBySellerTable({ leads, onClickCell }: Props) {
  if (leads.length === 0) {
    return <p style={{ fontSize: 13, color: '#8A8A8F', fontFamily: "'Montserrat',sans-serif" }}>No hay leads en el período seleccionado.</p>
  }

  // Build seller data: name → { locMap, ciudad, region }
  const sellerData: Record<string, { locMap: Record<string, MallBoothLeadDetail[]>; region: string }> = {}

  for (const l of leads) {
    if (!sellerData[l.registradoPor]) {
      sellerData[l.registradoPor] = {
        locMap: {},
        region: getSellerRegion(l.ciudad),
      }
    }
    const sd = sellerData[l.registradoPor]
    if (!sd.locMap[l.location]) sd.locMap[l.location] = []
    sd.locMap[l.location].push(l)
  }

  // Group and sort sellers by region, then by total leads desc
  const byRegion: Record<string, string[]> = {}
  for (const region of REGION_ORDER) byRegion[region] = []
  for (const [name, sd] of Object.entries(sellerData)) {
    const r = sd.region
    if (!byRegion[r]) byRegion[r] = []
    byRegion[r].push(name)
  }
  for (const names of Object.values(byRegion)) {
    names.sort((a, b) => {
      const totalA = Object.values(sellerData[a].locMap).reduce((s, arr) => s + arr.length, 0)
      const totalB = Object.values(sellerData[b].locMap).reduce((s, arr) => s + arr.length, 0)
      return totalB - totalA
    })
  }

  // Column totals (per location)
  const colTotals: Record<string, number> = {}
  for (const loc of LOCATION_ORDER) {
    colTotals[loc] = leads.filter(l => l.location === loc).length
  }
  const grandTotal = leads.length

  // Active locations (at least 1 lead)
  const activeLocs = LOCATION_ORDER.filter(loc => colTotals[loc] > 0)

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, minWidth: 500 }}>
        <thead>
          <tr>
            <th style={{ ...TH, minWidth: 160, textAlign: 'left', padding: '8px 10px', position: 'sticky', left: 0, zIndex: 2 }}>
              Vendedor
            </th>
            {activeLocs.map(loc => (
              <th key={loc} style={{ ...TH, padding: '4px 6px', minWidth: 40 }}>
                <div style={{
                  writingMode: 'vertical-rl',
                  transform: 'rotate(180deg)',
                  height: 90,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-start',
                  fontSize: 10,
                  paddingBottom: 4,
                }}>
                  {LOC_SHORT[loc] ?? loc}
                </div>
              </th>
            ))}
            <th style={{ ...TH, minWidth: 52, textAlign: 'center', padding: '8px 10px', background: '#EEF1FB', color: '#1D429B' }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {REGION_ORDER.map(region => {
            const sellers = byRegion[region]
            if (!sellers || sellers.length === 0) return null
            const regionColor = REGION_COLORS[region] ?? '#8A8A8F'
            return (
              <>
                {/* Region separator row */}
                <tr key={`region-${region}`}>
                  <td
                    colSpan={activeLocs.length + 2}
                    style={{
                      padding: '6px 12px',
                      background: regionColor,
                      color: '#FFFFFF',
                      fontWeight: 700,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                      fontFamily: "'Montserrat', sans-serif",
                      position: 'sticky',
                      left: 0,
                    }}
                  >
                    {region}
                  </td>
                </tr>

                {sellers.map((name, si) => {
                  const { locMap } = sellerData[name]
                  const total = Object.values(locMap).reduce((s, a) => s + a.length, 0)
                  const rowBg = si % 2 === 0 ? '#FFFFFF' : '#F9FAFC'
                  return (
                    <tr key={name}>
                      <td style={{
                        ...TD,
                        textAlign: 'left',
                        padding: '6px 10px',
                        fontWeight: 600,
                        color: '#21274E',
                        whiteSpace: 'nowrap',
                        position: 'sticky',
                        left: 0,
                        background: rowBg,
                        zIndex: 1,
                        minWidth: 160,
                      }}>
                        {name}
                      </td>
                      {activeLocs.map(loc => {
                        const cellLeads = locMap[loc] ?? []
                        const count = cellLeads.length
                        return (
                          <td
                            key={loc}
                            onClick={() => count > 0 && onClickCell(cellLeads, `${name} — ${LOC_SHORT[loc] ?? loc}`)}
                            title={count > 0 ? `${count} lead${count !== 1 ? 's' : ''}` : undefined}
                            style={{
                              ...TD,
                              background: count > 0 ? `${regionColor}18` : rowBg,
                              color: count > 0 ? regionColor : '#C0C3CF',
                              fontWeight: count > 0 ? 700 : 400,
                              cursor: count > 0 ? 'pointer' : 'default',
                              transition: 'filter .12s',
                            }}
                            onMouseEnter={e => { if (count > 0) (e.currentTarget as HTMLElement).style.filter = 'brightness(0.92)' }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = '' }}
                          >
                            {count > 0 ? count : ''}
                          </td>
                        )
                      })}
                      <td style={{ ...TD, fontWeight: 700, color: '#1D429B', background: si % 2 === 0 ? '#F0F3FC' : '#EAF0FF' }}>
                        {total}
                      </td>
                    </tr>
                  )
                })}
              </>
            )
          })}

          {/* Totals row */}
          <tr style={{ background: '#F5F6FA' }}>
            <td style={{
              ...TD,
              textAlign: 'left',
              padding: '7px 10px',
              fontWeight: 700,
              color: '#21274E',
              position: 'sticky',
              left: 0,
              background: '#EEF1FB',
              zIndex: 1,
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>
              Total
            </td>
            {activeLocs.map(loc => (
              <td key={loc} style={{ ...TD, fontWeight: 700, color: '#1D429B', background: '#EEF1FB' }}>
                {colTotals[loc] || ''}
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
