'use client'

import type { MallBoothLeadDetail } from '@/lib/redshift'
import { LOCATION_ORDER } from '@/lib/constants'

const DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

const LOC_SHORT: Record<string, string> = {
  'Home Depot - Caguas':           'HD Caguas',
  'Home Depot - Colobos':          'HD Colobos',
  'Home Depot - Escorial':         'HD Escorial',
  'Home Depot - Hatillo':          'HD Hatillo',
  'Home Depot - Humacao':          'HD Humacao',
  'Home Depot - Mayaguez':         'HD Mayagüez',
  'Home Depot - Montehiedra':      'HD Montehiedra',
  'Home Depot - Plaza del Sol':    'HD Pl. del Sol',
  'Home Depot - Ponce':            'HD Ponce',
  'Home Depot - Rexville':         'HD Rexville',
  'Malls - Plaza las Americas':    'Pl. Américas',
  'Malls - Plaza del Caribe':      'Pl. Caribe',
  'Malls - Santa Rosa':            'Santa Rosa',
  'Malls - Aguadilla Mall':        'Aguadilla Mall',
}

const TH: React.CSSProperties = {
  padding: '8px 10px',
  background: '#F5F6FA',
  border: '1px solid #E4E5E9',
  fontWeight: 700,
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: '#4B4B4E',
  fontFamily: "'Montserrat', sans-serif",
  whiteSpace: 'nowrap',
}

const TD: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid #E4E5E9',
  fontSize: 12,
  fontFamily: "'Montserrat', sans-serif",
}

interface Props {
  leads: MallBoothLeadDetail[]
  onClickCell: (leads: MallBoothLeadDetail[], title: string) => void
}

export default function LeadsByDayTable({ leads, onClickCell }: Props) {
  if (leads.length === 0) {
    return <p style={{ fontSize: 13, color: '#8A8A8F', fontFamily: "'Montserrat',sans-serif" }}>No hay leads en el período seleccionado.</p>
  }

  // Build matrix: location → date → leads
  const matrix: Record<string, Record<string, MallBoothLeadDetail[]>> = {}
  const dateSet = new Set<string>()

  for (const l of leads) {
    if (!matrix[l.location]) matrix[l.location] = {}
    if (!matrix[l.location][l.createdDate]) matrix[l.location][l.createdDate] = []
    matrix[l.location][l.createdDate].push(l)
    dateSet.add(l.createdDate)
  }

  const dates = Array.from(dateSet).sort()

  let maxCount = 1
  for (const locMap of Object.values(matrix)) {
    for (const dayLeads of Object.values(locMap)) {
      if (dayLeads.length > maxCount) maxCount = dayLeads.length
    }
  }

  function cellBg(count: number): string {
    if (count === 0) return '#F5F6FA'
    const t = Math.min(1, count / maxCount)
    const r = Math.round(237 - (237 - 13)  * t)
    const g = Math.round(240 - (240 - 66)  * t)
    const b = Math.round(250 - (250 - 155) * t)
    return `rgb(${r},${g},${b})`
  }

  function cellColor(count: number): string {
    if (count === 0) return '#C0C3CF'
    return Math.min(1, count / maxCount) > 0.4 ? '#FFFFFF' : '#21274E'
  }

  function dayLabel(dateStr: string) {
    const d = new Date(dateStr + 'T12:00:00')
    return { dow: DAYS_ES[d.getDay()], date: `${d.getDate()}/${d.getMonth() + 1}` }
  }

  const rows = LOCATION_ORDER.filter(loc => leads.some(l => l.location === loc))

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: 12, minWidth: 500 }}>
        <thead>
          <tr>
            <th style={{ ...TH, minWidth: 130, textAlign: 'left', position: 'sticky', left: 0, zIndex: 2 }}>
              Ubicación
            </th>
            {dates.map(d => {
              const { dow, date } = dayLabel(d)
              return (
                <th key={d} style={{ ...TH, minWidth: 54, textAlign: 'center', padding: '6px 8px' }}>
                  <span style={{ display: 'block', fontSize: 9, color: '#8A8A8F', fontWeight: 500, marginBottom: 2 }}>{dow}</span>
                  <span style={{ display: 'block', fontSize: 11, color: '#21274E', fontWeight: 700 }}>{date}</span>
                </th>
              )
            })}
            <th style={{ ...TH, minWidth: 52, textAlign: 'center', color: '#1D429B', background: '#EEF1FB' }}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((loc, ri) => {
            const locMap = matrix[loc] ?? {}
            const total = Object.values(locMap).reduce((s, a) => s + a.length, 0)
            const rowBg = ri % 2 === 0 ? '#FFFFFF' : '#F9FAFC'
            return (
              <tr key={loc}>
                <td style={{
                  ...TD,
                  position: 'sticky',
                  left: 0,
                  background: rowBg,
                  zIndex: 1,
                  fontWeight: 600,
                  color: '#21274E',
                  whiteSpace: 'nowrap',
                  minWidth: 130,
                }}>
                  {LOC_SHORT[loc] ?? loc}
                </td>
                {dates.map(d => {
                  const dayLeads = locMap[d] ?? []
                  const count = dayLeads.length
                  return (
                    <td
                      key={d}
                      onClick={() => count > 0 && onClickCell(dayLeads, `${LOC_SHORT[loc] ?? loc} — ${d}`)}
                      title={count > 0 ? `${count} lead${count !== 1 ? 's' : ''}` : undefined}
                      style={{
                        ...TD,
                        textAlign: 'center',
                        background: cellBg(count),
                        color: cellColor(count),
                        fontWeight: count > 0 ? 700 : 400,
                        cursor: count > 0 ? 'pointer' : 'default',
                        transition: 'filter .12s',
                        minWidth: 54,
                        padding: '7px 6px',
                      }}
                      onMouseEnter={e => { if (count > 0) (e.currentTarget as HTMLElement).style.filter = 'brightness(1.12)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.filter = '' }}
                    >
                      {count > 0 ? count : ''}
                    </td>
                  )
                })}
                <td style={{
                  ...TD,
                  textAlign: 'center',
                  fontWeight: 700,
                  color: '#1D429B',
                  background: ri % 2 === 0 ? '#F0F3FC' : '#EAF0FF',
                }}>
                  {total > 0 ? total : '—'}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
