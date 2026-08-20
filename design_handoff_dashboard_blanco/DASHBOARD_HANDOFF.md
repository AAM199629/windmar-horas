# Handoff: Dashboard "Canal Mall / Home Depot" — versión fondo blanco (A · Blanco)

## Overview
Rediseño del dashboard de ventas en vivo **Canal Mall / Home Depot** de la web app de WindMar Home.
El objetivo es un look **futurista, limpio y muy organizado sobre fondo blanco**: nav navy
sólido, tarjetas blancas con sombra azulada y glows de color sutiles, barras de ranking con
color + glow suave, mapa de calor mensual, donut de pipeline y tarjetas de leads.

Reemplaza la pantalla actual (que se sentía vacía). Mantiene los mismos datos/secciones del
dashboard original más una **banda de KPIs** arriba para llenar el espacio con información útil.

## About the Design Files
Los archivos de este paquete son **referencias de diseño hechas en HTML/React+Babel** — un
prototipo que muestra el look y el comportamiento buscados, **no código de producción para
copiar tal cual**. La tarea es **recrear este diseño dentro del entorno de tu web app**
(usa tu framework y tus convenciones actuales — React, Vue, etc.), respetando los tokens,
medidas, tipografía y animaciones documentados abajo.

- `dashboard-blanco.html` se abre en el navegador y renderiza el dashboard completo (es la
  referencia visual fiel). Ábrelo para ver exactamente el resultado esperado.
- `src/directionAlight.jsx` contiene la composición de la pantalla (componente `DirectionAL`).
- `src/shared.jsx` contiene los mini-componentes reutilizables (CountUp, AreaSpark, Gauge,
  DonutLight, etc.).
- `src/theme.css` contiene **todos los tokens y clases** del tema.
- `src/data.js` son los datos de ejemplo (extraídos de las capturas; los **leads son
  ficticios** — conéctalos a tus queries reales).

## Fidelity
**Alta fidelidad (hi-fi).** Colores, tipografía, espaciado y animaciones son finales.
Recrear pixel-perfect usando las librerías/patrones de tu codebase. Si ya tienes un design
system propio, mapea estos tokens a los tuyos manteniendo el resultado visual idéntico.

---

## Pantalla: Dashboard Canal Mall / Home Depot

Ancho de diseño: **1360px** (contenido), padding exterior 36px. En tu app debe ser
responsive/fluido — 1360 es solo el ancho de referencia. Apilar en columna única < ~900px.

Orden vertical de bloques (gap 26px entre bloques, salvo lo indicado):
1. **Nav bar** (navy sólido)
2. **Encabezado** (título + toggle Dashboard/Turnos)
3. **Barra de filtro de período**
4. **Banda de KPIs** (4 tarjetas)
5. **Strip de tendencia mensual**
6. **Ventas por Ubicación** (barras de ranking)
7. Fila de 2 columnas: **Detalle Mensual (heatmap)** + **Por Pipeline (donut)**
8. **Leads por Vendedor y Ubicación** (grid de tarjetas)
9. **Tagline** itálica centrada

### 1. Nav bar
- Contenedor: `border-radius: 22px`, fondo `linear-gradient(180deg, #21274E, #1A1F3D)`,
  `box-shadow: 0 12px 30px rgba(33,39,78,0.28)`, padding `12px 18px`, flex row, gap 8px.
- Logo WindMar HOME (blanco+amarillo) a 38px de alto + wordmark **"HORAS"** en Bebas Neue
  22px color naranja `#F89B24`, letter-spacing .06em.
- Items de nav (Montserrat 13.5px/600, color `#A9B6D9`): Inicio · Análisis de Horas ·
  Cambaceo · Mall / Home Depot · Independiente · Dashboard Ventas · Asalariados · Promotores · Bingo.
  - Hover: color blanco + fondo `rgba(255,255,255,0.06)`, radius 12px.
  - **Activo** ("Mall / Home Depot"): texto blanco, fondo
    `linear-gradient(180deg, #F89B24, #E28312)`, `box-shadow: 0 6px 18px rgba(248,155,36,.4)`.
- A la derecha: "chip" con punto verde pulsante + "Datos Zoho · hace 31m".

### 2. Encabezado
- Eyebrow: "CANAL · DASHBOARD DE VENTAS EN VIVO · REDSHIFT" (12px, 700, uppercase,
  letter-spacing .16em, color `#1D429B`).
