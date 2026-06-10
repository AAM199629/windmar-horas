'use client'

const MONTH_LABELS: Record<number, string> = {
  1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic',
}

interface TrendStripProps {
  months: number[]
  values: number[]
}

function AreaSpark({ values, width = 720, height = 92 }: {
  values: number[]
  width?: number
  height?: number
}) {
  if (values.length < 2) return null
  const max = Math.max(...values, 1)
  const pad = 8
  const w = width - pad * 2
  const h = height - pad * 2

  const pts = values.map((v, i) => [
    pad + (i / (values.length - 1)) * w,
    pad + (1 - v / max) * h,
  ])

  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ')

  const areaPath = [
    `M${pts[0][0].toFixed(1)},${height}`,
    ...pts.map(p => `L${p[0].toFixed(1)},${p[1].toFixed(1)}`),
    `L${pts[pts.length - 1][0].toFixed(1)},${height}`,
    'Z',
  ].join(' ')

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1D429B" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#1D429B" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#sparkGrad)" />
      <path d={linePath} fill="none" stroke="#1D429B" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#1D429B" />
      ))}
    </svg>
  )
}

export default function TrendStrip({ months, values }: TrendStripProps) {
  if (months.length === 0) return null

  const peakIdx = values.reduce((best, v, i) => (v > (values[best] ?? 0) ? i : best), 0)
  const peakMonth = months[peakIdx]
  const peakValue = values[peakIdx] ?? 0
  const rangeLabel = `${MONTH_LABELS[months[0]]} → ${MONTH_LABELS[months[months.length - 1]]}`

  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 22,
      boxShadow: '0 8px 24px rgba(33,39,78,.10)',
      padding: '20px 28px',
      fontFamily: "'Montserrat', sans-serif",
      display: 'flex',
      gap: 28,
      alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      {/* Izquierda */}
      <div style={{ minWidth: 160 }}>
        <p style={{
          fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.14em', color: '#1D429B', marginBottom: 4,
        }}>
          VOLUMEN MENSUAL · VENTAS
        </p>
        <p style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 40,
          lineHeight: 1,
          color: '#21274E',
          marginBottom: 4,
        }}>
          {rangeLabel}
        </p>
        <p style={{ fontSize: 13, color: '#8A8A8F' }}>
          pico en{' '}
          <strong style={{ color: '#F89B24' }}>
            {MONTH_LABELS[peakMonth]} · {peakValue}
          </strong>
        </p>
      </div>

      {/* Centro — sparkline */}
      <div style={{ flex: 1, minWidth: 200, maxWidth: 760 }}>
        <AreaSpark values={values} />
      </div>

      {/* Derecha — columnas de valores */}
      <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
        {months.map((m, i) => (
          <div key={m} style={{ textAlign: 'center', minWidth: 36 }}>
            <p style={{
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 20,
              color: m === peakMonth ? '#F89B24' : '#21274E',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {values[i] ?? 0}
            </p>
            <p style={{ fontSize: 11, color: '#8A8A8F', marginTop: 2 }}>
              {MONTH_LABELS[m]}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
