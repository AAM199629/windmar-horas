// Recuento read-only correcto: asalariados ACTIVOS (def. canónica getActiveAsalariados)
// y booths independientes ACTIVOS (status Activo + fecha vigente).
import { getRedshiftPool } from '../lib/redshift.ts'
import { getSellerRegion } from '../lib/constants.ts'
const pool = getRedshiftPool()
const norm = (s:any)=>String(s??'').toLowerCase().trim()

// ── Asalariados activos (misma def. que getActiveAsalariados) ─────────────────
const SALARIED_ROLES = ['Empleado - Consultor','Empleado - Lider','Empleado - Gerente']
const { rows: asal } = await pool.query(`
  SELECT full_name, sales_role, ciudad
  FROM dw_zoho.dim_sales_team_member
  WHERE sales_role = ANY($1)
    AND status = 'Activo'
    AND empleado_consultor_start_date IS NOT NULL
    AND (consultor_asalariado_end_date IS NULL
         OR empleado_consultor_start_date > consultor_asalariado_end_date)
    AND email IS NOT NULL
`, [SALARIED_ROLES])
const asalRole:Record<string,number>={}, asalRegion:Record<string,number>={}
for (const r of asal){ asalRole[r.sales_role]=(asalRole[r.sales_role]??0)+1
  const reg=getSellerRegion(r.ciudad); asalRegion[reg]=(asalRegion[reg]??0)+1 }
console.log(`ASALARIADOS ACTIVOS (def. canónica): ${asal.length}`)
console.log('  por rol:', asalRole)
console.log('  por región:', asalRegion)

// ── Booths independientes activos ─────────────────────────────────────────────
// Tipos físicos del canal independiente. Activo = booths_status='Activo' y vigente.
const INDEP_FISICO = ['Supermercados','Ferreterias','Eventos Especiales','Estacion de Gasolina']
const { rows: ci } = await pool.query(`
  SELECT nombre_channel_info AS nombre, pueblo, tipo_de_evento AS tipo,
         booths_status AS status, inversion_fija AS inversion,
         TO_CHAR(fecha_inicio,'YYYY-MM-DD') AS ini, TO_CHAR(fecha_fin,'YYYY-MM-DD') AS fin,
         (booths_status='Activo') AS status_activo,
         (fecha_fin IS NULL OR fecha_fin >= CURRENT_DATE) AS fecha_vigente,
         (fecha_inicio IS NULL OR fecha_inicio <= CURRENT_DATE) AS ya_inicio
  FROM dwh.dim_channel_info
  WHERE tipo_de_evento = ANY($1)
`, [INDEP_FISICO])

const statusActivo = ci.filter(r=>r.status_activo)
const vigentes = ci.filter(r=>r.status_activo && r.fecha_vigente && r.ya_inicio)
console.log(`\nBOOTHS INDEP. (tipos físicos): total filas=${ci.length}`)
console.log(`  status='Activo': ${statusActivo.length}`)
console.log(`  status Activo + fecha vigente (hoy): ${vigentes.length}`)

const bRegion:Record<string,number>={}, bTipo:Record<string,number>={}; let inv=0
for (const r of vigentes){ const reg=getSellerRegion(r.pueblo); bRegion[reg]=(bRegion[reg]??0)+1
  bTipo[r.tipo]=(bTipo[r.tipo]??0)+1; inv+=Number(r.inversion??0)||0 }
console.log('  vigentes por región:', bRegion)
console.log('  vigentes por tipo:', bTipo)
console.log('  inversión/mes vigentes: $'+inv.toLocaleString())
console.log('\n  detalle vigentes:')
for (const r of vigentes) console.log(`   ${String(r.nombre).slice(0,34).padEnd(35)} ${String(r.pueblo).padEnd(14)} ${String(r.tipo).padEnd(18)} ${r.ini}→${r.fin??'∞'}  $${r.inversion}`)

// Comparación: vencidos aún marcados Activo (ruido)
const vencidos = statusActivo.filter(r=>!r.fecha_vigente)
console.log(`\n  ⚠️ marcados 'Activo' pero fecha_fin ya pasó: ${vencidos.length}`)
for (const r of vencidos) console.log(`   ${String(r.nombre).slice(0,34).padEnd(35)} fin=${r.fin}`)
process.exit(0)
