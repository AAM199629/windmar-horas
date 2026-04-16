'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

const links = [
  { href: '/',                      label: 'Inicio' },
  { href: '/horas',                 label: 'Análisis de Horas' },
  { href: '/canales/cambaceo',      label: 'Cambaceo' },
  { href: '/canales/mall',          label: 'Mall / Home Depot' },
  { href: '/canales/independiente', label: 'Independiente' },
]

export default function Navbar() {
  const path = usePathname()
  const { data: session } = useSession()
  const isAdmin = (session?.user as any)?.role === 'admin'

  const allLinks = isAdmin
    ? [...links, { href: '/accounts', label: 'Cuentas' }]
    : links

  return (
    <header style={{ background: '#0D1654' }} className="shadow-lg">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-16">
        <Link href="/" className="shrink-0 flex items-center">
          <Image
            src="/windmar-logo.png"
            alt="Windmar"
            width={90}
            height={28}
            className="object-contain"
            priority
          />
        </Link>
        <span
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#F5A623', letterSpacing: '0.05em' }}
          className="text-sm font-bold uppercase shrink-0"
        >
          HORAS
        </span>
        <nav className="flex gap-1 overflow-x-auto ml-2">
          {allLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={path === href ? { background: '#E88B0C', color: '#fff' } : {}}
              className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                path === href
                  ? ''
                  : 'text-slate-300 hover:bg-white/10'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
