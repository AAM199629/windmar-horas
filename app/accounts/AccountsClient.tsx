'use client'

import { useState, useEffect, useCallback } from 'react'

interface User {
  id: string
  email: string
  name: string
  role: 'admin' | 'viewer'
}

export default function AccountsClient({ currentEmail }: { currentEmail: string }) {
  const [users, setUsers]       = useState<User[]>([])
  const [loading, setLoading]   = useState(true)
  const [form, setForm]         = useState({ email: '', name: '', password: '', role: 'viewer' as 'admin' | 'viewer' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/accounts/users')
    if (res.ok) setUsers(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    const res = await fetch('/api/accounts/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Error al crear usuario')
    } else {
      setSuccess(`Usuario ${data.name} creado correctamente`)
      setForm({ email: '', name: '', password: '', role: 'viewer' })
      loadUsers()
    }
    setSubmitting(false)
  }

  async function handleDelete(email: string) {
    if (!confirm(`¿Eliminar a ${email}?`)) return
    setDeleting(email)
    await fetch(`/api/accounts/users/${encodeURIComponent(email)}`, { method: 'DELETE' })
    setDeleting(null)
    loadUsers()
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1
          style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#0D1654' }}
          className="text-3xl font-bold tracking-wide"
        >
          CUENTAS DE USUARIO
        </h1>
        <p className="text-slate-500 text-sm mt-1">Gestiona el acceso al dashboard</p>
      </div>

      {/* Create user form */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div style={{ background: '#0D1654' }} className="px-6 py-4 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-bold text-lg tracking-wide">
            CREAR NUEVO USUARIO
          </span>
        </div>

        <form onSubmit={handleCreate} className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              required
              placeholder="Juan Pérez"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E88B0C]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              required
              placeholder="juan@windmarhome.com"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E88B0C]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                placeholder="••••••••"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-[#E88B0C]"
              />
              <button type="button" onClick={() => setShowPwd(v => !v)}
                className="absolute inset-y-0 right-0 px-2.5 text-slate-400 hover:text-slate-600" tabIndex={-1}>
                {showPwd
                  ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
                  : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                }
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Rol</label>
            <select
              value={form.role}
              onChange={e => setForm(f => ({ ...f, role: e.target.value as 'admin' | 'viewer' }))}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#E88B0C] bg-white"
            >
              <option value="viewer">Viewer — solo lectura</option>
              <option value="admin">Admin — acceso completo</option>
            </select>
          </div>

          {error   && <p className="sm:col-span-2 text-red-600 text-sm">{error}</p>}
          {success && <p className="sm:col-span-2 text-green-600 text-sm">{success}</p>}

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              style={{ background: '#E88B0C' }}
              className="px-6 py-2 text-white font-semibold rounded-lg hover:opacity-90 disabled:opacity-50 transition text-sm"
            >
              {submitting ? 'Creando…' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>

      {/* User list */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div style={{ background: '#0D1654' }} className="px-6 py-4 flex items-center gap-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span style={{ fontFamily: "'Barlow Condensed', sans-serif" }} className="text-white font-bold text-lg tracking-wide">
            USUARIOS ACTIVOS
          </span>
          <span className="ml-auto bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            {users.length}
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando…</div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No hay usuarios</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {users.map(u => (
              <div key={u.email} className="flex items-center gap-4 px-6 py-4">
                <div
                  style={{ background: '#0D1654' }}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm truncate">{u.name}</p>
                  <p className="text-slate-400 text-xs truncate">{u.email}</p>
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                  u.role === 'admin'
                    ? 'bg-[#0D1654]/10 text-[#0D1654]'
                    : 'bg-slate-100 text-slate-500'
                }`}>
                  {u.role === 'admin' ? 'Admin' : 'Viewer'}
                </span>
                {u.email !== currentEmail && (
                  <button
                    onClick={() => handleDelete(u.email)}
                    disabled={deleting === u.email}
                    className="text-red-400 hover:text-red-600 disabled:opacity-40 transition p-1"
                    title="Eliminar usuario"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
