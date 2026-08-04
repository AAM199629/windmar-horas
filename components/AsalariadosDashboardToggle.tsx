'use client'

const DASHBOARD_URL = 'https://supervisores-regionales.vercel.app'

export default function AsalariadosDashboardToggle() {
  return (
    <div style={{
      display: 'flex',
      background: '#EEF3FD',
      borderRadius: 999,
      padding: 4,
      gap: 2,
      fontFamily: "'Montserrat', sans-serif",
    }}>
      <span
        style={{
          padding: '8px 20px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'inherit',
          background: 'linear-gradient(180deg, #3D6BFF, #1D429B)',
          color: '#FFFFFF',
          boxShadow: '0 4px 14px rgba(61,107,255,0.35)',
        }}
      >
        Asalariados
      </span>
      <a
        href={DASHBOARD_URL}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 20px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 600,
          fontFamily: 'inherit',
          textDecoration: 'none',
          transition: 'all 0.15s',
          background: 'transparent',
          color: '#1D429B',
          cursor: 'pointer',
        }}
      >
        Dashboard ↗
      </a>
    </div>
  )
}
