# Petición a Data/ETL — módulo `Sales Recruitment` al warehouse

> ## ✅ ENTREGADO (10 sep 2026) — este documento queda como historial
> Data entregó un **star schema** en el schema **`sales_recruitment`** en vez de la tabla plana
> `dw_zoho.dim_sales_recruitment` que pedía este doc: `fact_sales_recruitment` (59,971 filas) +
> `dim_recruit`, `_source`, `_geography`, `_staff`, `_profile`, `_timeline`, `_audit`.
> Es mejor de lo que pedimos — trae toda la historia (2020→sep 2026), no solo jun–ago.
>
> **Las tres peticiones críticas se cumplieron las tres:**
> - `dim_recruit_staff.sales_team_matching_id` resuelve contra `dim_sales_team_member.member_id`
>   con **1 huérfano de 2,181**. Además vino `mentor_asignado_id`, que resuelve con **0 huérfanos**
>   (17,773 filas) y da los nombres reales de mentor.
> - `dim_recruit_staff.email_corporativo_mentor` presente (9,859 filas).
> - Todas las fechas del timeline son `date`, ninguna es `varchar`.
>
> **El join por el fact no produce fan-out** (59,971 → 59,971) y ya resuelve a la fila vigente de
> cada SCD-2, así que no hace falta repetir `is_current = true` por esa ruta.
>
> Los nombres reales de las columnas del timeline son `llamado`, `citado`, `asistio_oportunidad`,
> `asistio_training1_basicos`, `asistio_training2_generando`, `asistio_crea_y_max`,
> `reunion_con_mentor` (sin el prefijo `sa_N_` que pedía este doc).
>
> Verificar con `npx tsx --env-file=.env.local scripts/inspect-dim-sales-recruitment.mts`.
>
> ### Dos cosas que sí conviene pedirle a Data
> 1. **`presencial_o_virtual` viene sucio** y parte la misma sede en varios valores:
>    `Presencial  San Juan` (doble espacio, 2,777) vs `Presencial San Juan` (1,130);
>    `Presencial Mayaguez` (1,451) vs `Presencial Mayagüez` (172);
>    `Presencial San Juan Nocturn` (truncado, 25). El dashboard lo normaliza en
>    `parseSolarAcademySede()`, pero limpiarlo en el origen evitaría que cada consumidor
>    reimplemente el parseo. Además está **NULL en 33,809 de 59,971** (56%).
> 2. **`oficina_regional` está NULL en 99.4%** (solo 329 filas con valor). Si la intención era que
>    fuera el eje regional, no sirve todavía; el dashboard usa `presencial_o_virtual`.

---

**Fecha:** 19 ago 2026
**Para:** equipo de Data/ETL
**Motivo:** habilitar el tab de Reclutamiento (Solar Academy) en Windmar Horas

## Qué necesitamos

Una tabla nueva: **`dw_zoho.dim_sales_recruitment`**, grano = **1 fila por record del módulo
`Sales Recruitment` de Zoho CRM**. Misma convención que `dw_zoho.dim_sales_team_member`
(snake_case, picklists tal cual, sin normalizar valores).

## Por qué no se puede hacer sin ustedes

Verificamos las dos alternativas y ninguna sirve:

1. **No hay nada del módulo en Redshift.** Lo único que existe es la columna
   `dw_zoho.dim_sales_team_member.sales_recruitment`, que guarda solo el **nombre** del record
   enlazado. Como llave es inservible: de 2,017 valores no nulos, **999 coinciden exacto con
   `full_name` y 1,018 difieren** (acentos, nombres truncados — p. ej.
   `Miguel Angel Martinez Chike` vs `Miguel Angel Martinez Chiques`).

2. **La API de Zoho está cerrada.** El refresh token del app tiene el scope correcto
   (`ZohoCRM.modules.READ`), pero todo `GET /crm/v7/<módulo>` devuelve
   `403 NO_PERMISSION` con `details.permissions = ["Crm_Implied_Api_Access"]` — el perfil del
   usuario integrado no tiene "API access" habilitado en Zoho.

## Columnas

| Grupo | Columnas |
|---|---|
| Identidad | `recruitment_id` (PK, el record id de Zoho), `sales_recruitment_name`, `first_name`, `last_name`, `email`, `telefono`, `ciudad`, `source`, `referido_empleado_nombre`, `referido_empleado_email` |
| Estado | `recruitment_status`, `status_inicial`, `status_comentarios`, `admin_area`, `mencion`, `hr_asignado` |
| Contacto | `intentos_llamadas` (int), `intentos_citado` (int), `ult_llamada_seguimiento` (date) |
| Solar Academy | `sa_1_llamado`, `sa_2_citado`, `sa_3_asistio_oportunidad`, `sa_4_asistio_training_i_basicos`, `sa_5_asistio_training_ii_generando`, `sa_6_asistio_crea_y_max`, `sa_7_reunion_con_mentor` — todas `date`. Es el grupo completo "Solar Academy - Fechas y Detalles" |
| Sede | `presencial_o_virtual`, `booth_training`, `sa_sabatino` |
| Matching | `sales_team_matching_id`, `sales_team_matching_name`, `sales_team_created_date` |
| Perfilamiento | `experiencia_en_ventas`, `cuenta_con_vehiculo`, `disponibilidad_para_reuniones` |
| Mentor | `mentor_asignado`, `mentor_asignado_fecha`, `mentor_email_corporativo`, `mentor_phone_number`, `mentor_sales_role` |
| Auditoría | `created_time`, `created_by_name`, `modified_time`, `modified_by_name`, `loaded_at` |

