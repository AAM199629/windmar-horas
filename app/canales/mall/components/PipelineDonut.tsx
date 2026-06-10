'use client'

interface Segment {
  name: string
  value: number
  color: string
}

interface PipelineDonutProps {
  segments: Segment[]
  total: number
  animOn: boolean
}

const SIZE = 200
const THICKNESS = 26
const R = (SIZE - THICKNESS) / 2
const CIRC = 2 * Math.PI * R
// Dejamos un pequeño gap entre segmentos
const GAP = 4

export default function PipelineDonut({ segments, total, animOn }: PipelineDonutProps) {
  const nonZero = segments.filter(s => s.value > 0)
  const totalVal = nonZero.reduce((s, seg) => s + seg.value, 0) || 1

  // Calcular offset de cada segmento
  let accumulated = 0
  const arcs = nonZero.map(seg => {
    const fraction = seg.value / totalVal
    const arcLen = Math.max(fraction * (CIRC - GAP * nonZero.length), 2)
    const offset = CIRC - accumulated
    accumulated += arcLen + GAP
    return { ...seg, arcLen, offset }
  })

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif" }}>
      {/* SVG Donut */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
        <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
          <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
            {/* Track */}
            <circle
              cx={SIZE / 2} cy={SIZE / 2} r={R}
              fill="none"
              stroke="#EEF3FD"
              strokeWidth={THICKNESS}
            />
            {/* Segmentos */}
            {arcs.map(arc => (
              <circle
                key={arc.name}
                cx={SIZE / 2} cy={SIZE / 2} r={R}
                fill="none"
                stroke={arc.color}
                strokeWidth={THICKNESS}
                strokeLinecap="round"
                strokeDasharray={`${animOn ? arc.arcLen : arc.arcLen} ${CIRC - arc.arcLen}`}
                strokeDashoffset={arc.offset}
                style={{ transition: animOn ? 'stroke-dasharray 1s ease' : undefined }}
              />
            ))}
          </svg>

          {/* Centro */}
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <span style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 40,
              color: '#21274E',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {total.toLocaleString('es-PR')}
            </span>
            <span style={{ fontSize: 11, color: '#8A8A8F', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Oportunidades
            </span>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {segments.map(seg => (
          <div key={seg.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 10, height: 10,
              borderRadius: 3,
              background: seg.color,
              flexShrink: 0,
            }} />
            <span style={{ flex: 1, fontSize: 13, color: '#4B4B4E' }}>{seg.name}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: '#21274E', fontVariantNumeric: 'tabular-nums' }}>
              {seg.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
