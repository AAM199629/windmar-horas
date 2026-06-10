'use client'

import { ReactNode, useRef } from 'react'
import { useAnim } from '../hooks/useAnim'
import { useCountUp } from '../hooks/useCountUp'

// Gauge SVG — arc radial que muestra un porcentaje
function Gauge({ pct, color, size = 104, thickness = 10 }: {
  pct: number
  color: string
  size?: number
  thickness?: number
}) {
  const r = (size - thickness) / 2
  const circ = 2 * Math.PI * r
  // Gauge usa solo 270° del círculo (3/4), comenzando en 135°
  const arcLen = circ * 0.75
  const fill = arcLen * Math.min(pct, 1)
  const gap = arcLen - fill

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(135deg)' }}>
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke="#EEF3FD"
        strokeWidth={thickness}
        strokeDasharray={`${arcLen} ${circ - arcLen}`}
        strokeLinecap="round"
      />
      {/* Fill */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={thickness}
        strokeDasharray={`${fill} ${gap + (circ - arcLen)}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }}
      />
      {/* Label centrado — se rota para contrarrestar la rotación del svg */}
      <text
        x={size / 2} y={size / 2 + 6}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="#21274E"
        fontSize="18"
        fontWeight="800"
        fontFamily="'Bebas Neue', sans-serif"
        style={{ transform: `rotate(-135deg)`, transformOrigin: `${size / 2}px ${size / 2}px` }}
      >
        {Math.round(pct * 100)}%
      </text>
    </svg>
  )
}

interface KpiCardProps {
  label: string
  value?: number
  sub?: string
  color: string
  glow: string
  animOn: boolean
  isGauge?: boolean
  gaugePct?: number
  children?: ReactNode
}

export default function KpiCard({
  label, value = 0, sub, color, glow, animOn, isGauge, gaugePct = 0,
}: KpiCardProps) {
  const ref = useRef<HTMLDivElement>(null)
  const displayed = useCountUp(value, animOn)

  return (
    <div
      ref={ref}
      style={{
        background: '#FFFFFF',
        borderRadius: 22,
        boxShadow: '0 8px 24px rgba(33,39,78,.10)',
        padding: '22px 24px',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: "'Montserrat', sans-serif",
      }}
    >
      {/* Barra de acento superior */}
      <div style={{
        position: 'absolute',
        top: 0, left: 24, right: 24,
        height: 3,
        borderRadius: 999,
        background: color,
        opacity: 0.9,
      }} />

      {/* Glow decorativo */}
      <div style={{
        position: 'absolute',
        top: -50, right: -40,
        width: 150, height: 150,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${glow}22, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      {/* Eyebrow */}
      <p style={{
        fontSize: 11,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: '#1D429B',
        marginBottom: 10,
        marginTop: 8,
      }}>
        {label}
      </p>

      {isGauge ? (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <Gauge pct={animOn ? gaugePct : gaugePct} color={color} />
        </div>
      ) : (
        <p style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 56,
          lineHeight: 1,
          color: '#21274E',
          fontVariantNumeric: 'tabular-nums',
          marginBottom: 4,
        }}>
          {displayed.toLocaleString('es-PR')}
        </p>
      )}

      {sub && (
        <p style={{ fontSize: 12, color: '#8A8A8F', marginTop: isGauge ? 6 : 2 }}>
          {sub}
        </p>
      )}
    </div>
  )
}