Los nombres de los 7 pasos están confirmados contra un export del módulo ("Recruitment Report",
2,439 records, jun–ago 2026). Conserven el prefijo numérico para que el orden del funnel sea
evidente en la tabla.

## Tres peticiones que si no se cumplen rompen el dashboard

### 1. `sales_team_matching_id` como el **ID** del lookup, no solo el nombre
Es la única llave limpia hacia `dim_sales_team_member.member_id`. Es exactamente el problema que
ya tenemos con `sales_recruitment` (ver arriba): un lookup exportado como texto falla ~50% del
tiempo. Manden las dos columnas — `_id` y `_name` — pero el `_id` es el que importa.

### 2. `mentor_email_corporativo`
Es el join del mentor hacia `dim_sales_team_member.email` y hacia `dwh.dim_staff.sale_rep_email`.
Sin ese email no podemos contar las ventas que produce cada mentor, que es la mitad del valor
del reporte.

### 3. Fechas como `date` / `timestamp`, **no `varchar`**
En `dim_sales_team_member` casi todas las fechas vienen como texto (`created_time`,
`trainee_firmado`, `welcome_call`…), lo que obliga a `LEFT(created_time, 7)` y castings en cada
query y hace imposible usar índices o `DATEDIFF` sin convertir primero. Aprovechemos la tabla
nueva para no arrastrar ese patrón.

## Notas de calidad que ya observamos (contexto, no bloqueos)

Medidas sobre el export de jun–ago 2026 (2,000 filas). **No "arreglen" ninguna de estas cosas** —
el dashboard ya las modela; solo las listamos para que no las confundan con errores de ETL.

| Observación | Dato |
|---|---|
| `(1) Llamado` está en el 100% de los records | es la base del funnel |
| `(2) Citado` | 597 (29.9%) |
| `(3)`–`(6)` llegan casi siempre juntas y **con la misma fecha** | 173 de 174 |
| `(7) Reunión con Mentor` | 43 (2.1%) |
| `Mentor Asignado` **excede** a los asistentes | 453 con mentor, de los cuales 316 nunca asistieron |
| `Sales Team Created Date` | 23 (1.1%) |

- **Las cuatro sesiones se sellan el mismo día.** El Solar Academy es un evento de un día que
  cubre los 4 módulos, así que (3)(4)(5)(6) no son 4 etapas de caída. Mándenlas separadas igual
  — el dashboard las colapsa en una y solo abre el detalle si algún día divergen.
- **`(2) Citado` es una fecha futura**: la del Solar al que se le citó (llega hasta oct 2026 en un
  export de agosto). No es un timestamp de evento pasado; no la validen contra `created_time`.
- **Fast-track:** hay reclutas que no pasan por el Solar Academy regular de los miércoles; el
  mentor se lo da directo. En el export se ven como el patrón (1)+(2)+(7) sin (3)–(6) (16 casos) y
  (1)+(7) sin nada más (5 casos). El dashboard los cuenta con una regla monotónica: una etapa está
  alcanzada si tiene fecha propia **o** la de cualquier etapa posterior.
- **La mediana del lag `(2) Citado` → `(3) Asistió` es 0 días** (162 de 172 el mismo día), pero hay
  7 casos de más de una semana y 3 de más de un mes. Por eso el dashboard filtra por cita y por
  asistencia como dos ejes independientes.
- **`presencial_o_virtual` codifica dos cosas** en un solo string: sede + horario
  (`Presencial Ponce` vs `Presencial Ponce Nocturno`). Mándenlo tal cual; el parsing es nuestro.
- **`email` corporativo:** en `dim_sales_team_member` solo el 61% de los reclutas de 2026 lo
  tienen (111 de 182). Esperamos algo parecido aquí; no es un problema del ETL.
- **Distribución de `source`** (para que cuadren el volumen): Indeed 1,403 · Website 349 ·
  Referido - Vendedor 208 · Otro/Organic 35 · Referido - Empleado 2 · Facebook 1 · vacío 2.

## Cómo validamos cuando aterrice

`npx tsx --env-file=.env.local scripts/inspect-dim-sales-recruitment.mts` — reporta columnas,
`COUNT(*)`, el picklist completo de `presencial_o_virtual`, cuántos records son fast-track, y
verifica que `sales_team_matching_id` resuelva contra `dim_sales_team_member.member_id` con 0
huérfanos (mismo chequeo que `verify-dim-channel-info-link.mts` hace para `channel_info`).

Además contrasta los conteos por etapa contra la tabla de arriba. Ojo que el export era de 2,000
filas de 2,439 records (límite del reporte de Zoho), así que los números de la tabla son un piso,
no un total — la tabla completa debe dar **más**, nunca menos.

## Aparte: el permiso de API en Zoho

Independientemente de esta tabla, vale la pena que alguien con admin de Zoho habilite
"API access" en el perfil del usuario integrado (Setup → Users & Control → Security Control →
Profiles). Hoy eso tiene roto en silencio a `getPromoterLeadStats` en `lib/zoho-crm.ts`: atrapa
el 403 y devuelve un mapa vacío, así que los leads en `/promotores` salen en "—".
