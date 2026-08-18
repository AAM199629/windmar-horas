# Handoff: Dashboard de Ventas — Rediseño WindMar HOME

## Overview
Reporte ejecutivo de fuerza de venta y canales (datos de Zoho CRM, mercado **Puerto Rico**). Es un dashboard de una sola página con KPIs, tablas comparativas (período actual vs período de comparación) y donut charts. El rediseño aplica la identidad de marca **WindMar HOME**, mejora jerarquía/organización y añade un control de navegación segmentado tipo *liquid glass*.

## About the Design Files
El archivo `Dashboard de Ventas.dc.html` de este bundle es una **referencia de diseño creada en HTML** — un prototipo que muestra el look final y el comportamiento esperado, **no es código de producción para copiar tal cual**. La tarea es **recrear este diseño en el entorno del codebase destino** (React, Vue, etc.) usando sus patrones y librerías establecidas. Si aún no existe entorno, elige el framework más apropiado e impleméntalo ahí. El `.dc.html` usa un runtime de componentes propio (etiquetas `<x-dc>`, `<sc-for>`, clase `Component`) que **NO** debes reproducir — extrae de él el markup, los estilos inline y los datos.

## Fidelity
**Alta fidelidad (hifi).** Colores, tipografía, espaciado e interacciones son finales. Recrear pixel-perfect con las librerías/patrones del codebase.

## Layout general
- Contenedor central `max-width: 1320px`, centrado, `padding: 0 28px 72px`.
- Orden vertical: Header → Barra de filtros → Leyenda de períodos → **Nav segmentado liquid glass (sticky)** → KPI cards → Vendedores activos/Mix → Programa Asalariado → Ventas por Lead Source → Booths Mall & Home Depot → Cambaceo → Booths Independientes & Eventos.
- Fuentes: **Bebas Neue** (solo títulos hero, uppercase, weight 400) y **Montserrat** (todo lo demás; 400/500/700/800/900).

## Design Tokens

### Colores
| Token | Hex | Uso |
|---|---|---|
| Azul marca | `#1D429B` | acentos, headers de tabla, links |
| Azul profundo | `#21274E` | texto, headers de tabla, fondos oscuros |
| Azul vibrante | `#0079C0` | acento KPI / segmento donut |
| Azul header B | `#2E3866` | columna "período B" en thead |
| Naranja | `#F89B24` | acento principal, full commission |
| Naranja hover | `#E28312` | texto naranja sobre claro |
| Naranja claro | `#FBC074` | segmento donut |
| Verde (▲) | `#1E9E62` | variación positiva |
| Rojo (▼) | `#D64545` | variación negativa |
| Plano (—) | `#9AA3B5` | sin cambio / texto sutil |
| Texto | `#21274E` | cuerpo de tablas |
| Gris medio | `#6B7388` | labels secundarios |
| Borde claro | `#E7ECF6` | bordes de tarjeta |
| Borde fila | `#EDF0F5` | divisores de tabla |
| Zebra fila | `#F8FAFD` | fila par |
| Fila total | `#EFF3FA` | fila TOTAL |

### Fondo de página
```css
background:
  radial-gradient(1100px 520px at 12% -8%, #E2EAFB 0%, transparent 60%),
  radial-gradient(900px 480px at 100% 4%, #FBE9D0 0%, transparent 55%),
  linear-gradient(180deg, #EEF2F9 0%, #E9EDF6 100%);
background-attachment: fixed;
```

### Radios
Tarjetas 18–20px · pills/segmentos 999px · inputs 12px · headers de tabla esquinas 10px.

### Sombras
- Tarjeta: `0 8px 24px rgba(33,39,78,0.10)`
- Header banda: `0 18px 40px rgba(29,66,155,0.25)`

### Tipografía (escala usada)
- Título hero (Bebas Neue): ~64px / line-height .92 / uppercase.
- Título de sección: 19px weight 800 uppercase letter-spacing .04em color `#21274E`.
- KPI valor: 46px weight 900 letter-spacing -.02em.
- "Vendedores activos" valor: 58px weight 900.
- Eyebrow header: 13px weight 700 letter-spacing .14em uppercase color `#AFC3EE`.
- Labels KPI: 12px weight 800 letter-spacing .07em uppercase color `#6B7388`.
- Celdas tabla: 13–14px; thead 12px weight 800 letter-spacing .06em uppercase blanco.

