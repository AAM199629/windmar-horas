/* Shared glass UI + mini-charts for the WindMar futuristic dashboard.
   Exports components to window so each direction file can use them. */
const { useState, useEffect, useRef } = React;

/* root ref that flips data-anim="on" only when the dashboard is actually
   visible — so bar-fill animations never freeze a hidden/exported view at 0. */
function useAnim() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver((ents) => {
      if (ents.some((x) => x.isIntersecting)) { el.setAttribute("data-anim", "on"); io.disconnect(); }
    }, { threshold: 0.02 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

/* ---------- animated count-up (resting state = final value; animates only when visible) ---------- */
function CountUp({ value, dur = 1200, decimals = 0, prefix = "", suffix = "" }) {
  const [v, setV] = useState(value);
  const ref = useRef(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setV(value); return; }
    let raf, start, done = false;
    const run = () => {
      if (done) return; done = true;
      setV(0);
      const step = (t) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        setV(value * e);
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };
    const io = new IntersectionObserver((ents) => {
      if (ents.some((x) => x.isIntersecting)) { run(); io.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) io.observe(ref.current);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [value]);
  const txt = decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString("es-PR");
  return <span ref={ref} className="wmx-num">{prefix}{txt}{suffix}</span>;
}

/* ---------- area sparkline ---------- */
function AreaSpark({ data, w = 220, h = 56, color = "#3D6BFF", id }) {
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const span = max - min || 1;
  const step = w / (data.length - 1);
  const pts = data.map((d, i) => [i * step, h - 6 - ((d - min) / span) * (h - 12)]);
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L ${w} ${h} L 0 ${h} Z`;
  const gid = "spk-" + id;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 0 6px ${color}aa)` }} />
      {pts.map((p, i) => i === pts.length - 1 && (
        <circle key={i} cx={p[0]} cy={p[1]} r="3.4" fill="#fff" stroke={color} strokeWidth="2" />
      ))}
    </svg>
  );
}

/* ---------- mini bar sparkline (for lead rows) ---------- */
function BarSpark({ data, w = 150, h = 34, color = "#22C7E6" }) {
  const max = Math.max(...data, 1);
  const bw = w / data.length;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      {data.map((d, i) => {
        const bh = Math.max(2, (d / max) * (h - 4));
        return <rect key={i} x={i * bw + 1.5} y={h - bh} width={bw - 3} height={bh} rx="2"
          fill={color} opacity={0.45 + 0.55 * (d / max)} />;
      })}
    </svg>
  );
}

/* ---------- donut ---------- */
function Donut({ data, size = 200, thickness = 26, children }) {
  const total = data.reduce((a, b) => a + b.value, 0) || 1;
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * c;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={d.hue} strokeWidth={thickness} strokeLinecap="round"
              strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc * c}
              style={{ filter: `drop-shadow(0 0 6px ${d.hue}88)`, transition: "stroke-dasharray 1s ease" }} />
          );
          acc += frac;
          return el;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        {children}
      </div>
    </div>
  );
}

/* ---------- radial gauge (cancel rate etc.) ---------- */
function Gauge({ value, size = 132, thickness = 12, color = "#FF5D6C", label, sub, track = "rgba(255,255,255,0.08)" }) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = value * c;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={thickness} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={thickness}
          strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`}
          style={{ filter: `drop-shadow(0 0 7px ${color}aa)`, transition: "stroke-dasharray 1.1s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center", lineHeight: 1.1 }}>
        <div>
          <div className="wmx-num" style={{ fontSize: 26, fontWeight: 800 }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: "var(--c-ink-dim)", marginTop: 2 }}>{sub}</div>}
        </div>
      </div>
    </div>
  );
}

/* ---------- restyled nav ---------- */
const NAV_ITEMS = ["Inicio", "Análisis de Horas", "Cambaceo", "Mall / Home Depot", "Independiente", "Dashboard Ventas", "Asalariados", "Promotores", "Bingo"];
function Nav({ active = "Mall / Home Depot", logo = "assets/windmar-white-yellow.png" }) {
  return (
    <div className="wmx-nav">
      <img src={logo} alt="WindMar Home" style={{ height: 38, marginRight: 6 }} />
      <span className="wmx-display" style={{ fontSize: 22, color: "var(--c-orange)", letterSpacing: ".06em", marginRight: 10 }}>HORAS</span>
      <div style={{ display: "flex", gap: 2, flex: 1, overflow: "hidden" }}>
        {NAV_ITEMS.map((it) => (
          <span key={it} className={"wmx-navlink" + (it === active ? " is-active" : "")}>{it}</span>
        ))}
      </div>
      <span className="wmx-chip"><span className="wmx-live-dot" />Datos Zoho · hace 31m</span>
    </div>
  );
}

/* ---------- section header ---------- */
function SectionHead({ eyebrow, title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
      <div>
        {eyebrow && <div className="wmx-eyebrow" style={{ marginBottom: 8 }}>{eyebrow}</div>}
        <h3 className="wmx-display" style={{ fontSize: 30, margin: 0, color: "#fff" }}>{title}</h3>
        <div className="wmx-accent-rule" style={{ marginTop: 10 }} />
      </div>
      {right}
    </div>
  );
}

/* donut on white — clean ring, no glow, blue track (used by light dashboards) */
function DonutLight({ data, total }) {
  const size = 200, thickness = 26;
  const r = (size - thickness) / 2, c = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF3FD" strokeWidth={thickness} />
        {data.map((d, i) => {
          const frac = d.value / (total || 1), dash = frac * c;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.hue} strokeWidth={thickness}
            strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc * c}
            style={{ transition: "stroke-dasharray 1s ease" }} />;
          acc += frac; return el;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", textAlign: "center" }}>
        <div>
          <div className="wmx-display" style={{ fontSize: 40, color: "var(--c-blue-deep)" }}>{total}</div>
          <div style={{ fontSize: 11, color: "#8A8A8F", letterSpacing: ".1em" }}>OPORTUNIDADES</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CountUp, AreaSpark, BarSpark, Donut, DonutLight, Gauge, Nav, SectionHead, NAV_ITEMS, useAnim });
