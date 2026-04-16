'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/',                    label: 'Inicio' },
  { href: '/horas',               label: 'Análisis de Horas' },
  { href: '/canales/cambaceo',    label: 'Cambaceo' },
  { href: '/canales/mall',        label: 'Mall / Home Depot' },
  { href: '/canales/independiente', label: 'Independiente' },
]

export default function Navbar() {
  const path = usePathname()

  return (
    <header className="bg-[#003320] text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-14">
        <span className="font-bold text-[#00A651] text-lg tracking-wide shrink-0">
          WINDMAR<span className="text-white"> HORAS</span>
        </span>
        <nav className="flex gap-1 overflow-x-auto">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded text-sm font-medium whitespace-nowrap transition-colors ${
                path === href
                  ? 'bg-[#00A651] text-white'
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
