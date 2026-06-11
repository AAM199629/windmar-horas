'use client'

import { useRouter } from 'next/navigation'

export default function ViewToggle({
  currentView,
  hrefHoras,
  hrefPerformance,
}: {
  currentView: 'horas' | 'performance'
  hrefHoras: string
  hrefPerformance: string
}) {
  const router = useRouter()

  const views = [
    { key: 'horas' as const, label: 'Turnos', href: hrefHoras },
    { key: 'performance' as const, label: 'Performance', href: hrefPerformance },
  ]

  return (
    <div style={{
      display: 'flex',
      background: '#EEF3FD',
      borderRadius: 999,
      padding: 4,
      gap: 2,
      fontFamily: "'Montserrat', sans-serif",
    }}>
      {views.map(({ key, label, href }) => {
        const isActive = currentView === key
        return (
          <button
            key={key}
            onClick={() => router.push(href)}
            style={{
              padding: '8px 20px',
              borderRadius: 999,
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              fontFamily: 'inherit',
              transition: 'all 0.15s',
              background: isActive ? 'linear-gradient(180deg, #3D6BFF, #1D429B)' : 'transparent',
              color: isActive ? '#FFFFFF' : '#1D429B',
              boxShadow: isActive ? '0 4px 14px rgba(61,107,255,0.35)' : 'none',
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}
