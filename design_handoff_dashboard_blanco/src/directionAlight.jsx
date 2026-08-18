/* Direction A · BLANCO — la misma riqueza de "Aurora" (KPIs, trend, barras
   luminosas, heatmap, donut, leads) pero sobre fondo BLANCO. Sin glass (regla
   del sistema): tarjetas blancas con sombra azulada + glows de color sutiles. */
const AL_W = 1360;

function NavSolid() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 18px", borderRadius: 22,
      background: "linear-gradient(180deg, #21274E, #1A1F3D)", boxShadow: "0 12px 30px rgba(33,39,78,0.28)" }}>
      <img src="assets/windmar-white-yellow.png" alt="WindMar Home" style={{ height: 38, marginRight: 6 }} />
      <span className="wmx-display" style={{ fontSize: 22, color: "var(--c-orange)", letterSpacing: ".06em", marginRight: 10 }}>HORAS</span>
      <div style={{ display: "flex", gap: 2, flex: 1, overflow: "hidden" }}>
        {NAV_ITEMS.map((it) => (
          <span key={it} className={"wmx-navlink" + (it === "Mall / Home Depot" ? " is-active" : "")}>{it}</span>
        ))}
      </div>
      <span className="wmx-chip" style={{ color: "#fff" }}><span className="wmx-live-dot" />Datos Zoho · hace 31m</span>
    </div>
  );
}

function KpiLight({ eyebrow, children, glow = "#3D6BFF", grow }) {
  return (
    <div className="wmx-card-light" style={{ padding: "22px 24px", borderRadius: 22, position: "relative", overflow: "hidden", flex: grow ? "1 1 0" : "0 0 auto" }}>
      <span style={{ position: "absolute", top: 0, left: 24, right: 24, height: 3, borderRadius: 999, background: glow, opacity: 0.9 }} />
      <div style={{ position: "absolute", top: -50, right: -40, width: 150, height: 150, borderRadius: "50%",
        background: `radial-gradient(circle, ${glow}22, transparent 70%)` }} />
      <div className="wmx-eyebrow" style={{ marginBottom: 12, position: "relative", color: "var(--c-blue)" }}>{eyebrow}</div>
      <div style={{ position: "relative" }}>{children}</div>
    </div>
  );
}

function SectionHeadLight({ eyebrow, title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
      <div>
        <div className="wmx-eyebrow" style={{ marginBottom: 8, color: "var(--c-blue)" }}>{eyebrow}</div>
        <h3 className="wmx-display" style={{ fontSize: 30, margin: 0, color: "var(--c-blue-deep)" }}>{title}</h3>
        <div className="wmx-accent-rule" style={{ marginTop: 10 }} />
      </div>
      {right}
    </div>
  );
}
function ChipLight({ children }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 999,
    background: "#EEF3FD", color: "var(--c-blue)", fontSize: 12.5, fontWeight: 700 }}>{children}</span>;
}

