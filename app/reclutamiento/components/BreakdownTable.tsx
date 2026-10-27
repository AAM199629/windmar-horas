'use client'

// Desglose del funnel anclado, abierto por source o por localidad. Usa las
// mismas cohortes que los KPIs de arriba, así que los totales cuadran.
//
// Ojo con la columna "Cita %": cruza la ventana de llamadas contra los citados
// para ese Solar, que son poblaciones distintas. Va marcada con ⁓ igual que en
// el funnel para que no se lea como una tasa de caída.

export interface BreakdownRowView {
  key: string
  llamados: number
  citados: number
  asistieron: number
  noShows: number
  fastTrack: number
  conReunion: number
  salesTeam: number
  showRate: number | null
  tasaCita: number | null
}

const ROWLINE = '#EDF0F5'
const ZEBRA = '#F8FAFD'
const TOTALROW = '#EFF3FA'
const BORDER = '#E7ECF6'

function Th({ children, align = 'left', title }: { children: React.ReactNode; align?: 'left' | 'right'; title?: string }) {
  return (
    <th title={title} style={{
      textAlign: align, padding: '10px 12px', fontSize: 10.5, fontWeight: 800,
      textTransform: 'uppercase', letterSpacing: '.1em', color: '#fff',
      background: '#2E3866', whiteSpace: 'nowrap',
    }}>{children}</th>
  )
}

function Td({ children, align = 'left', bold, muted }: {
  children: React.ReactNode; align?: 'left' | 'right'; bold?: boolean; muted?: boolean
}) {
  return (
    <td style={{
      textAlign: align, padding: '9px 12px', fontSize: 12.5,
      color: muted ? '#8A8A8F' : '#21274E', fontWeight: bold ? 700 : 500,
      borderBottom: `1px solid ${ROWLINE}`, whiteSpace: 'nowrap',
    }}>{children}</td>
  )
}

const n = (x: number) => x.toLocaleString('en-US')

/** Semáforo del show rate: es la métrica que decide si el Solar se llenó. */
function ShowPct({ v }: { v: number | null }) {
  if (v === null) return <span style={{ color: '#8A8A8F' }}>—</span>
  const color = v >= 40 ? '#1E9E62' : v >= 25 ? '#F89B24' : '#D64545'
  return (
    <span style={{
      display: 'inline-block', minWidth: 44, textAlign: 'center',
      fontSize: 11.5, fontWeight: 700, color: '#fff', background: color,
      borderRadius: 999, padding: '2px 8px',
    }}>{v.toFixed(0)}%</span>
  )
}

interface BreakdownTableProps {
  rows: BreakdownRowView[]
  /** Etiqueta de la primera columna (Source / Localidad). */
  dimLabel: string
  outcomesDisponibles: boolean
  /** Aviso cuando la dimensión no tiene datos reales todavía. */
  emptyHint?: string
}

export default function BreakdownTable({ rows, dimLabel, outcomesDisponibles, emptyHint }: BreakdownTableProps) {
  if (!rows.length) {
    return <p style={{ color: '#8A8A8F', fontSize: 13 }}>Sin datos para este corte.</p>
  }

  const tot = rows.reduce((a, r) => ({
    llamados: a.llamados + r.llamados,
    citados: a.citados + r.citados,
    asistieron: a.asistieron + r.asistieron,
    noShows: a.noShows + r.noShows,
    fastTrack: a.fastTrack + r.fastTrack,
    conReunion: a.conReunion + r.conReunion,
    salesTeam: a.salesTeam + r.salesTeam,
  }), { llamados: 0, citados: 0, asistieron: 0, noShows: 0, fastTrack: 0, conReunion: 0, salesTeam: 0 })

  const totShow = tot.citados ? (tot.asistieron / tot.citados) * 100 : null
  const totCita = tot.llamados ? (tot.citados / tot.llamados) * 100 : null

  return (
    <>
      {emptyHint && (
        <div style={{
          marginBottom: 14, padding: '11px 14px', borderRadius: 12,
          background: '#FFF8EE', border: '1px solid #F6E2C2',
          fontSize: 11.5, color: '#21274E', lineHeight: 1.5,
        }}>
          {emptyHint}
        </div>
      )}

      <div style={{ overflowX: 'auto', border: `1px solid ${BORDER}`, borderRadius: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
          <thead>
            <tr>
              <Th>{dimLabel}</Th>
              <Th align="right" title="Llamadas hechas dentro de la ventana previa al Solar">Llamadas</Th>
              <Th align="right" title="Cruza la ventana de llamadas contra los citados para este Solar: son poblaciones distintas, no una tasa de caída">Cita %&nbsp;⁓</Th>
              <Th align="right">Citados</Th>
              <Th align="right">Asistieron</Th>
              <Th align="right">No-shows</Th>
              <Th align="right" title="De los citados, cuántos aparecieron">Show %</Th>
              <Th align="right" title="Completaron por fast-track: el mentor dio el Solar directo">Fast-track</Th>
              <Th align="right">Reunión</Th>
              <Th align="right">Sales Team</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.key} style={{ background: i % 2 ? ZEBRA : '#fff' }}>
                <Td bold>{r.key}</Td>
                <Td align="right">{n(r.llamados)}</Td>
                <Td align="right" muted>{r.tasaCita === null ? '—' : `${r.tasaCita.toFixed(0)}%`}</Td>
                <Td align="right">{n(r.citados)}</Td>
                <Td align="right">{n(r.asistieron)}</Td>
                <Td align="right" muted={!r.noShows}>{n(r.noShows)}</Td>
                <Td align="right"><ShowPct v={r.showRate} /></Td>
                <Td align="right" muted={!r.fastTrack}>{r.fastTrack ? n(r.fastTrack) : '—'}</Td>
                <Td align="right" muted={!r.conReunion}>{r.conReunion ? n(r.conReunion) : '—'}</Td>
                <Td align="right" muted={!outcomesDisponibles || !r.salesTeam}>
                  {outcomesDisponibles ? (r.salesTeam ? n(r.salesTeam) : '—') : '—'}
                </Td>
              </tr>
            ))}
            <tr style={{ background: TOTALROW }}>
              <Td bold>Total</Td>
              <Td align="right" bold>{n(tot.llamados)}</Td>
              <Td align="right" bold muted>{totCita === null ? '—' : `${totCita.toFixed(0)}%`}</Td>
              <Td align="right" bold>{n(tot.citados)}</Td>
              <Td align="right" bold>{n(tot.asistieron)}</Td>
              <Td align="right" bold>{n(tot.noShows)}</Td>
              <Td align="right" bold><ShowPct v={totShow} /></Td>
              <Td align="right" bold>{tot.fastTrack ? n(tot.fastTrack) : '—'}</Td>
              <Td align="right" bold>{tot.conReunion ? n(tot.conReunion) : '—'}</Td>
              <Td align="right" bold>{outcomesDisponibles ? n(tot.salesTeam) : '—'}</Td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  )
}
