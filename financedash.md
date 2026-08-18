# Prompt para Claude Code — Dashboard de Finanzas & ROI de Booths (WindMar HOME)

> Copia todo lo que sigue (desde "## Contexto") y pégalo en tu chat de Claude Code.
> Ajusta los TODO marcados con 🔧 según tus credenciales/IDs reales de Zoho.

---

## Contexto

Quiero construir un **dashboard web de finanzas y ROI** para WindMar HOME (Puerto Rico) que analice
la rentabilidad de nuestros canales de venta. Es de uso interno para los **gerentes de cada canal**.
Ya existe un diseño aprobado (mockup) que debes replicar en look & feel; tu trabajo es implementarlo
como app real y **conectar los datos en vivo desde Zoho CRM** (más mis hojas de contratos/costos).

Mercado: **Puerto Rico → logo WindMar HOME** (nunca el de WH Services / Colombia).

## Stack sugerido

- Frontend: React + Vite (o Next.js si prefieres SSR). Charts con Recharts.
- Backend ligero: Node/Express (o Next API routes) que hable con la API de Zoho — **las credenciales
  de Zoho NUNCA van en el frontend**, solo en el servidor.
- Auth a Zoho: OAuth2 (refresh token) contra Zoho CRM API v3.
- Estado/fetching: React Query.

## Layout general

- **Sidebar fija** (gradiente azul `#1D429B → #21274E`, texto blanco) con el logo WindMar HOME arriba
  (variante blanco/amarillo) y 5 items de navegación con ícono (Lucide) + borde-izquierdo naranja
  `#F89B24` en el activo:
  1. Resumen Ejecutivo (`layout-dashboard`)
  2. Home Depot (`store`)
  3. Centros Comerciales (`building-2`)
  4. Booths & Eventos (`tent`)
  5. Cambaseo (`users`)
- **Topbar blanca** con: eyebrow (canal/subtítulo), título de sección grande en azul, y un chip de
  período a la derecha (ej. "Junio 2026 · Mensual").
- **Selector de período**: mensual global para todos los canales; Home Depot tiene además vista
  **semestral** (sumar 6 meses).
- Cada sección abre con una fila de **tarjetas KPI** (label en mayúsculas gris, número grande azul,
  subtítulo). Colores semánticos: verde `#1E9E63` positivo, rojo `#D7443A` negativo, naranja
  `#F89B24` acento, azul profundo `#21274E` costos.

## Sistema visual (design system WindMar HOME)

- Tipografía: **Montserrat** (cuerpo/títulos, pesos 600–900), Bebas Neue solo display si hace falta.
- Tokens: azul primario `#1D429B`, azul profundo `#21274E`, naranja `#F89B24`, grises
  `#F7F8FA / #F1F2F5 / #E4E5E9 / #8A8A8F / #4B4B4E`.
- Tarjetas: fondo blanco, borde `1px #E4E5E9`, radio 16–18px, sombra muy sutil.
- Fondo de la zona de contenido: `#F7F8FA`.

---

## Secciones y lógica de negocio

### 1) Resumen Ejecutivo
KPIs consolidados (vista mensual): **Ingreso mensual estimado**, **Costo/pago mensual**
(incluye prorrateo del pago semestral de Home Depot = $500,000 ÷ 6), **Ganancia neta mensual**
(con % de margen).
Debajo, una gráfica **"Aporte por canal"**: una barra horizontal por canal (Home Depot, Centros
Comerciales, Booths & Eventos, Cambaseo) mostrando **ingreso generado** vs. una línea punteada
naranja del **costo del canal**, y a la derecha el monto + neto (verde/rojo).

### 2) Home Depot
- **10 tiendas.** Acuerdo: pagamos un lump sum de **$500,000 semestral** a Home Depot.
- Ingreso que generamos: **$50 por panel vendido** + **$200 por batería vendida** en cada tienda.
- KPIs: Generado (semestre), Pago a Home Depot ($500K), **% cobertura de la meta** (generado÷500K),
  unidades vendidas (paneles/baterías).
- Gráfica con **3 vistas conmutables** del progreso hacia los $500K:
  - *Por tienda*: barras verticales por tienda + línea punteada de "meta por tienda" ($500K÷10 = $50K).
  - *Aporte a meta*: una sola barra apilada (cada tienda un segmento) vs. el faltante.
  - *Progreso*: dona/gauge con % global + generado / pago / diferencia.
- **Tabla de ranking ordenable** por cualquier columna (tienda, paneles, baterías, ganancia mensual,
  ganancia semestral) con **semáforo**: verde "Productiva" (≥100% de su meta), ámbar "En meta"
  (85–99%), rojo "Mejorar" (<85%).
- Soportar suma **semestral por tienda** además de la mensual.

### 3) Centros Comerciales (PUD Malls)
- **4 centros**, cada uno con su **costo mensual fijo** propio (varía $3,000 / $4,000 / $5,000). 🔧
- La ganancia se mide por **pipeline**:
  - Ventas de **solar y roofing** → 15% del **EPC** (costo del equipo).
  - Ventas de **water y baterías portátiles Anker** → 10% de cada venta.
  - `ganancia = 0.15 * EPC_solar_roofing + 0.10 * ventas_water_anker`
- Barras de **avance hacia el costo mensual** por mall (ganancia ÷ costo = %), con color por
  cumplimiento y el desglose (EPC→15%, water/Anker→10%) bajo cada barra.

### 4) Booths & Eventos (independientes)
- Cada uno tiene **costo fijo mensual** O **costo fijo por cantidad de días** (1 día, 3 días, 1 semana…).
- Mostrar **días activos** y **ganancia neta** por evento.
- KPIs: ganancia neta total, costo total, días activos totales, ganancia por día.
- Tabla/lista por booth: tipo (Mensual / Por días), días, neto por día, ganancia, barra comparativa.

