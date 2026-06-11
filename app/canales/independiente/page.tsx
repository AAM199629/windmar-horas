import StipTurnosView from '@/components/StipTurnosView'

export const dynamic = 'force-dynamic'

export default async function IndependientePage() {
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 26, fontFamily: "'Montserrat', sans-serif" }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#1D429B', marginBottom: 6 }}>
            CANAL · TURNOS EN TIEMPO REAL · STIP
          </p>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(40px, 5vw, 60px)', lineHeight: 0.9, margin: 0 }}>
            <span style={{ color: '#21274E' }}>Canal </span>
            <span style={{ color: '#F89B24' }}>Independiente &amp; Eventos</span>
          </h1>
        </div>
      </div>
      <StipTurnosView canal="independiente" />
    </div>
  )
}
