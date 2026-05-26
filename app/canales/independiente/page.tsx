import StipTurnosView from '@/components/StipTurnosView'

export const dynamic = 'force-dynamic'

export default async function IndependientePage() {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1654]">Canal Independiente &amp; Eventos</h1>
          <p className="text-slate-500 text-sm mt-0.5">Turnos en tiempo real · STIP</p>
        </div>
      </div>
      <StipTurnosView canal="independiente" />
    </div>
  )
}
