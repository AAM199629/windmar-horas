'use client'

import { useRouter } from 'next/navigation'

export default function IndepViewToggle({ current }: { current: 'dashboard' | 'turnos' }) {
  const router = useRouter()

  return (
    <div style={{
      display: 'flex',
      background: '#EEF3FD',
      borderRadius: 999,
      padding: 4,
      gap: 2,
      fontFamily: "'Montserrat', sans-serif",
    }}>
      {(['dashboard', 'turnos'] as const).map(view => {
        const isActive = current === view
        return (
          <button
            key={view}
            onClick={() => router.push(`/canales/independiente?view=${view}`)}
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
            {view === 'dashboard' ? 'Dashboard' : 'Turnos'}
          </button>
        )
      })}
    </div>
  )
}
