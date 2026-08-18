# Prompt para Claude Code (VS Code) — Next.js

Copia y pega esto en Claude Code, dentro del repo de tu web app **Next.js**. Antes, **arrastra
esta carpeta `design_handoff_dashboard_blanco/` a la raíz de tu proyecto** (o ponla donde
Claude Code pueda leerla).

---

Tengo un paquete de referencia de diseño en `design_handoff_dashboard_blanco/`. Quiero que
reimplementes el dashboard **"Canal Mall / Home Depot"** de mi app **Next.js** con ese diseño
exacto.

Antes de escribir código:
1. Lee `design_handoff_dashboard_blanco/DASHBOARD_HANDOFF.md` completo — tiene layout, tokens,
   colores, tipografía, medidas, animaciones y los datos de cada sección.
2. Abre `design_handoff_dashboard_blanco/dashboard-blanco.html` en el navegador para ver el
   resultado visual objetivo (es la referencia fiel).
3. Revisa `src/directionAlight.jsx`, `src/shared.jsx`, `src/theme.css` y `src/data.js` para
   entender la estructura y los valores exactos.

Contexto del stack (ajústalo a lo que detectes en el repo):
- **Next.js** (revisa si es App Router `app/` o Pages Router `pages/`) + React.
- Usa **TypeScript** si el repo lo usa.
- Para estilos, usa lo que ya exista en el repo: si hay **Tailwind**, define los tokens en
  `tailwind.config` y usa utilidades/`@apply`; si hay **CSS Modules** o styled-components,
  síguelo. No introduzcas una librería de estilos nueva sin avisar.
- Los componentes del dashboard deben ser **Client Components** (`'use client'`) porque usan
  estado/efectos para las animaciones e `IntersectionObserver`.

Reglas de implementación:
- **Recrea el diseño en el stack de ESTE repo.** NO copies el HTML/JSX de referencia tal cual;
  es un prototipo en React+Babel suelto.
- Hi-fi / pixel-perfect: respeta colores, tipografía (Montserrat + Bebas Neue), espaciado,
  radios, sombras (siempre con tinte azul-navy) y las animaciones (count-up, relleno de barras
  con stagger, donut/gauge con transición). Las animaciones deben **gatillarse por visibilidad**
  y dejar el **estado final en reposo** (nada en 0); respeta `prefers-reduced-motion`.
- **Fuentes:** carga Montserrat y Bebas Neue con `next/font/google` (no `<link>` manual). Si ya
  cargas estas fuentes en el repo, reúsalas.
- **Logo/imágenes:** usa `next/image`. Pon el logo en `public/` (o usa tu asset oficial de WindMar).
- Mantén las mismas secciones y orden: nav, encabezado, filtro de período, banda de 4 KPIs,
  strip de tendencia, **Ventas por Ubicación** (barras), fila Detalle Mensual (heatmap) +
  Por Pipeline (donut), Leads por Vendedor, y la tagline.
- Conecta los datos a mis fuentes reales (Redshift/Zoho). Si tienes un endpoint/API route,
  cárgalos por ahí; los **leads del paquete son ficticios** (placeholder de layout).
- Hazlo **responsive** (1360px es solo el ancho de referencia; colapsa a 1 columna en móvil).
- Marca WindMar: **cuerpo en fondo blanco** (sin glass sobre blanco), azul para títulos,
  **naranja solo como acento puntual**, sin emoji.

Plan sugerido:
1. Define tokens (Tailwind theme o variables CSS) desde la sección "Design Tokens".
2. Configura las fuentes con `next/font/google`.
3. Crea componentes reutilizables (Client Components): `KpiCard`, `RankBar`, `Gauge`, `Donut`,
   `Heatmap`, `LeadCard`, `CountUp`, `AreaSpark`.
4. Compón la página/ruta del dashboard y conéctala a los datos.
5. Verifica contra `dashboard-blanco.html` y ajusta hasta que coincida.

Empieza leyendo `DASHBOARD_HANDOFF.md`, dime qué router y sistema de estilos detectaste, y tu
plan antes de implementar.
