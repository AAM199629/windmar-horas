# Handoff a Data/ETL — Channel Info para el Dashboard de Finanzas & ROI

**Actualizado tras la migración de `dwh.dim_channel_info` (jul 2026).**

## ✅ Lo que quedó resuelto con la migración

`dwh.dim_channel_info` (977 filas) es exactamente la dimensión que necesitábamos. Trae por evento:
`zoho_channel_id`, `nombre_channel_info`, `pueblo`, `tipo_de_evento`, `booths_status`,
**`fecha_inicio` / `fecha_fin`** y **`inversion_fija` / `inversion_variable`**. Los 14 eventos que
teníamos hardcodeados en el dashboard están los 14 presentes. **Gracias.** Con esto el dashboard puede
leer fechas + costo del warehouse en vez de una lista manual.

El join dimensión funciona perfecto:
`dwh.dim_lead_source.channel_info = dwh.dim_channel_info.zoho_channel_id` → **0 IDs sin match.**

## ⚠️ Lo que todavía bloquea la atribución de ventas por evento

El dashboard atribuye cada venta a su evento vía el `channel_info` que trae **el lead**:

```
fact_deals.associated_lead → fact_leads → dim_lead_source.channel_info → dim_channel_info
```

El problema: **el 75% de los leads de booth no traen `channel_info`.**

Medición (leads con `lead_source = 'Booth Pequeño / Evento'` creados desde 2026-06-01):

| Métrica                                             | Valor      |
|-----------------------------------------------------|-----------:|
| Total leads                                         | 1,081      |
| Con `channel_info` = **NULL**                       | **807 (75%)** |
| Con `channel_info` que NO matchea dim_channel_info  | 0          |

Por eso 9 de nuestros 14 eventos (los nuevos de jun–jul 2026: BSI Festival Aibonito, Supermax De Diego,
Hospital San Lucas, Amigo Ceiba, Econo Los Colobos, Econo Florida, Supermax Dorado, Cooperativa
Floricoop, Supermax Guaynabo) muestran **0 ventas** — sus leads caen en ese 75% sin etiquetar.

### La pregunta para ustedes
¿Por qué el 75% de los leads de "Booth Pequeño / Evento" tienen `dim_lead_source.channel_info` en NULL?
- ¿Es que en Zoho el lookup de **Channel Info** en el Lead no se está llenando (captura del vendedor)?
- ¿O el lead SÍ tiene el Channel Info en Zoho pero el ETL a `dim_lead_source.channel_info` no lo arrastra?

Si es lo segundo (ETL), sería el arreglo de mayor impacto: desbloquea toda la sección de Booths & Eventos.

## Nota secundaria (calidad de la dimensión, menor)
Hay algunos eventos duplicados/aliased en `dim_channel_info` (ej. "Supermax - Cidra" aparece con
`fecha_inicio` 2026-04-13 y otra fila 2022-10-01; "Econo - Florida" 2024 vs 2026). No bloquea, pero al
consolidar por `nombre` conviene tenerlo presente.

---
Scripts de verificación (correr con `npx tsx --env-file=.env.local scripts/<x>.mts`):
`inspect-dim-channel-info.mts`, `verify-dim-channel-info-link.mts`, `verify-recent-lead-tagging.mts`.