- Título h1 en **Bebas Neue**, 60px, line-height .9: `Canal ` en navy `#21274E` +
  `Mall / Home Depot` en naranja `#F89B24`.
- A la derecha: toggle pill (fondo `#EEF3FD`, radius 999). Segmento activo "Dashboard":
  texto blanco, fondo `linear-gradient(180deg, #3D6BFF, #1D429B)`, sombra azul. "Turnos":
  texto `#1D429B`.

### 3. Barra de filtro
- Tarjeta blanca (ver token *card-light*), flex row, gap 28px, padding `16px 24px`, radius 20.
- "PERÍODO" (uppercase, 13px/700, azul) + dos pills `#F1F2F5` con borde `#E4E5E9`, radius 12,
  texto navy: "Desde 01/01/2026", "Hasta 06/10/2026".
- A la derecha (ml-auto): "Toca cualquier número para ver el detalle" (13px, `#8A8A8F`).

### 4. Banda de KPIs (4 tarjetas, flex gap 16)
Cada tarjeta = *card-light*, padding `22px 24px`, radius 22, `position: relative; overflow:hidden`:
- Línea de acento superior: barra 3px de alto, full-width (con 24px de margen lateral),
  radius 999, color del KPI, opacity .9.
- Glow decorativo: círculo 150px radial `radial-gradient(circle, <color>22, transparent 70%)`
  posicionado top:-50 right:-40.
- Eyebrow (azul) + valor grande en **Bebas Neue 56px**.
- KPIs y colores:
  - **Ventas totales** `470` — azul `#1D429B`, glow `#3D6BFF`. Subtítulo "14 ubicaciones · Ene–Jun".
  - **Canceladas** `92` — rojo `#E0334B`, glow `#FF5D6C`. Subtítulo "del período seleccionado".
  - **Tasa de cancelación** — gauge radial (ver *Gauge*) mostrando `16%`, color `#F89B24`,
    track `#F1F2F5`, size 104, thickness 10.
  - **Pipeline activo** `470` — verde `#1FA971`, glow `#1FA971`. Subtítulo "oportunidades en curso".

### 5. Strip de tendencia mensual
- *card-light*, flex row, gap 28, padding `20px 28px`, radius 22.
- Izquierda: eyebrow "VOLUMEN MENSUAL · VENTAS", "Ene → Jun" (Bebas 40px navy),
  "pico en **Mayo · 156**" (naranja).
- Centro: **AreaSpark** (área con línea, color `#1D429B`), ~760×92.
- Derecha: 6 columnas (Ene–Jun) con el valor de ventas (18px/800 navy) y la etiqueta del mes.
- Valores tendencia (ventas/mes): 51, 62, 89, 89, 156, 23.

### 6. Ventas por Ubicación (barras de ranking)
- *card-light*, padding `30px 34px`, radius 24.
- Header de sección: eyebrow "RANKING DEL PERÍODO" + h3 "Ventas por Ubicación" (Bebas 30px
  navy) + regla de acento naranja (72×3px, radius 999, glow naranja). A la derecha chip
  claro "14 ubicaciones · 470 ventas".
- Filas: grid `230px 1fr 56px`, gap 18, align center, gap vertical 13px.
  - Col 1: nombre (14px/600, `#4B4B4E`, alineado a la derecha).
  - Col 2: track de barra (alto 28px, radius 999, fondo `#EEF3FD`, overflow hidden). Relleno
    con `width = ventas/max*100%`, `background: linear-gradient(90deg, <hue>, <hue>dd)`,
    `box-shadow: 0 2px 12px <hue>55`, radius 999. (max = 51.)
  - Col 3: número (22px/800 navy, alineado derecha).
- Datos (nombre · ventas · hue):
  - Plaza del Caribe · 51 · `#5B8CFF`
  - Plaza las Américas · 49 · `#3D6BFF`
  - Home Depot · Plaza del Sol · 48 · `#22C7E6`
  - Home Depot · Caguas · 40 · `#1FD79B`
  - Home Depot · Colobos · 39 · `#9B6BFF`
  - Home Depot · Mayagüez · 39 · `#FB9F3A`
  - Home Depot · Rexville · 39 · `#FF5D6C`
  - Home Depot · Escorial · 36 · `#FF4D9D`
  - Home Depot · Hatillo · 35 · `#A4D932`
  - Home Depot · Ponce · 35 · `#34B3F1`
  - Home Depot · Montehiedra · 26 · `#15B6A0`
  - Home Depot · Humacao · 21 · `#E07B2E`
  - Aguadilla Mall · 6 · `#B255F0`
  - Santa Rosa Mall · 6 · `#E14BD6`