function DirectionAL() {
  const D = window.WM_DATA;
  const maxV = D.ventasUbicacion[0].ventas;
  const k = D.kpis;
  return (
    <div className="wmx wmx-light" ref={window.useAnim()} style={{ width: AL_W }}>
      <div className="wmx-stage" style={{ padding: 36 }}>
        <NavSolid />

        {/* heading */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", margin: "30px 4px 22px" }}>
          <div>
            <div className="wmx-eyebrow" style={{ marginBottom: 10, color: "var(--c-blue)" }}>Canal · Dashboard de ventas en vivo · Redshift</div>
            <h1 className="wmx-display" style={{ fontSize: 60, margin: 0, color: "var(--c-blue-deep)", lineHeight: 0.9 }}>
              Canal <span style={{ color: "var(--c-orange)" }}>Mall / Home Depot</span>
            </h1>
          </div>
          <div style={{ display: "flex", padding: 4, borderRadius: 999, background: "#EEF3FD" }}>
            <span style={{ padding: "9px 22px", borderRadius: 999, fontSize: 13.5, fontWeight: 700, color: "#fff",
              background: "linear-gradient(180deg, #3D6BFF, #1D429B)", boxShadow: "0 6px 16px rgba(29,66,155,0.4)" }}>Dashboard</span>
            <span style={{ padding: "9px 22px", borderRadius: 999, fontSize: 13.5, fontWeight: 600, color: "var(--c-blue)" }}>Turnos</span>
          </div>
        </div>

        {/* filter bar */}
        <div className="wmx-card-light" style={{ display: "flex", alignItems: "center", gap: 28, padding: "16px 24px", borderRadius: 20, marginBottom: 26 }}>
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--c-blue)" }}>Período</span>
          {["Desde 01/01/2026", "Hasta 06/10/2026"].map(t => (
            <span key={t} className="wmx-num" style={{ padding: "8px 16px", borderRadius: 12, background: "#F1F2F5", border: "1px solid #E4E5E9", fontSize: 14, fontWeight: 600, color: "var(--c-blue-deep)" }}>{t}</span>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 13, color: "#8A8A8F" }}>Toca cualquier número para ver el detalle</span>
        </div>

        {/* KPI band */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <KpiLight eyebrow="Ventas totales" glow="#3D6BFF" grow>
            <div className="wmx-display" style={{ fontSize: 56, color: "var(--c-blue)" }}><CountUp value={k.totalVtas} /></div>
            <div style={{ fontSize: 12.5, color: "#8A8A8F", marginTop: 4 }}>{k.ubicaciones} ubicaciones · Ene–Jun</div>
          </KpiLight>
          <KpiLight eyebrow="Canceladas" glow="#FF5D6C" grow>
            <div className="wmx-display" style={{ fontSize: 56, color: "#E0334B" }}><CountUp value={k.totalCanc} /></div>
            <div style={{ fontSize: 12.5, color: "#8A8A8F", marginTop: 4 }}>del período seleccionado</div>
          </KpiLight>
          <KpiLight eyebrow="Tasa de cancelación" glow="#F89B24">
            <Gauge value={k.cancRate} label={(k.cancRate * 100).toFixed(0) + "%"} color="#F89B24" track="#F1F2F5" size={104} thickness={10} />
          </KpiLight>
          <KpiLight eyebrow="Pipeline activo" glow="#1FA971" grow>
            <div className="wmx-display" style={{ fontSize: 56, color: "#1FA971" }}><CountUp value={k.pipelineActivo} /></div>
            <div style={{ fontSize: 12.5, color: "#8A8A8F", marginTop: 4 }}>oportunidades en curso</div>
          </KpiLight>
        </div>

        {/* trend */}
        <div className="wmx-card-light" style={{ display: "flex", alignItems: "center", gap: 28, padding: "20px 28px", borderRadius: 22, marginBottom: 28 }}>
          <div style={{ flex: "0 0 auto" }}>
            <div className="wmx-eyebrow" style={{ marginBottom: 8, color: "var(--c-blue)" }}>Volumen mensual · Ventas</div>
            <div className="wmx-display" style={{ fontSize: 40, color: "var(--c-blue-deep)" }}>Ene → Jun</div>
            <div style={{ fontSize: 12.5, color: "#8A8A8F" }}>pico en <span style={{ color: "var(--c-orange)", fontWeight: 700 }}>Mayo · 156</span></div>
          </div>
          <div style={{ flex: 1, paddingLeft: 12 }}><AreaSpark data={D.trend.map(t => t.vtas)} w={760} h={92} color="#1D429B" id="AL-trend" /></div>
          <div style={{ display: "flex", gap: 8 }}>
            {D.MONTHS.map((m, i) => (
              <div key={m} style={{ textAlign: "center", minWidth: 52 }}>
                <div className="wmx-num" style={{ fontSize: 18, fontWeight: 800, color: "var(--c-blue-deep)" }}>{D.trend[i].vtas}</div>
                <div style={{ fontSize: 11, color: "#8A8A8F" }}>{m}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Ventas por Ubicación — barras de color con glow suave */}
        <div className="wmx-card-light" style={{ padding: "30px 34px", borderRadius: 24, marginBottom: 26 }}>
          <SectionHeadLight eyebrow="Ranking del período" title="Ventas por Ubicación"
            right={<ChipLight>14 ubicaciones · 470 ventas</ChipLight>} />
          <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
            {D.ventasUbicacion.map((r, i) => (
              <div key={r.name} style={{ display: "grid", gridTemplateColumns: "230px 1fr 56px", alignItems: "center", gap: 18 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "#4B4B4E", textAlign: "right" }}>{r.name}</div>
                <div className="wmx-bar-track-light">
                  <div className="wmx-bar-fill" style={{
                    "--w": (r.ventas / maxV * 100) + "%",
                    background: `linear-gradient(90deg, ${r.hue}, ${r.hue}dd)`,
                    boxShadow: `0 2px 12px ${r.hue}55`,
                    animationDelay: (i * 55) + "ms",
                  }} />
                </div>
                <div className="wmx-num" style={{ fontSize: 22, fontWeight: 800, color: "var(--c-blue-deep)", textAlign: "right" }}>{r.ventas}</div>
              </div>
            ))}
          </div>
        </div>

        {/* heatmap + donut */}
        <div style={{ display: "grid", gridTemplateColumns: "1.65fr 1fr", gap: 26, marginBottom: 26 }}>
          <div className="wmx-card-light" style={{ padding: "28px 30px", borderRadius: 24 }}>
            <SectionHeadLight eyebrow="Mapa de calor mensual" title="Detalle Mensual" />
            <HeatTableLight />
          </div>
          <div className="wmx-card-light" style={{ padding: "28px 30px", borderRadius: 24 }}>
            <SectionHeadLight eyebrow="Mix del pipeline" title="Por Pipeline" />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
              <DonutLight data={D.pipelineMix} total={k.pipelineActivo} />
              <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 9 }}>
                {D.pipelineMix.map(p => (
                  <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 3, background: p.hue }} />
                    <span style={{ fontSize: 13.5, color: "#4B4B4E", flex: 1 }}>{p.name}</span>
                    <span className="wmx-num" style={{ fontSize: 15, fontWeight: 800, color: "var(--c-blue-deep)" }}>{p.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Leads */}
        <div className="wmx-card-light" style={{ padding: "28px 30px", borderRadius: 24 }}>
          <SectionHeadLight eyebrow="Datos de muestra" title="Leads por Vendedor y Ubicación"
            right={<ChipLight>{k.leadsTotal.toLocaleString("es-PR")} leads</ChipLight>} />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
            {D.leadsVendedor.map((v, i) => (
              <div key={v.name} style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 16px", borderRadius: 16, background: "#F7F8FA", border: "1px solid #E4E5E9" }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, display: "grid", placeItems: "center", fontWeight: 800, color: "#fff", fontSize: 13,
                  background: `linear-gradient(135deg, ${D.ventasUbicacion[i % 14].hue}, ${D.ventasUbicacion[i % 14].hue}bb)` }}>{v.name.split(" ").map(x => x[0]).join("")}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--c-blue-deep)" }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: "#8A8A8F", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{v.ubic}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div className="wmx-num" style={{ fontSize: 19, fontWeight: 800, color: "var(--c-blue-deep)" }}>{v.leads}</div>
                  <div style={{ fontSize: 11, color: "#1FA971", fontWeight: 700 }}>{(v.rate * 100).toFixed(0)}% conv.</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 26 }}>
          <span style={{ fontStyle: "italic", fontWeight: 500, color: "var(--c-blue)", fontSize: 17 }}>
            No es solo energía, es tranquilidad para ti y tu familia.
          </span>
        </div>
      </div>
    </div>
  );
}

/* heatmap on white — blue scale, canc in red */
function HeatTableLight() {
  const D = window.WM_DATA;
  const allV = D.detalleMensual.flatMap(r => r.m.map(x => x[0]));
  const max = Math.max(...allV);
  const cell = (v, c, key) => {
    const t = v / max;
    return (
      <td key={key} style={{ padding: "6px 5px" }}>
        <div style={{ borderRadius: 9, padding: "8px 4px", background: v ? `rgba(29,66,155,${0.06 + t * 0.5})` : "transparent", lineHeight: 1.1 }}>
          <div className="wmx-num" style={{ fontSize: 14, fontWeight: 700, color: t > 0.55 ? "#fff" : (v ? "var(--c-blue-deep)" : "#C8C9CE") }}>{v || "·"}</div>
          {c ? <div className="wmx-num" style={{ fontSize: 10.5, fontWeight: 700, color: t > 0.55 ? "#FFD2D7" : "#E0334B" }}>-{c}</div> : null}
        </div>
      </td>
    );
  };
  return (
    <table className="wmx-table-light" style={{ fontSize: 13 }}>
      <thead>
        <tr style={{ color: "#8A8A8F" }}>
          <th style={{ textAlign: "left", fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>Ubicación</th>
          {D.MONTHS.map(m => <th key={m} style={{ fontSize: 11, textTransform: "uppercase" }}>{m}</th>)}
          <th style={{ fontSize: 11, textTransform: "uppercase", color: "var(--c-orange)" }}>Total</th>
        </tr>
      </thead>
      <tbody>
        {D.detalleMensual.map(r => (
          <tr key={r.name}>
            <td style={{ textAlign: "left", fontSize: 12.5, fontWeight: 600, color: "#4B4B4E", whiteSpace: "nowrap" }}>{r.name}</td>
            {r.m.map((mm, i) => cell(mm[0], mm[1], i))}
            <td>
              <div className="wmx-num" style={{ fontSize: 16, fontWeight: 800, color: "var(--c-blue-deep)" }}>{r.total[0]}</div>
              {r.total[1] ? <div className="wmx-num" style={{ fontSize: 10.5, color: "#E0334B", fontWeight: 700 }}>-{r.total[1]}</div> : null}
            </td>
          </tr>
        ))}
        <tr style={{ borderTop: "2px solid #C8C9CE", background: "#F7F8FA" }}>
          <td style={{ textAlign: "left", fontWeight: 800, color: "var(--c-orange)" }}>Total</td>
          {D.detalleTotal.m.map((mm, i) => (
            <td key={i}><div className="wmx-num" style={{ fontSize: 15, fontWeight: 800, color: "var(--c-blue-deep)" }}>{mm[0]}</div>
              {mm[1] ? <div className="wmx-num" style={{ fontSize: 10.5, color: "#E0334B", fontWeight: 700 }}>-{mm[1]}</div> : null}</td>
          ))}
          <td><div className="wmx-display" style={{ fontSize: 22, color: "var(--c-orange)" }}>{D.detalleTotal.total[0]}</div></td>
        </tr>
      </tbody>
    </table>
  );
}

Object.assign(window, { DirectionAL, AL_W });