### 5) Cambaseo (canvassing)
- **Coordinadores** (actualmente 7 confirmados; debe haber 8 — 🔧 falta un nombre):
  Orlando Fuentes, Abtiel, Javier Gonzalez, Nachualis Marquez, Lorenzo, Javier Larrey Goiti,
  Roberto Nieves.
- Costos por coordinador:
  - **Guagua**: ~$500 mensuales.
  - **Salario**: $500 semanales (≈ $500 × 4.33 = $2,165 mensuales).
  - **Comisión por ventas de solar/roofing**: **$50/venta de abril a septiembre**,
    **$100/venta de octubre a marzo** (depende del mes del período seleccionado).
  - `costo_total = 500 + (500*4.33) + ventas * comision_del_mes`
- KPIs: ventas solar/roofing totales, costo operativo, comisiones pagadas, ganancia neta.
- Tabla por coordinador: ventas, comisión, guagua, salario, costo total, ganancia neta (ordenada por
  desempeño, con barra comparativa).
- 🔧 **PENDIENTE DE CONFIRMAR**: la "ganancia" para la compañía por cada venta de Cambaseo. En el
  mockup se asumió ~$3,000/venta (≈15% de un EPC promedio). Reemplazar por la fórmula real:
  probablemente `ganancia_compañia = 0.15 * EPC` de cada venta canvasseada (igual que malls).

---

## Conexión a datos (Zoho CRM + hojas internas)

> Implementa una capa de servicio en el backend que normalice todo a estos objetos antes de mandarlos
> al frontend. Donde Zoho no tenga el dato (contratos/costos), usa una hoja de Google Sheets / tabla
> de config que yo mantengo.

### Zoho CRM
- Auth OAuth2: usa `ZOHO_CLIENT_ID`, `ZOHO_CLIENT_SECRET`, `ZOHO_REFRESH_TOKEN` desde variables de
  entorno. Maneja el refresh de access token automáticamente. 🔧
- Las ventas de solar/roofing/water/Anker viven como **Deals/Potentials** (o módulo custom). 🔧
  Confirma el módulo y los nombres de campo reales:
  - Producto/categoría (Solar, Roofing, Water, Anker) → campo 🔧
  - **EPC / costo del equipo** → campo 🔧
  - Monto de la venta (para water/Anker 10%) → campo 🔧
  - **Canal/origen**: Home Depot (¿cuál tienda?), Mall (¿cuál?), Booth/Evento, Cambaseo → campo 🔧
  - Para Home Depot: **# de paneles** y **# de baterías** por deal/tienda → campo 🔧
  - Coordinador de Cambaseo (owner o lookup) → campo 🔧
  - Fecha de cierre (para agrupar por mes/semestre) → `Closing_Time` / campo 🔧
- Usa la **COQL API** (`/crm/v3/coql`) para traer agregados por mes y por canal, o pagina los
  registros y agrega en el servidor.

### Datos de configuración (no en Zoho)
- **Costos mensuales de los 4 malls** (tabla/sheet). 🔧
- **Costos de booths/eventos** (tipo mensual o por días, días activos, monto). 🔧
- **Coordinadores de Cambaseo** + costo de guagua/salario por si varían. 🔧
- **Acuerdo Home Depot**: $500,000/semestre, $50/panel, $200/batería (constantes; configurables).

### Objetos normalizados que debe consumir el frontend

```ts
type Periodo = { mes: string; tipo: 'mensual' | 'semestral' };

type HomeDepotTienda = { nombre: string; paneles: number; baterias: number;
  gananciaMensual: number; gananciaSemestral: number };

type Mall = { nombre: string; costoMensual: number; epcSolarRoofing: number;
  ventasWaterAnker: number; ganancia: number; pctMeta: number };

type Booth = { nombre: string; tipoCosto: 'mensual' | 'dias'; dias: number;
  costo: number; gananciaNeta: number };

type Coordinador = { nombre: string; ventas: number; comision: number;
  guagua: number; salario: number; costoTotal: number; gananciaNeta: number };
```

## Fórmulas (resumen)

```
HomeDepot.ingreso        = paneles*50 + baterias*200
HomeDepot.metaSemestre   = 500000
HomeDepot.metaPorTienda  = 500000 / 10
Mall.ganancia            = 0.15*EPC_solar_roofing + 0.10*ventas_water_anker
Mall.pctMeta             = ganancia / costoMensual
Booth.gananciaNeta       = ingresoPipeline - costo
Cambaseo.comisionMes     = (mes in [abr..sep]) ? 50 : 100
Cambaseo.costoTotal      = 500 + 500*4.33 + ventas*comisionMes
Resumen.costoMensual     = 500000/6 + ΣcostosMalls + ΣcostosBooths + ΣcostosCambaseo
```

## Entregables que espero de ti (Claude Code)

1. App con sidebar + las 5 secciones y selector de período funcional.
2. Capa de servicio Zoho (OAuth2 + COQL) + capa de config (sheet/tabla) con caché.
3. Las gráficas: aporte por canal (resumen), 3 vistas Home Depot, barras de avance malls,
   tablas ordenables con semáforo.
4. `.env.example` con las variables de Zoho y un README de setup.
5. Marca claramente con `// TODO` cada lugar donde necesites que yo confirme un nombre de campo o
   un costo real.

Empieza preguntándome los nombres de los módulos/campos de Zoho que no conoces antes de codificar el
mapeo, y propón el esquema de la tabla de costos.