### 7a. Detalle Mensual (heatmap) — columna izquierda (1.65fr)
- *card-light*, padding `28px 30px`, radius 24. Header: eyebrow "MAPA DE CALOR MENSUAL" + h3 "Detalle Mensual".
- Tabla: columnas `Ubicación | Ene Feb Mar Abr May Jun | Total`.
  - Encabezados: 11px uppercase, `#8A8A8F`; "Total" en naranja.
  - Celda de mes: caja redondeada (radius 9, padding 8px 4px) con fondo
    `rgba(29,66,155, 0.06 + (vtas/max)*0.5)` (max sobre todas las ventas mensuales = 22).
    Número de ventas dentro (14px/700). Si la celda es intensa (t>0.55) texto blanco, si no
    navy; valor 0 = "·" gris. Debajo, si hay cancelaciones, "-N" en rojo (`#E0334B`, o
    `#FFD2D7` sobre celda intensa).
  - Columna Total: ventas (16px/800 navy) + "-canc" en rojo.
  - Fila Total (pie): borde superior 2px `#C8C9CE`, fondo `#F7F8FA`; etiqueta y total grande
    en naranja.
- Datos por ubicación = pares [ventas, canceladas] por mes (Ene..Jun) y total. Ver `src/data.js`
  → `detalleMensual` y `detalleTotal`. Total general: 470 ventas / 92 canceladas.

### 7b. Por Pipeline (donut) — columna derecha (1fr)
- *card-light*, padding `28px 30px`, radius 24. Header: eyebrow "MIX DEL PIPELINE" + h3 "Por Pipeline".
- **DonutLight** size 200, thickness 26, track `#EEF3FD`, segmentos con `stroke-linecap:round`.
  Centro: total `470` (Bebas 40px navy) + "OPORTUNIDADES" (11px, `#8A8A8F`).
- Leyenda debajo: filas con cuadro de color (10px, radius 3), nombre (`#4B4B4E`) y valor (navy/800).
- Segmentos (nombre · valor · hue): Res. Solar · 248 · `#5B8CFF` | Com. Solar · 38 · `#22C7E6`
  | Roofing · 96 · `#1FD79B` | PPS · 31 · `#FB9F3A` | Water · 57 · `#FF4D9D`.

### 8. Leads por Vendedor y Ubicación (datos de muestra)
- *card-light*, padding `28px 30px`, radius 24. Header: eyebrow "DATOS DE MUESTRA" + h3 +
  chip claro con total de leads.
- Grid 2 columnas, gap 14. Cada tarjeta: fondo `#F7F8FA`, borde `#E4E5E9`, radius 16,
  padding `12px 16px`, flex row gap 14:
  - Avatar 38px (radius 12) con iniciales blancas sobre `linear-gradient(135deg, <hue>, <hue>bb)`.
  - Nombre (14.5px/700 navy) + ubicación (12px `#8A8A8F`, truncada).
  - Derecha: leads (19px/800 navy) + "% conv." en verde `#1FA971`.
- Datos: ver `src/data.js` → `leadsVendedor` (ficticio).

### 9. Tagline
- Centrada, itálica, 500, color `#1D429B`, 17px:
  *"No es solo energía, es tranquilidad para ti y tu familia."*

---

## Interactions & Behavior
- **Animación de entrada (gated por visibilidad):** un IntersectionObserver pone `data-anim="on"`
  en la raíz cuando el dashboard entra al viewport. Las barras se rellenan solo entonces.
  El **estado en reposo siempre muestra el valor/ancho real** (importante para SSR, export a
  imagen, y `prefers-reduced-motion`). Replica esto — no animes desde 0 sin garantizar el
  estado final.
- **CountUp:** los números clave cuentan de 0 → valor en 1200ms (ease-out cúbico) cuando son
  visibles; en reposo o con reduced-motion muestran el valor final. Formato `toLocaleString('es-PR')`.
- **Barras:** `@keyframes` de `width:0 → var(--w)` en 1200ms `cubic-bezier(.2,.8,.2,1)`,
  con **stagger de 55ms** por fila. Base/reposo = `width: var(--w)`.
- **Donut/Gauge:** `stroke-dasharray` con `transition: 1s ease`.
- **Hover (recomendado, según el sistema WindMar):** azules oscurecen un paso; press = scale .98;
  el naranja **no anima** (es señalización, no llamada de atención).
