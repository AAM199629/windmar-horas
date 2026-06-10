'use client'

// Colores exactos del handoff (por posición en el ranking)
const LOCATION_HUES = [
  '#5B8CFF', '#3D6BFF', '#22C7E6', '#1FD79B', '#9B6BFF',
  '#FB9F3A', '#FF5D6C', '#FF4D9D', '#A4D932', '#34B3F1',
  '#15B6A0', '#E07B2E', '#B255F0', '#E14BD6',
]

interface LocationBarsProps {
  items: [string, number][]
  maxSales: number
  animOn: boolean
  onClickBar?: (loc: string) => void
}

const BAR_ANIMATION = `
@keyframes wmBarFill {
  from { width: 0 }
  to { width: var(--bar-w) }
}
@media (prefers-reduced-motion: reduce) {
  .wm-bar-fill { animation: none !important; }
}
`

export default function LocationBars({ items, maxSales, animOn, onClickBar }: LocationBarsProps) {
  if (items.length === 0) return null

  return (
    <>
      <style>{BAR_ANIMATION}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {items.map(([loc, count], i) => {
          const pct = Math.max((count / maxSales) * 100, 3)
          const hue = LOCATION_HUES[i % LOCATION_HUES.length]
          const label = loc
            .replace('Malls - ', '')
            .replace('Home Depot - ', 'Home Depot · ')

          return (
            <div
              key={loc}
              style={{
                display: 'grid',
                gridTemplateColumns: '230px 1fr 56px',
                gap: 18,
                alignItems: 'center',
                cursor: onClickBar ? 'pointer' : undefined,
              }}
              onClick={() => onClickBar?.(loc)}
            >
              {/* Nombre */}
              <span style={{
                fontSize: 14,
                fontWeight: 600,
                color: '#4B4B4E',
                textAlign: 'right',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                fontFamily: "'Montserrat', sans-serif",
              }} title={label}>
                {label}
              </span>

              {/* Track */}
              <div style={{
                height: 28,
                borderRadius: 999,
                background: '#EEF3FD',
                overflow: 'hidden',
              }}>
                <div
                  className="wm-bar-fill"
                  style={{
                    height: '100%',
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${hue}, ${hue}dd)`,
                    boxShadow: `0 2px 12px ${hue}55`,
                    width: `${pct}%`,
                    ['--bar-w' as string]: `${pct}%`,
                    animation: animOn
                      ? `wmBarFill 1200ms cubic-bezier(.2,.8,.2,1) ${i * 55}ms both`
                      : undefined,
                  } as React.CSSProperties}
                />
              </div>

              {/* Número */}
              <span style={{
                fontSize: 22,
                fontWeight: 800,
                color: '#21274E',
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                fontFamily: "'Montserrat', sans-serif",
              }}>
                {count}
              </span>
            </div>
          )
        })}
      </div>
    </>
  )
}
