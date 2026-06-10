'use client'

const MONTH_LABELS: Record<number, string> = {
  1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic',
}

interface CellData {
  ventas: number
  canceladas: number
  dealIds?: string[]
}

interface HeatmapTableProps {
  locations: string[]
  months: number[]
  data: Record<string, Record<number, CellData>>
  locLabel: (loc: string) => string
  onClickCell?: (loc: string, month: number, type: 'ventas' | 'canceladas') => void
  onClickTotal?: (loc: string) => void
  onClickMonthTotal?: (month: number) => void
  onClickGrandTotal?: () => void
}

function cellBg(v: number, maxV: number) {
  if (v === 0 || maxV === 0) return 'transparent'
  const t = Math.min(v / maxV, 1)
  const alpha = 0.06 + t * 0.50
  return `rgba(29,66,155,${alpha.toFixed(3)})`
}

function cellTextColor(v: number, maxV: number): string {
  if (v === 0 || maxV === 0) return '#8A8A8F'
  const t = Math.min(v / maxV, 1)
  return t > 0.55 ? '#FFFFFF' : '#21274E'
}

export default function HeatmapTable({
  locations, months, data, locLabel,
  onClickCell, onClickTotal, onClickMonthTotal, onClickGrandTotal,
}: HeatmapTableProps) {
  // Encontrar el máximo de ventas en todas las celdas para normalizar el color
  let maxV = 1
  for (const loc of locations) {
    for (const m of months) {
      const v = data[loc]?.[m]?.ventas ?? 0
      if (v > maxV) maxV = v
    }
  }

  const th: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    color: '#8A8A8F',
    letterSpacing: '0.08em',
    padding: '8px 6px',
    textAlign: 'center',
    whiteSpace: 'nowrap',
    fontFamily: "'Montserrat', sans-serif",
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontFamily: "'Montserrat', sans-serif" }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: 'left', minWidth: 160, paddingLeft: 8 }}>Ubicación</th>
            {months.map(m => (
              <th key={m} style={{ ...th, minWidth: 72 }}>{MONTH_LABELS[m]}</th>
            ))}
            <th style={{ ...th, color: '#F89B24' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {locations.map(loc => {
            const totalV = months.reduce((s, m) => s + (data[loc]?.[m]?.ventas ?? 0), 0)
            const totalC = months.reduce((s, m) => s + (data[loc]?.[m]?.canceladas ?? 0), 0)

            return (
              <tr key={loc}>
                {/* Nombre */}
                <td style={{
                  padding: '6px 8px',
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#4B4B4E',
                  whiteSpace: 'nowrap',
                  maxWidth: 180,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {locLabel(loc)}
                </td>

                {/* Celdas de mes */}
                {months.map(m => {
                  const v = data[loc]?.[m]?.ventas ?? 0
                  const c = data[loc]?.[m]?.canceladas ?? 0
                  const bg = cellBg(v, maxV)
                  const txtColor = cellTextColor(v, maxV)
                  const cancColor = txtColor === '#FFFFFF' ? '#FFD2D7' : '#E0334B'

                  return (
                    <td key={m} style={{ padding: '4px 3px', textAlign: 'center', verticalAlign: 'middle' }}>
                      <div
                        style={{
                          borderRadius: 9,
                          padding: '8px 4px',
                          background: bg,
                          cursor: v > 0 ? 'pointer' : undefined,
                          minWidth: 44,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 1,
                        }}
                        onClick={() => v > 0 && onClickCell?.(loc, m, 'ventas')}
                      >
                        {v === 0 ? (
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#C8C9CE' }}>·</span>
                        ) : (
                          <span style={{ fontSize: 14, fontWeight: 700, color: txtColor }}>{v}</span>
                        )}
                        {c > 0 && (
                          <span
                            style={{ fontSize: 10, fontWeight: 600, color: cancColor, cursor: 'pointer' }}
                            onClick={e => { e.stopPropagation(); onClickCell?.(loc, m, 'canceladas') }}
                          >
                            -{c}
                          </span>
                        )}
                      </div>
                    </td>
                  )
                })}

                {/* Total */}
                <td style={{ padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                  <div
                    style={{ cursor: totalV > 0 ? 'pointer' : undefined }}
                    onClick={() => totalV > 0 && onClickTotal?.(loc)}
                  >
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#21274E', lineHeight: 1 }}>
                      {totalV || '·'}
                    </div>
                    {totalC > 0 && (
                      <div style={{ fontSize: 10, fontWeight: 600, color: '#E0334B' }}>
                        -{totalC}
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}

          {/* Fila Total */}
          <tr style={{ borderTop: '2px solid #C8C9CE', background: '#F7F8FA' }}>
            <td style={{
              padding: '8px 8px',
              fontSize: 13,
              fontWeight: 700,
              color: '#F89B24',
              fontFamily: "'Montserrat', sans-serif",
            }}>
              Total
            </td>
            {months.map(m => {
              const colV = locations.reduce((s, loc) => s + (data[loc]?.[m]?.ventas ?? 0), 0)
              const colC = locations.reduce((s, loc) => s + (data[loc]?.[m]?.canceladas ?? 0), 0)
              return (
                <td key={m} style={{ padding: '4px 6px', textAlign: 'center' }}>
                  <div
                    style={{ cursor: colV > 0 ? 'pointer' : undefined }}
                    onClick={() => colV > 0 && onClickMonthTotal?.(m)}
                  >
                    <div style={{ fontSize: 14, fontWeight: 800, color: '#F89B24' }}>{colV || ''}</div>
                    {colC > 0 && <div style={{ fontSize: 10, color: '#E0334B' }}>-{colC}</div>}
                  </div>
                </td>
              )
            })}
            <td style={{ padding: '4px 6px', textAlign: 'center' }}>
              <div
                style={{ cursor: 'pointer' }}
                onClick={() => onClickGrandTotal?.()}
              >
                <div style={{ fontSize: 18, fontWeight: 800, color: '#F89B24' }}>
                  {locations.reduce((s, loc) =>
                    s + months.reduce((ms, m) => ms + (data[loc]?.[m]?.ventas ?? 0), 0), 0,
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#E0334B' }}>
                  -{locations.reduce((s, loc) =>
                    s + months.reduce((ms, m) => ms + (data[loc]?.[m]?.canceladas ?? 0), 0), 0,
                  )}
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