- Respetar `@media (prefers-reduced-motion: reduce)` desactivando animaciones.

## State Management
Solo presentación. Estado necesario:
- `desde` / `hasta` (rango de fechas del filtro) → dispara recarga de datos.
- Toggle `Dashboard | Turnos` (vista activa).
- Datasets: ventas por ubicación, detalle mensual, pipeline mix, tendencia, leads. En la app
  vienen de Redshift/Zoho; aquí son datos estáticos de ejemplo (`src/data.js`).

## Design Tokens
Todos están en `src/theme.css` (bloque `.wmx`). Resumen:

**Colores**
- Azul marca `#1D429B` · Navy `#21274E` · Azul brillante `#3D6BFF` · Cian `#22C7E6`
- Naranja (acento) `#F89B24` (hover `#E28312`, claro `#FBC074`)
- Verde `#1FA971` / `#1FD79B` · Rojo (cancelado) `#E0334B` / `#FF5D6C`
- Texto: `#231F20` (cuerpo), `#4B4B4E` (medio), `#8A8A8F` (sutil)
- Superficies: blanco `#FFFFFF`, gris claro `#F7F8FA` / `#F1F2F5`, azul muy claro `#EEF3FD`
- Fondo de página: `#F1F2F5` + grid de puntos `rgba(29,66,155,0.05)` 1px cada 26px

**Tipografía**
- Primaria: **Montserrat** (400/500/600/700/800/900 + itálicas). Display: **Bebas Neue**
  (uppercase, para títulos y números grandes).
- Escala usada: h1 60 · h3 sección 30 · número KPI 56 · número fila 18–22 · cuerpo 13–14 ·
  eyebrow 12 (uppercase, tracking .16em). Números `font-variant-numeric: tabular-nums`.

**Espaciado** (base 4px, igual al sistema WindMar): 4/8/12/16/24/32/48/64/96.
**Radios:** 12 (pills filtro) · 16 (tarjeta lead) · 20 (filtro) · 22 (KPI/nav) · 24 (paneles) · 999 (pills/barras).
**Sombras:** tarjeta `0 8px 24px rgba(33,39,78,.10)` · nav `0 12px 30px rgba(33,39,78,.28)`.
Las sombras siempre con tinte azul-navy, nunca gris neutro.

**Clases clave en `theme.css`:** `.wmx-light` (raíz), `.wmx-card-light` (tarjeta blanca),
`.wmx-bar-track-light` + `.wmx-bar-fill`, `.wmx-table-light`, `.wmx-display`, `.wmx-eyebrow`,
`.wmx-accent-rule`, `.wmx-navlink`, `.wmx-num`.

## Assets
- **Logo:** `assets/windmar-white-yellow.png` (WindMar HOME, variante blanca + sol amarillo,
  para fondos oscuros como el nav). No recolorear ni rehacer el sol. En tu codebase usa el
  asset oficial equivalente.
- **Fuentes:** Montserrat y Bebas Neue. En `dashboard-blanco.html` se cargan desde Google
  Fonts; en producción usa las fuentes que ya tengas (el sistema WindMar las trae localmente).
- **Iconos:** este dashboard no usa iconos. El sistema WindMar recomienda **Lucide** (línea
  fina, 2px) si necesitas añadir alguno. **Sin emoji.**

## Files
- `dashboard-blanco.html` — referencia ejecutable (abre en navegador).
- `screenshots/` — PNGs por sección (01 encabezado+KPIs · 02 tendencia · 03 ventas por
  ubicación · 04 detalle mensual + pipeline · 05 leads). Úsalas para comparar visualmente.
- `src/directionAlight.jsx` — composición de la pantalla (`DirectionAL`, `NavSolid`,
  `KpiLight`, `HeatTableLight`).
- `src/shared.jsx` — `CountUp`, `AreaSpark`, `Gauge`, `DonutLight`, `useAnim`, `Nav`.
- `src/theme.css` — tokens + clases del tema.
- `src/data.js` — datos de ejemplo (`window.WM_DATA`).
- `CLAUDE_CODE_PROMPT.md` — prompt listo para pegar en Claude Code.

> Nota de marca: WindMar exige **fondo blanco** para el cuerpo (no glassmorphism sobre blanco),
> azul para títulos/iconografía y naranja **solo** como acento puntual (cifras clave, reglas
> cortas, CTAs) — nunca como relleno grande ni en texto de cuerpo.
