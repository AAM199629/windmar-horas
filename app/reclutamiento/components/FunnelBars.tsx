'use client'

// Funnel de conversión. Net-new: el repo no tenía ningún componente de embudo.
// La mecánica de animación es la de app/canales/mall/components/LocationBars.tsx
// (var CSS --bar-w + keyframe, stagger por índice, guard de reduced-motion).

const STAGE_HUES = ['#1D429B', '#3D6BFF', '#22C7E6', '#1FD79B', '#F89B24']

const BAR_ANIMATION = `
@keyframes wmFunnelFill {
  from { width: 0 }
  to { width: var(--bar-w) }
}
@media (prefers-reduced-motion: reduce) {
  .wm-funnel-fill { animation: none !important; }
}
`

export interface FunnelStageView {
  key: string
  label: string
  /** Qué población cuenta la etapa. Sin esto las barras se leen como una
   *  cadena de subconjuntos, y no lo son. */
  hint: string
  count: number
  convFromPrev: number | null
  convFromTop: number
  /** El % contra la etapa anterior compara dos poblaciones distintas (las
   *  llamadas de la ventana vs los citados para ese Solar), no un subconjunto.
   *  Se marca para que nadie lo lea como una tasa de caída. */
  crossPopulation?: boolean
}

interface FunnelBarsProps {
  stages: FunnelStageView[]
  animOn: boolean
  onClickStage?: (key: string) => void
}

export default function FunnelBars({ stages, animOn, onClickStage }: FunnelBarsProps) {
  if (!stages.length) return null
  const top = stages[0]?.count || 1

  return (
    <>
      <style>{BAR_ANIMATION}</style>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {stages.map((s, i) => {
          // El ancho es proporcional al tope, con un piso para que una etapa
          // muy angosta siga siendo legible.
          const pct = Math.max((s.count / top) * 100, 2.5)
          const hue = STAGE_HUES[i % STAGE_HUES.length]
          const drop = i > 0 ? stages[i - 1].count - s.count : 0

          return (
            <div key={s.key}>
              {/* Fila de etiquetas */}
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#21274E', letterSpacing: '.01em' }}>
                  {s.label}
                  <span style={{ display: 'block', fontSize: 10, fontWeight: 500, color: '#8A8A8F', marginTop: 2 }}>
                    {s.hint}
                  </span>
                </span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                  {s.convFromPrev !== null && (
                    <span
                      title={s.crossPopulation
                        ? 'Rendimiento de la ventana de llamadas: compara las llamadas hechas esa semana con los citados para ese Solar. No todos los citados salieron de esa ventana, así que no es una tasa de caída.'
                        : undefined}
                      style={{
                        fontSize: 11, fontWeight: 700,
                        color: s.crossPopulation ? '#3A4156' : '#fff',
                        background: s.crossPopulation
                          ? 'transparent'
                          : s.convFromPrev >= 50 ? '#1E9E62' : s.convFromPrev >= 25 ? '#F89B24' : '#D64545',
                        border: s.crossPopulation ? '1px dashed #B4BCCE' : 'none',
                        borderRadius: 999, padding: '2px 8px',
                      }}>
                      {s.convFromPrev.toFixed(0)}%{s.crossPopulation ? ' ⁓' : ''}
                    </span>
                  )}
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: '#21274E', lineHeight: 1 }}>
                    {s.count.toLocaleString('en-US')}
                  </span>
                </span>
              </div>

              {/* Barra */}
              <div
                onClick={onClickStage ? () => onClickStage(s.key) : undefined}
                style={{
                  background: '#EEF3FD', borderRadius: 999, height: 26, overflow: 'hidden',
                  cursor: onClickStage ? 'pointer' : 'default',
                }}
              >
                <div
                  className="wm-funnel-fill"
                  style={{
                    // @ts-expect-error — var CSS custom, igual que LocationBars
                    '--bar-w': `${pct}%`,
                    width: animOn ? `${pct}%` : 0,
                    height: '100%',
                    borderRadius: 999,
                    background: `linear-gradient(90deg, ${hue}, ${hue}CC)`,
                    boxShadow: `0 2px 10px ${hue}55`,
                    animation: animOn ? `wmFunnelFill 1200ms cubic-bezier(.2,.8,.2,1) ${i * 55}ms both` : 'none',
                  }}
                />
              </div>

              {/* Caída respecto a la etapa anterior */}
              {i > 0 && drop > 0 && !s.crossPopulation && (
                <div style={{ fontSize: 10.5, color: '#8A8A8F', marginTop: 4, letterSpacing: '.02em' }}>
                  se cayeron {drop.toLocaleString('en-US')}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
