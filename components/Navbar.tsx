'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

function useDataStatus() {
  const [label, setLabel] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/data-status')
      .then(r => r.ok ? r.json() : null)
      .then((d: any) => {
        if (!d?.lastUpdated) return
        const diff = Math.floor((Date.now() - new Date(d.lastUpdated).getTime()) / 60000)
        if (diff < 60)        setLabel(`hace ${diff}m`)
        else if (diff < 1440) setLabel(`hace ${Math.floor(diff / 60)}h`)
        else                  setLabel(`hace ${Math.floor(diff / 1440)}d`)
      })
      .catch(() => null)
  }, [])

  return label
}

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
  const role = (session?.user as any)?.role as string | undefined
  const isAdmin = role === 'admin'
  const canSeeAsalariados = role === 'admin' || role === 'supervisor'
  const dataAge = useDataStatus()

  const allLinks = [
    ...links,
    ...(canSeeAsalariados ? [
      { href: '/asalariados', label: 'Asalariados' },
      { href: '/promotores',  label: 'Promotores'  },
      { href: '/bingo',       label: 'Bingo'        },
    ] : []),
    ...(isAdmin           ? [{ href: '/accounts',   label: 'Cuentas' }]    : []),
  ]

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

        {dataAge && (
          <div className="ml-auto shrink-0 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00A651]" />
            <span className="text-xs text-slate-400 whitespace-nowrap">
              Datos Zoho: <span className="text-slate-300">{dataAge}</span>
            </span>
          </div>
        )}
      </div>
    </header>
  )
}
