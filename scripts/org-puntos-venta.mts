// Read-only: puntos de venta físicos ACTIVOS desde Channel Info, con pueblo→región.
// Separa el grupo de Yelitza (Mall/Home Depot) y el de Genesis (Ind./Evento),
// y prepara la reasignación por región para los regionales.
import { writeFileSync } from 'node:fs'
import { getRedshiftPool } from '../lib/redshift.ts'
import { getSellerRegion } from '../lib/constants.ts'
const pool = getRedshiftPool()
const norm = (s:any)=>String(s??'').toLowerCase().trim()

const MALL_HD   = ['Home Depot','Centro Comercial']
const INDEP     = ['Supermercados','Ferreterias','Eventos Especiales','Estacion de Gasolina']
const PHYSICAL  = [...MALL_HD, ...INDEP]

const { rows } = await pool.query(`
  SELECT nombre_channel_info AS nombre, pueblo, tipo_de_evento AS tipo,
         booths_status AS status, inversion_fija AS inversion,
         TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS ini, TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fin
  FROM dwh.dim_channel_info
  WHERE tipo_de_evento = ANY($1)
    AND booths_status='Activo'
    AND (fecha_fin   IS NULL OR fecha_fin   >= CURRENT_DATE)
    AND (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_DATE)
  ORDER BY tipo_de_evento, pueblo
`, [PHYSICAL])

// Marcadores recurrentes sin costo (Promotor/BSN) → no son booth físico atendido.
const isMarker = (n:string, inv:any) => (/promotor|bsn/i.test(n||'') && (!inv || Number(inv)===0))

// Home Depot vienen con pueblo NULL en Channel Info → región por nombre de tienda
// (mismo mapa de regiones del negocio).
const HD_REGION: Record<string,string> = {
  'Home Depot - Ponce':'Ponce', 'Home Depot - Montehiedra':'San Juan I y III',
  'Home Depot - Colobos':'San Juan I y III', 'Home Depot - Rexville':'San Juan I y III',
  'Home Depot - Plaza Escorial':'San Juan I y III', 'Home Depot - Plaza del Sol':'San Juan I y III',
  'Home Depot - Arecibo':'Hatillo', 'Home Depot - Mayaguez':'Mayagüez',
  'Home Depot - Humacao':'San Juan II', 'Home Depot - Caguas':'San Juan II',
}

const points = rows.map(r=>{
  const nombre = (r.nombre && String(r.nombre).trim() && String(r.nombre).toLowerCase()!=='null') ? String(r.nombre).trim() : `${r.tipo} — ${r.pueblo}`
  let region = getSellerRegion(r.pueblo)
  if (region==='Sin región' && HD_REGION[nombre]) region = HD_REGION[nombre]
  return {
    nombre, pueblo: r.pueblo, tipo: r.tipo, region,
    grupo: MALL_HD.includes(r.tipo) ? 'yelitza' : 'genesis',
    inversion: Number(r.inversion??0)||0,
    ini: r.ini, fin: r.fin,
    marker: isMarker(r.nombre, r.inversion),
  }
})

function summarize(list:any[]){
  const byRegion:Record<string,number>={}
  for (const p of list){ byRegion[p.region]=(byRegion[p.region]??0)+1 }
  return byRegion
}
const yelitza = points.filter(p=>p.grupo==='yelitza')
const genesis = points.filter(p=>p.grupo==='genesis')
const genesisReal = genesis.filter(p=>!p.marker)

console.log(`YELITZA (Mall/Home Depot) activos: ${yelitza.length}`)
console.log('  por región:', summarize(yelitza))
for (const p of yelitza) console.log(`   ${p.nombre.padEnd(30)} ${String(p.pueblo).padEnd(14)} ${p.tipo.padEnd(16)} → ${p.region}`)

console.log(`\nGENESIS (Booth Ind. y Evento) activos: ${genesis.length}  (físicos reales: ${genesisReal.length}, marcadores Promotor/BSN: ${genesis.length-genesisReal.length})`)
console.log('  por región (todos):', summarize(genesis))
console.log('  por región (solo físicos reales):', summarize(genesisReal))
for (const p of genesis) console.log(`   ${(p.marker?'· ':'  ')}${p.nombre.padEnd(30)} ${String(p.pueblo).padEnd(14)} ${p.tipo.padEnd(18)} → ${p.region}${p.inversion?` ($${p.inversion})`:''}`)

const out = { yelitza, genesis, genesisReal,
  resumen: { yelitzaPorRegion: summarize(yelitza), genesisPorRegion: summarize(genesis), genesisRealPorRegion: summarize(genesisReal) } }
const outPath = new URL('./org-puntos-venta.json', import.meta.url).pathname
writeFileSync(outPath, JSON.stringify(out,null,2))
console.log(`\n✅ JSON → ${outPath}`)
process.exit(0)
