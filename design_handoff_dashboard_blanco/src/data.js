/* WindMar Home · Canal Mall / Home Depot — sample data lifted from the live dashboard screenshots.
   Leads blocks filled with realistic sample data (per the brief). */
window.WM_DATA = (function () {
  const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun"];

  // Ventas por Ubicación — total ranking (the priority chart)
  // hue = neon-tuned color that reads on a dark glass surface
  const ventasUbicacion = [
    { name: "Plaza del Caribe",            ventas: 51, canc: 3,  hue: "#5B8CFF" },
    { name: "Plaza las Américas",          ventas: 49, canc: 8,  hue: "#3D6BFF" },
    { name: "Home Depot · Plaza del Sol",  ventas: 48, canc: 11, hue: "#22C7E6" },
    { name: "Home Depot · Caguas",         ventas: 40, canc: 6,  hue: "#1FD79B" },
    { name: "Home Depot · Colobos",        ventas: 39, canc: 16, hue: "#9B6BFF" },
    { name: "Home Depot · Mayagüez",       ventas: 39, canc: 7,  hue: "#FB9F3A" },
    { name: "Home Depot · Rexville",       ventas: 39, canc: 8,  hue: "#FF5D6C" },
    { name: "Home Depot · Escorial",       ventas: 36, canc: 4,  hue: "#FF4D9D" },
    { name: "Home Depot · Hatillo",        ventas: 35, canc: 11, hue: "#A4D932" },
    { name: "Home Depot · Ponce",          ventas: 35, canc: 5,  hue: "#34B3F1" },
    { name: "Home Depot · Montehiedra",    ventas: 26, canc: 7,  hue: "#15B6A0" },
    { name: "Home Depot · Humacao",        ventas: 21, canc: 2,  hue: "#E07B2E" },
    { name: "Aguadilla Mall",              ventas: 6,  canc: 2,  hue: "#B255F0" },
    { name: "Santa Rosa Mall",             ventas: 6,  canc: 2,  hue: "#E14BD6" },
  ];

  // Detalle Mensual por Ubicación — [vtas, canc] per month Ene..Jun
  const detalleMensual = [
    { name: "Home Depot · Caguas",        m: [[3,1],[6,0],[7,2],[8,3],[15,0],[1,0]],  total: [40,6] },
    { name: "Home Depot · Colobos",       m: [[5,5],[8,5],[9,5],[8,0],[8,1],[1,0]],   total: [39,16] },
    { name: "Home Depot · Escorial",      m: [[2,0],[4,0],[5,2],[11,2],[11,0],[3,0]], total: [36,4] },
    { name: "Home Depot · Hatillo",       m: [[2,1],[6,4],[8,6],[6,0],[10,0],[3,0]],  total: [35,11] },
    { name: "Home Depot · Humacao",       m: [[1,1],[2,0],[5,0],[7,1],[5,0],[1,0]],   total: [21,2] },
    { name: "Home Depot · Mayagüez",      m: [[5,1],[7,0],[10,4],[7,2],[8,0],[2,0]],  total: [39,7] },
    { name: "Home Depot · Montehiedra",   m: [[4,1],[1,2],[2,0],[7,1],[8,3],[4,0]],   total: [26,7] },
    { name: "Home Depot · Plaza del Sol", m: [[5,1],[4,1],[12,3],[7,2],[19,4],[1,0]], total: [48,11] },
    { name: "Home Depot · Ponce",         m: [[4,1],[4,2],[8,1],[1,0],[16,1],[2,0]],  total: [35,5] },
    { name: "Home Depot · Rexville",      m: [[8,4],[3,1],[6,2],[8,1],[13,0],[1,0]],  total: [39,8] },
    { name: "Aguadilla Mall",             m: [[1,1],[0,0],[1,1],[2,0],[2,0],[0,0]],   total: [6,2] },
    { name: "Plaza del Caribe",           m: [[8,1],[9,2],[7,0],[8,0],[16,0],[3,0]],  total: [51,3] },
    { name: "Plaza las Américas",         m: [[3,0],[8,0],[7,4],[8,2],[22,2],[1,0]],  total: [49,8] },
    { name: "Santa Rosa Mall",            m: [[0,0],[0,2],[2,0],[1,0],[3,0],[0,0]],   total: [6,2] },
  ];
  const detalleTotal = { m: [[51,18],[62,19],[89,30],[89,14],[156,11],[23,0]], total: [470,92] };

  // Pipeline categories
  const pipelineCats = ["Res. Solar", "Com. Solar", "Roofing", "PPS", "Water"];
  // Aggregated pipeline mix (whole period) — for the donut / stacked treatment
  const pipelineMix = [
    { name: "Res. Solar", value: 248, hue: "#5B8CFF" },
    { name: "Com. Solar", value: 38,  hue: "#22C7E6" },
    { name: "Roofing",    value: 96,  hue: "#1FD79B" },
    { name: "PPS",        value: 31,  hue: "#FB9F3A" },
    { name: "Water",      value: 57,  hue: "#FF4D9D" },
  ];

  // Monthly volume trend (Vtas vs Canc) for the hero sparkline / area
  const trend = MONTHS.map((mo, i) => ({
    mo,
    vtas: detalleTotal.m[i][0],
    canc: detalleTotal.m[i][1],
  }));

  // ---- Leads (sample data — realistic) ----
  const leadsPorUbicacion = [
    { name: "Plaza del Caribe",           m: [22,19,24,28,41,9] },
    { name: "Plaza las Américas",         m: [18,21,20,25,46,11] },
    { name: "Home Depot · Plaza del Sol", m: [16,14,27,22,38,7] },
    { name: "Home Depot · Caguas",        m: [12,17,19,21,33,6] },
    { name: "Home Depot · Mayagüez",      m: [14,16,22,18,27,5] },
    { name: "Home Depot · Rexville",      m: [19,11,17,20,29,4] },
    { name: "Home Depot · Colobos",       m: [13,18,21,16,24,5] },
    { name: "Home Depot · Escorial",      m: [9,12,15,23,26,6] },
    { name: "Home Depot · Ponce",         m: [11,13,18,9,31,5] },
    { name: "Home Depot · Hatillo",       m: [8,15,19,14,22,4] },
  ];

  const leadsVendedor = [
    { name: "Carlos Rivera",   ubic: "Plaza del Caribe",          leads: 86, conv: 41, rate: 0.48 },
    { name: "María Santiago",  ubic: "Plaza las Américas",        leads: 79, conv: 38, rate: 0.48 },
    { name: "José Vázquez",    ubic: "Home Depot · Plaza del Sol",leads: 74, conv: 33, rate: 0.45 },
    { name: "Wanda Colón",     ubic: "Home Depot · Caguas",       leads: 61, conv: 26, rate: 0.43 },
    { name: "Luis Figueroa",   ubic: "Home Depot · Mayagüez",     leads: 58, conv: 22, rate: 0.38 },
    { name: "Keila Ortiz",     ubic: "Home Depot · Rexville",     leads: 53, conv: 24, rate: 0.45 },
    { name: "Ángel Morales",   ubic: "Home Depot · Escorial",     leads: 49, conv: 19, rate: 0.39 },
    { name: "Damaris Pérez",   ubic: "Home Depot · Ponce",        leads: 44, conv: 18, rate: 0.41 },
  ];

  const leadsProducto = pipelineCats.slice(0, 5).map((c) => c);
  const leadsPorProducto = [
    { name: "Res. Solar",  m: [88, 96, 121, 110, 167, 38] },
    { name: "Roofing",     m: [34, 29, 41, 38, 52, 12] },
    { name: "Water",       m: [21, 26, 33, 29, 44, 9] },
    { name: "Com. Solar",  m: [9, 11, 14, 12, 18, 4] },
    { name: "PPS",         m: [6, 8, 12, 10, 15, 3] },
  ];

  const totalVtas = 470, totalCanc = 92;
  return {
    MONTHS,
    ventasUbicacion,
    detalleMensual,
    detalleTotal,
    pipelineCats,
    pipelineMix,
    trend,
    leadsPorUbicacion,
    leadsVendedor,
    leadsPorProducto,
    kpis: {
      totalVtas,
      totalCanc,
      cancRate: totalCanc / (totalVtas + totalCanc),
      topUbic: ventasUbicacion[0],
      pipelineActivo: pipelineMix.reduce((a, b) => a + b.value, 0),
      ubicaciones: ventasUbicacion.length,
      leadsTotal: leadsPorUbicacion.reduce((a, r) => a + r.m.reduce((x, y) => x + y, 0), 0),
    },
  };
})();