## Screens / Views

### 1. Header
- Banda con `linear-gradient(180deg, #1D429B 0%, #21274E 100%)`, `border-radius: 0 0 28px 28px`, padding `40px 44px 38px`, sombra azul. Glow decorativo: círculo radial naranja `rgba(248,155,36,.18)` arriba-derecha.
- Izquierda: eyebrow (barrita naranja 28×3px + texto "FUERZA DE VENTA Y CANALES · REPORTE EJECUTIVO · ZOHO CRM") y título Bebas Neue blanco "DASHBOARD **DE VENTAS**" (segunda palabra en `#F89B24`).
- Derecha: logo `windmar-white-yellow.png` (~78px alto, object-fit contain).

### 2. Barra de filtros (tarjeta blanca, radius 20px)
- Bloque "PERÍODO A — ACTUAL" (punto azul profundo) con 2 inputs `type=date` (06/01/2026 – 06/22/2026).
- Bloque "PERÍODO B — COMPARACIÓN" (punto gris `#9AA3B5`) con 2 inputs (05/01/2026 – 05/22/2026).
- Inputs: borde `1.5px solid #DDE3EE`, radius 12px, padding `10px 14px`, weight 600 color `#21274E`.
- Botón "Aplicar": sólido `#21274E`, blanco, radius 12px.
- Botón "↓ Descargar PDF": sólido `#F89B24`, blanco, alineado a la derecha (`margin-left:auto`).

### 3. Leyenda de períodos
Fila con dos grupos: "PERÍODO A · 1 jun – 22 jun 2026" (punto azul profundo) y "PERÍODO B · 1 may – 22 may 2026" (punto gris), separados por divisor vertical.

### 4. Nav segmentado "liquid glass" (sticky, `top:16px`, z-index 50, centrado)
Contenedor pill:
```css
display:flex; gap:4px; padding:6px; border-radius:999px;
background:rgba(255,255,255,0.38);
backdrop-filter:blur(20px) saturate(180%);
-webkit-backdrop-filter:blur(20px) saturate(180%);
border:1px solid rgba(255,255,255,0.65);
box-shadow:0 8px 30px rgba(33,39,78,0.16),
           inset 0 1px 1px rgba(255,255,255,0.85),
           inset 0 -1px 2px rgba(33,39,78,0.06);
```
Segmentos (botones, 13.5px weight 700, padding `9px 20px`, radius 999px, `transition: all .25s ease`): **Resumen · Asalariado · Lead Source · Booths · Cambaceo**.
- Activo: `background:linear-gradient(180deg,#2A56C4 0%,#1D429B 100%)`, texto blanco, `box-shadow:0 4px 14px rgba(29,66,155,0.45), inset 0 1px 1px rgba(255,255,255,0.4)`.
- Inactivo: `background:transparent`, texto `#3A4156`.
- Hover: `filter:brightness(1.04)`.

### 5. KPI cards (grid 5 col, gap 18px)
Tarjeta blanca radius 18px, sombra, `border-top: 4px solid <acento>` (acentos alternados: azul, naranja, vibrante, azul profundo, naranja). Estructura: label uppercase → valor 46px weight 900 `#21274E` → sub 13px `#9AA3B5` → divisor → "may 1–22: **prev**".
Datos: Ventas Totales 493 (prev 510) · Variación -17 (-3.3% vs may 1–22) · Asalariados 237 (prev 229) · % Asalariados 48.1% (prev 44.9%) · Full Commission 256 (prev 281).

### 6. Vendedores Activos + Mix (tarjeta, grid 3 col)
- Col 1: "VENDEDORES ACTIVOS" → **374** (58px) → 'Status "Activo" en Sales Teams' (cursiva gris).
- Col 2 (borde izq): Asalariados **82** (21.9% del equipo) · Full Commission **292** naranja (78.1%).
- Col 3 (borde izq): donut + leyenda. Donut 130px `conic-gradient(#21274E 0 21.9%, #F89B24 21.9% 100%)` con círculo blanco central 74px. Leyenda "Asalariados: 82 (21.9%)" / "Full Commission: 292 (78.1%)".

