'use client'

const AVATAR_GRADIENTS = [
  ['#5B8CFF', '#3D6BFF'],
  ['#22C7E6', '#1D429B'],
  ['#1FD79B', '#1FA971'],
  ['#FB9F3A', '#E07B2E'],
  ['#FF5D6C', '#E0334B'],
  ['#FF4D9D', '#c026d3'],
  ['#9B6BFF', '#7c3aed'],
  ['#A4D932', '#65a30d'],
  ['#34B3F1', '#0284c7'],
  ['#15B6A0', '#0f766e'],
  ['#B255F0', '#9333ea'],
  ['#E14BD6', '#db2777'],
  ['#3D6BFF', '#1D429B'],
  ['#22C7E6', '#15B6A0'],
  ['#1FD79B', '#22C7E6'],
  ['#FB9F3A', '#FF5D6C'],
]

export interface SellerStat {
  name: string
  location: string
  leads: number
  converted: number
}

interface SellerCardsProps {
  sellers: SellerStat[]
  onClickCard?: (name: string) => void
}

function initials(name: string): string {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')
}

export default function SellerCards({ sellers, onClickCard }: SellerCardsProps) {
  if (sellers.length === 0) {
    return (
      <p style={{ fontSize: 13, color: '#8A8A8F', fontFamily: "'Montserrat', sans-serif" }}>
        Sin datos de leads para el período seleccionado.
      </p>
    )
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: 14,
    }}>
      {sellers.map((seller, i) => {
        const [g1, g2] = AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length]
        const convRate = seller.leads > 0
          ? Math.round((seller.converted / seller.leads) * 100)
          : 0

        return (
          <div
            key={seller.name}
            style={{
              background: '#F7F8FA',
              border: '1px solid #E4E5E9',
              borderRadius: 16,
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              cursor: onClickCard ? 'pointer' : undefined,
              fontFamily: "'Montserrat', sans-serif",
            }}
            onClick={() => onClickCard?.(seller.name)}
          >
            {/* Avatar */}
            <div style={{
              width: 38, height: 38,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${g1}, ${g2}bb)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: 700,
            }}>
              {initials(seller.name)}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                fontSize: 14.5,
                fontWeight: 700,
                color: '#21274E',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                lineHeight: 1.2,
                marginBottom: 2,
              }}>
                {seller.name}
              </p>
              <p style={{
                fontSize: 12,
                color: '#8A8A8F',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {seller.location}
              </p>
            </div>

            {/* Métricas */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <p style={{
                fontSize: 19,
                fontWeight: 800,
                color: '#21274E',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {seller.leads}
              </p>
              <p style={{ fontSize: 11, color: '#1FA971', fontWeight: 600, marginTop: 2 }}>
                {convRate}% conv.
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
