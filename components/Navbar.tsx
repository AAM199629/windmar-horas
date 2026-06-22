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
  const isCanal = role === 'canal'
  const canSeeAsalariados = role === 'admin' || role === 'supervisor'
  const dataAge = useDataStatus()
  const [open, setOpen] = useState(false)

  const canalLinks = [
    { href: '/canales/cambaceo',      label: 'Cambaceo' },
    { href: '/canales/mall',          label: 'Mall / Home Depot' },
    { href: '/canales/independiente', label: 'Independiente' },
  ]

  const allLinks = isCanal ? canalLinks : [
    ...links,
    ...(canSeeAsalariados ? [
      { href: '/ventas',      label: 'Dashboard Ventas' },
      { href: '/asalariados', label: 'Asalariados' },
      { href: '/promotores',  label: 'Promotores'  },
      { href: '/bingo',       label: 'Bingo'        },
    ] : []),
    ...(isAdmin           ? [{ href: '/accounts',   label: 'Cuentas' }]    : []),
  ]

  // Close on ESC
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Close on route change
  useEffect(() => { setOpen(false) }, [path])

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <header style={{ background: '#0D1654' }} className="shadow-lg">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-4 h-16">

          {/* Hamburger button */}
          <button
            onClick={() => setOpen(o => !o)}
            className="shrink-0 flex flex-col justify-center items-center gap-[5px] w-8 h-8 rounded hover:bg-white/10 transition-colors duration-150 focus:outline-none"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
          >
            <span className={`block w-5 h-[2px] bg-slate-300 rounded-full origin-center transition-all duration-200 ${open ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-5 h-[2px] bg-slate-300 rounded-full transition-all duration-200 ${open ? 'opacity-0 scale-x-0' : ''}`} />
            <span className={`block w-5 h-[2px] bg-slate-300 rounded-full origin-center transition-all duration-200 ${open ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>

          {/* Logo */}
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

          {/* App label */}
          <span
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#F5A623', letterSpacing: '0.05em' }}
            className="text-sm font-bold uppercase shrink-0"
          >
            HORAS
          </span>

          {/* Data status */}
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

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar drawer — always in DOM so close animation plays */}
      <aside
        style={{
          background: '#0D1654',
          width: '260px',
          borderRight: '1px solid rgba(255,255,255,0.08)',
        }}
        className={`fixed top-0 left-0 h-full z-50 flex flex-col shadow-2xl transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        aria-hidden={!open}
      >
        {/* Sidebar header strip */}
        <div
          className="h-16 flex items-center gap-3 px-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          <button
            onClick={() => setOpen(false)}
            className="flex flex-col justify-center items-center gap-[5px] w-8 h-8 rounded hover:bg-white/10 transition-colors duration-150 focus:outline-none"
            aria-label="Cerrar menú"
          >
            <span className="block w-5 h-[2px] bg-slate-300 rounded-full rotate-45 translate-y-[3.5px]" />
            <span className="block w-5 h-[2px] bg-slate-300 rounded-full -rotate-45 -translate-y-[3.5px]" />
          </button>
          <span
            style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#F5A623', letterSpacing: '0.05em' }}
            className="text-sm font-bold uppercase"
          >
            WINDMAR HORAS
          </span>
        </div>

        {/* Nav links */}
        <nav className="flex-1 overflow-y-auto py-3 px-2">
          {allLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              style={path === href ? { background: '#E88B0C', color: '#fff' } : {}}
              className={`flex items-center w-full px-4 py-2.5 mb-0.5 text-sm font-medium rounded-l-none rounded-r-full transition-colors duration-150 ${
                path === href ? '' : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  )
}