### 7. Programa Asalariado (grid 1.5fr / 1fr)
- **Tabla** (cols: Rol / Jun 1–22 / % / May 1–22 / % / Var.):
  - Empleado - Consultor: 81 · 16.4% · 82 · 16.1% · ▼ –1
  - Empleado - Líder: 96 · 19.5% · 74 · 14.5% · ▲ +22
  - Empleado - Gerente: 60 · 12.2% · 73 · 14.3% · ▼ –13
  - TOTAL Asalariados: 237 · 48.1% · 229 · 44.9% · ▲ +8
  - Full Commission: 256 · 51.9% · 281 · 55.1% · ▼ –25
- **Donut "Mix de Ventas — Jun 1–22"** 168px `conic-gradient(#21274E 0 48.1%, #F89B24 48.1% 100%)`, hueco 92px. Leyenda Asalariados 237 (48.1%) / Full Commission 256 (51.9%).

### 8. Ventas por Lead Source (grid .85fr / 1.4fr)
- **Donut multicolor 178px** "Top Sources — Jun 1–22" (hueco 96px). Stops conic acumulados:
  ```
  #21274E 0 51.1%        /* Cuenta Propia */
  #F89B24 51.1% 66.5%    /* Home Depot */
  #1D429B 66.5% 77.2%    /* Canvassing */
  #6B7388 77.2% 84.5%    /* WH Telemarketing */
  #1E9E62 84.5% 91.8%    /* Booth Peq & Evento */
  #0079C0 91.8% 96.9%    /* Booths (Malls) */
  #FBC074 96.9% 98.9%    /* Showroom */
  #D64545 98.9% 100%     /* C. Propia - Instala y Gana */
  ```
  Leyenda en grid 2 col con puntos de color.
- **Tabla** (Lead Source / Jun 1–22 / % / May 1–22 / Var. — header azul `#1D429B`):
  - Cuenta Propia 182 · 51.1% · 215 · ▼ –33
  - Home Depot 55 · 15.4% · 58 · ▼ –3
  - Canvassing 38 · 10.7% · 51 · ▼ –13
  - Booth Peq & Evento 26 · 7.3% · 34 · ▼ –8
  - WH Telemarketing (Cita/Lead WH) 26 · 7.3% · 43 · ▼ –17
  - Booths (Malls) 18 · 5.1% · 37 · ▼ –19
  - Showroom 7 · 2.0% · 33 · ▼ –26

### 9. Booths — Mall & Home Depot (grid 2 col)
- **Home Depot** (10 ubicaciones), cols Ubicación / Jun / May / Var.:
  Caguas 2·7·▼–5 · Colobos 4·6·▼–2 · Escorial 6·5·▲+1 · Hatillo 6·3·▲+3 · Humacao 4·3·▲+1 · Mayaguez 2·3·▼–1 · Montehiedra 9·6·▲+3 · Plaza del Sol 2·15·▼–13 · Ponce 11·9·▲+2 · Rexville 4·6·▼–2 · **TOTAL HD 50·63·▼–13**.
- **Malls** (4 ubicaciones): Plaza las Americas 3·13·▼–10 · Plaza del Caribe 6·10·▼–4 · Santa Rosa 3·3·— · Aguadilla Mall 0·1·▼–1 · **TOTAL Malls 12·27·▼–15**.

### 10. Cambaceo — Coordinadores (tabla)
Cols: Coordinador / Leads Jun / Ventas Jun / Leads May / Ventas May / Var. Vtas (header azul `#1D429B`):
- Abdiel Edmundo Oliveras Rivera 91·6·123·15·▼–9
- Christian Ariel Gonzalez Jimenez 59·2·29·3·▼–1
- Javier Alberto Gonzalez Acevedo 34·8·45·18·▼–10
- Javier Andres Larregoity 18·2·22·2·—
- Lorenzo Trinidad Adorno 14·2·78·6·▼–4
- Nashualiz Marquez 0·0·1·1·▼–1
- Nashualiz Marquez Febres 17·10·35·6·▲+4
- Oficina Roosevelt 4·0·0·0·—
- Orlando Pena Ayala 33·3·38·6·▼–3
- Roberto Luis Irizarry Alicea 28·8·47·4·▲+4
- **TOTAL 298·41·418·61**

