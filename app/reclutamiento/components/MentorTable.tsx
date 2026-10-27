'use client'

// Tabla de mentores.
//
// NO lleva un "% de asistencia". Medido sobre los citados de jul–oct 2026, el
// mentor se asigna DESPUÉS del Solar en 282 de 321 casos; de los 24 que sí
// tenían mentor asignado antes, no asistió ninguno. O sea que un "% asist."
// por mentor sale ~100% por construcción —  la asignación es consecuencia de
// haber asistido, no causa— y se leía como si midiera al mentor.
//
// Lo que sí es del mentor son los pasos posteriores a la asignación: la
// reunión, el paso a Sales Team, la graduación y la primera venta.

export interface MentorRowView {
  mentor: string
  asignados: number
  asistieron: number
  reunionMentor: number
  salesTeam: number
  graduados: number
  conVenta: number
}

const BORDER = '#E7ECF6'
const ROWLINE = '#EDF0F5'
const ZEBRA = '#F8FAFD'
const TOTALROW = '#EFF3FA'

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

interface MentorTableProps {
  rows: MentorRowView[]
  /** Cuando la data viene del fixture no hay link a Sales Team, así que
   *  graduados y ventas no se pueden calcular. */
  outcomesDisponibles: boolean
}

export default function MentorTable({ rows, outcomesDisponibles }: MentorTableProps) {
  if (!rows.length) return <p style={{ color: '#8A8A8F', fontSize: 13 }}>Sin mentores en este rango.</p>

  const tot = rows.reduce((a, r) => ({
    asignados: a.asignados + r.asignados,
    asistieron: a.asistieron + r.asistieron,
    reunionMentor: a.reunionMentor + r.reunionMentor,
    salesTeam: a.salesTeam + r.salesTeam,
    graduados: a.graduados + r.graduados,
    conVenta: a.conVenta + r.conVenta,
  }), { asignados: 0, asistieron: 0, reunionMentor: 0, salesTeam: 0, graduados: 0, conVenta: 0 })

  const dash = (n: number) => (outcomesDisponibles ? n.toLocaleString('en-US') : '—')

  return (
    <>
    <div style={{ overflowX: 'auto', border: `1px solid ${BORDER}`, borderRadius: 16 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720 }}>
        <thead>
          <tr>
            <Th>Mentor</Th>
            <Th align="right" title="Reclutas de este Solar que tienen a este mentor asignado">Asignados</Th>
            <Th align="right" title="De sus asignados, cuántos asistieron al Solar. Casi siempre son todos: el mentor se asigna después de que la persona aparece.">Asistieron</Th>
            <Th align="right" title="Reunión con mentor — el primer paso que sí depende del mentor">Reunión</Th>
            <Th align="right">Sales Team</Th>
            <Th align="right">Graduados</Th>
            <Th align="right">Con 1ra venta</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.mentor} style={{ background: i % 2 ? ZEBRA : '#fff' }}>
              <Td bold>{r.mentor}</Td>
              <Td align="right">{r.asignados.toLocaleString('en-US')}</Td>
              <Td align="right">{r.asistieron.toLocaleString('en-US')}</Td>
              <Td align="right" muted={!r.reunionMentor}>{r.reunionMentor ? r.reunionMentor.toLocaleString('en-US') : '—'}</Td>
              <Td align="right">{r.salesTeam.toLocaleString('en-US')}</Td>
              <Td align="right">{dash(r.graduados)}</Td>
              <Td align="right">{dash(r.conVenta)}</Td>
            </tr>
          ))}
          <tr style={{ background: TOTALROW }}>
            <Td bold>Total</Td>
            <Td align="right" bold>{tot.asignados.toLocaleString('en-US')}</Td>
            <Td align="right" bold>{tot.asistieron.toLocaleString('en-US')}</Td>
            <Td align="right" bold>{tot.reunionMentor ? tot.reunionMentor.toLocaleString('en-US') : '—'}</Td>
            <Td align="right" bold>{tot.salesTeam.toLocaleString('en-US')}</Td>
            <Td align="right" bold>{dash(tot.graduados)}</Td>
            <Td align="right" bold>{dash(tot.conVenta)}</Td>
          </tr>
        </tbody>
      </table>
    </div>

    <p style={{ fontSize: 10.5, color: '#8A8A8F', marginTop: 12, lineHeight: 1.5, fontFamily: "'Montserrat', sans-serif" }}>
      El mentor se asigna <strong>después</strong> del Solar en 282 de 321 casos (jul–oct 2026),
      así que &quot;Asignados&quot; es la carga que le queda a cada mentor una vez la persona
      apareció, no una predicción de asistencia. La fila <strong>Sin mentor</strong> son los
      citados que nunca llegaron a asignación.
    </p>
    </>
  )
}