### 11. Booths Independientes & Eventos (tabla)
Badge pill naranja "8 fuentes activas · jun 1–22". Cols: Booth/Fuente / Jun / % / May / Var.:
- Booth Peq & Evento 7·26.9%·4·▲+3
- › Amigos 0·0.0%·1·▼–1 · › Econo 1·3.8%·11·▼–10 · › Eventos Especiales 6·23.1%·6·— · › Mr. Special Supermarket 1·3.8%·0·— · › National Ferreteria 2·7.7%·0·— · › Pueblo 1·3.8%·2·▼–1 · › Selectos 5·19.2%·3·▲+2 · › SuperMax 3·11.5%·5·▼–2 · › Trailer Booth 0·0.0%·2·▼–2
- **TOTAL 26·100%·34**

## Estilo de tabla (reusable)
```css
/* thead th */ padding:14px 18px; font-size:12px; font-weight:800; letter-spacing:.06em;
text-transform:uppercase; color:#fff; text-align:right; white-space:nowrap;
/* th primera col */ text-align:left; border-radius:10px 0 0 0;
/* th columna período B */ background:#2E3866;  /* resto: #21274E o #1D429B */
/* td */ padding:13px 18px; font-size:14px; color:#21274E; text-align:right;
/* td primera col */ text-align:left; font-weight:500;
/* fila */ border-bottom:1px solid #EDF0F5;  /* par */ background:#F8FAFD;
/* fila TOTAL */ background:#EFF3FA; font-weight:800; border-top:2px solid #21274E;
/* celda VAR */ font-weight:800; color: verde/rojo/plano + flecha ▲/▼/—
```
Tarjeta de sección:
```css
background:linear-gradient(180deg,#FFFFFF 0%,#F7F9FE 100%);
border:1px solid #E7ECF6; border-radius:20px;
box-shadow:0 8px 24px rgba(33,39,78,0.10); padding:30px 34px;
```
Header de sección: barra vertical 5×26px `#1D429B` radius 999px + título uppercase 19px weight 800 `#21274E`; a la derecha "jun 1–22 vs may 1–22" cursiva `#9AA3B5`.

## Interactions & Behavior
- **Nav segmentado**: click → scroll suave a la sección (`window.scrollTo({top: el.top + scrollY - 88, behavior:'smooth'})`). Cada sección tiene `id` (`sec-kpi`, `sec-asalariado`, `sec-lead`, `sec-booths`, `sec-cambaceo`) y `scroll-margin-top:96px`.
- **Auto-highlight por scroll**: `IntersectionObserver` con `rootMargin:'-45% 0px -50% 0px'` marca el segmento activo según la sección visible.
- "Aplicar" y "Descargar PDF": placeholders visuales (sin lógica aún). Si se implementa, "Aplicar" re-consulta con el rango de fechas; "Descargar PDF" exporta el reporte.
- Variaciones: helper que dado un número entero devuelve `{texto, color, flecha}` → `>0` verde "▲ +n", `<0` rojo "▼ –n", `0/null` plano "—".

## State Management
- `activeSection` (string id) — controlado por click y por IntersectionObserver.
- Rango de fechas Período A / Período B (4 valores date) — alimentaría las consultas reales.
- Las tablas/donuts se alimentan de arrays de datos (ver valores arriba); en producción vienen de Zoho CRM.

## Assets
- `windmar-white-yellow.png` — logo WindMar HOME (versión blanco/amarillo, para fondos oscuros). Incluido en este bundle. **Regla de marca: mercado PR → logo WindMar HOME; nunca mezclar con WH Services (Colombia).** Usar el sistema de logos existente del codebase si ya está disponible.

## Files
- `Dashboard de Ventas.dc.html` — prototipo de referencia (markup + estilos inline + datos en la clase `Component`).
- `windmar-white-yellow.png` — logo del header.
