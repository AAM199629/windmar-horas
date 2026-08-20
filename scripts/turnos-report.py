#!/usr/bin/env python3
"""
Cómputo del reporte de cobertura de turnos por actividad + capacidad.

Lee un export crudo de Shifter (CSV) y emite un objeto JSON con:
  - totales globales (creados/asignados/ponchados, cobertura, ponche)
  - series semanales (volumen + vendedores únicos asignados vs poncharon)
  - desglose por actividad (4 categorías de prospección)
  - análisis de capacidad (slots recomendados vs exceso)

Definiciones (ver plan / lib/finance.ts::getShiftCoverageByLocation):
  creados   = slots totales, EXCLUYENDO Shift Status == "Cancelled"
  asignados = slots con Name != "---"
  ponchados = slots con Shift Status == "Completed"
  cobertura = ponchados / creados
  ponche    = ponchados / asignados

Uso:
  python3 scripts/turnos-report.py "report (48).csv" [--json out.json] [--target 0.90]
"""
import csv
import sys
import json
import argparse
import datetime
from collections import defaultdict

# --- Mapeo de Shift Type -> categoría de prospección -------------------------
PROSPECTING = ("Home Depot", "Cambaceo", "Booth", "Independiente")


def categorize(shift_type: str):
    st = (shift_type or "").strip()
    if st == "Home Depot":
        return "Home Depot"
    if st == "Canvaseo":
        return "Cambaceo"
    if st == "Booth Malls":
        return "Booth"
    if st.startswith("Booth Ind"):
        return "Independiente"
    if st == "Eventos Especiales":
        return "Independiente"  # mismo canal que Booth Independiente
    return None  # Otros (no-prospección) -> excluido del análisis


def week_monday(date_str: str) -> str:
    dt = datetime.date.fromisoformat(date_str)
    return (dt - datetime.timedelta(days=dt.weekday())).isoformat()


def blank_counts():
    return {"creados": 0, "asignados": 0, "ponchados": 0}


def pct(num, den):
    return round(num / den * 100, 1) if den else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("csv", nargs="?", default="report (48).csv")
    ap.add_argument("--json", default=None, help="ruta de salida JSON (default: stdout)")
    ap.add_argument("--target", type=float, default=0.90,
                    help="cobertura objetivo para slots recomendados (default 0.90)")
    args = ap.parse_args()

    rows = list(csv.DictReader(open(args.csv, encoding="utf-8-sig")))

    # --- Agregados ----------------------------------------------------------
    total_rows = len(rows)
    cancelled = 0
    otros_creados = 0  # slots no-prospección (contexto)

    # global (prospección)
    g = blank_counts()
    # por categoría
    by_cat = {c: blank_counts() for c in PROSPECTING}
    # por semana (global prospección): volumen + sets de vendedores
    wk_vol = defaultdict(blank_counts)
    wk_assigned = defaultdict(set)  # vendedores únicos asignados
    wk_ponched = defaultdict(set)   # vendedores únicos que poncharon
    # por semana x categoría
    wk_cat = defaultdict(lambda: {c: blank_counts() for c in PROSPECTING})
    wk_cat_ponchers = defaultdict(lambda: {c: set() for c in PROSPECTING})

    all_assigned = set()
    all_ponched = set()

    # no-prospección: desglose por Shift Type + capacidad "atrapada"
    np_by_type = defaultdict(lambda: {"creados": 0, "asignados": 0, "ponchados": 0, "vend": set()})
    np_wk = defaultdict(lambda: defaultdict(blank_counts))  # type -> week -> counts
    SHOWROOM_TYPES = ("Showroom", "TO Showroom")
    showroom_ponchers = set()   # vendedores que poncharon showroom
    prospecting_ponchers = set()  # vendedores que poncharon prospección
    showroom_wk_pon = defaultdict(int)  # turnos showroom ponchados por semana

    for r in rows:
        status = r["Shift Status"].strip()
        if status == "Cancelled":
            cancelled += 1
            continue

        name = r["Name"].strip()
        named = name != "---"
        ponched = status == "Completed"
        wk = week_monday(r["Date"].strip())

        cat = categorize(r["Shift Type"])
        if cat is None:
            otros_creados += 1
            st = r["Shift Type"].strip()
            e = np_by_type[st]
            e["creados"] += 1
            np_wk[st][wk]["creados"] += 1
            if named:
                e["asignados"] += 1
                np_wk[st][wk]["asignados"] += 1
                e["vend"].add(name)
            if ponched:
                e["ponchados"] += 1
                np_wk[st][wk]["ponchados"] += 1
                if st in SHOWROOM_TYPES:
                    showroom_ponchers.add(name)
                    showroom_wk_pon[wk] += 1
            continue

        if ponched and named:
            prospecting_ponchers.add(name)

        # global
        g["creados"] += 1
        by_cat[cat]["creados"] += 1
        wk_vol[wk]["creados"] += 1
        wk_cat[wk][cat]["creados"] += 1

        if named:
            g["asignados"] += 1
            by_cat[cat]["asignados"] += 1
            wk_vol[wk]["asignados"] += 1
            wk_cat[wk][cat]["asignados"] += 1
            wk_assigned[wk].add(name)
            all_assigned.add(name)
        if ponched:
            g["ponchados"] += 1
            by_cat[cat]["ponchados"] += 1
            wk_vol[wk]["ponchados"] += 1
            wk_cat[wk][cat]["ponchados"] += 1
            if named:
                wk_ponched[wk].add(name)
                wk_cat_ponchers[wk][cat].add(name)
                all_ponched.add(name)

    weeks = sorted(wk_vol.keys())

    # Semanas completas = descartar primera y última (parciales) para promedios
    partial = {weeks[0], weeks[-1]} if len(weeks) >= 3 else set()
    full_weeks = [w for w in weeks if w not in partial]

    # --- Series semanales ---------------------------------------------------
    weekly = []
    for w in weeks:
        v = wk_vol[w]
        weekly.append({
            "week": w,
            "partial": w in partial,
            "creados": v["creados"],
            "asignados": v["asignados"],
            "ponchados": v["ponchados"],
            "vendAsignados": len(wk_assigned[w]),
            "vendPoncharon": len(wk_ponched[w]),
            "cobertura": pct(v["ponchados"], v["creados"]),
            "ponche": pct(v["ponchados"], v["asignados"]),
            "porCategoria": {
                c: {
                    "creados": wk_cat[w][c]["creados"],
                    "asignados": wk_cat[w][c]["asignados"],
                    "ponchados": wk_cat[w][c]["ponchados"],
                    "vendPoncharon": len(wk_cat_ponchers[w][c]),
                } for c in PROSPECTING
            },
        })

    def avg(vals):
        vals = list(vals)
        return round(sum(vals) / len(vals), 1) if vals else 0

    # --- Promedios semanales (solo semanas completas) -----------------------
    fw = [x for x in weekly if not x["partial"]]
    avg_creados = avg(x["creados"] for x in fw)
    avg_asignados = avg(x["asignados"] for x in fw)
    avg_ponchados = avg(x["ponchados"] for x in fw)
    avg_vend_asig = avg(x["vendAsignados"] for x in fw)
    avg_vend_pon = avg(x["vendPoncharon"] for x in fw)

    # --- Análisis de capacidad por actividad --------------------------------
    target = args.target
    cap = []
    for c in PROSPECTING:
        cre = avg(x["porCategoria"][c]["creados"] for x in fw)
        asg = avg(x["porCategoria"][c]["asignados"] for x in fw)
        pon = avg(x["porCategoria"][c]["ponchados"] for x in fw)
        vend = avg(x["porCategoria"][c]["vendPoncharon"] for x in fw)
        rec = round(pon / target) if pon else 0
        cap.append({
            "actividad": c,
            "creados": cre,
            "asignados": asg,
            "ponchados": pon,
            "vendPoncharon": vend,
            "turnosPorVendedor": round(pon / vend, 2) if vend else None,
            "cobertura": pct(pon, cre),
            "ponche": pct(pon, asg),
            "recomendado": rec,
            "exceso": round(cre - rec),
        })

    rec_total = round(avg_ponchados / target) if avg_ponchados else 0

    # --- No-prospección: desglose + escenario de redespliegue ---------------
    n_full = len(fw) if fw else 1
    np_breakdown = []
    for st, e in np_by_type.items():
        cre_sem = avg(np_wk[st][w]["creados"] for w in full_weeks) if full_weeks else 0
        pon_sem = avg(np_wk[st][w]["ponchados"] for w in full_weeks) if full_weeks else 0
        np_breakdown.append({
            "tipo": st,
            "creados": e["creados"],
            "asignados": e["asignados"],
            "ponchados": e["ponchados"],
            "vendUnicos": len(e["vend"]),
            "creadosSem": cre_sem,
            "ponchadosSem": pon_sem,
            "cobertura": pct(e["ponchados"], e["creados"]),
        })
    np_breakdown.sort(key=lambda x: -x["creados"])
    np_tot = {
        "creados": sum(x["creados"] for x in np_breakdown),
        "asignados": sum(x["asignados"] for x in np_breakdown),
        "ponchados": sum(x["ponchados"] for x in np_breakdown),
    }

    # Combinado (prospección + no-prospección, excl. cancelados)
    comb = {
        "creados": g["creados"] + np_tot["creados"],
        "asignados": g["asignados"] + np_tot["asignados"],
        "ponchados": g["ponchados"] + np_tot["ponchados"],
    }
    comb["cobertura"] = pct(comb["ponchados"], comb["creados"])
    comb["ponche"] = pct(comb["ponchados"], comb["asignados"])

    # Escenario: redesplegar showroom -> prospección
    showroom_pon_sem = round(sum(showroom_wk_pon[w] for w in full_weeks) / n_full, 1) if full_weeks else 0
    solo_showroom = len(showroom_ponchers - prospecting_ponchers)
    redeploy = {
        "showroomPonSem": showroom_pon_sem,
        "showroomVendTotal": len(showroom_ponchers),
        "showroomTambienProspectan": len(showroom_ponchers & prospecting_ponchers),
        "soloShowroom": solo_showroom,
        "capacidadActual": avg_ponchados,
        "capacidadConRedespliegue": round(avg_ponchados + showroom_pon_sem, 1),
        "gananciaPct": round(showroom_pon_sem / avg_ponchados * 100, 1) if avg_ponchados else 0,
    }

    result = {
        "meta": {
            "archivo": args.csv,
            "totalFilas": total_rows,
            "cancelados": cancelled,
            "otrosCreados": otros_creados,
            "periodoInicio": min(r["Date"] for r in rows),
            "periodoFin": max(r["Date"] for r in rows),
            "coberturaObjetivo": target,
            "semanasCompletas": full_weeks,
        },
        "global": {
            "creados": g["creados"],
            "asignados": g["asignados"],
            "ponchados": g["ponchados"],
            "cobertura": pct(g["ponchados"], g["creados"]),
            "ponche": pct(g["ponchados"], g["asignados"]),
            "vendUnicosAsignados": len(all_assigned),
            "vendUnicosPoncharon": len(all_ponched),
        },
        "promedioSemanal": {
            "creados": avg_creados,
            "asignados": avg_asignados,
            "ponchados": avg_ponchados,
            "vendAsignados": avg_vend_asig,
            "vendPoncharon": avg_vend_pon,
            "cobertura": pct(avg_ponchados, avg_creados),
            "ponche": pct(avg_ponchados, avg_asignados),
            "turnosPorVendedor": round(avg_ponchados / avg_vend_pon, 2) if avg_vend_pon else None,
            "slotsPorVendedor": round(avg_creados / avg_vend_pon, 2) if avg_vend_pon else None,
            "recomendadoTotal": rec_total,
            "excesoTotal": round(avg_creados - rec_total),
        },
        "porActividad": [
            {
                "actividad": c,
                "creados": by_cat[c]["creados"],
                "asignados": by_cat[c]["asignados"],
                "ponchados": by_cat[c]["ponchados"],
                "cobertura": pct(by_cat[c]["ponchados"], by_cat[c]["creados"]),
                "ponche": pct(by_cat[c]["ponchados"], by_cat[c]["asignados"]),
            } for c in PROSPECTING
        ],
        "capacidad": cap,
        "noProspeccion": {
            "breakdown": np_breakdown,
            "total": np_tot,
            "combinado": comb,
            "redespliegue": redeploy,
        },
        "semanal": weekly,
    }

    out = json.dumps(result, ensure_ascii=False, indent=2)
    if args.json:
        with open(args.json, "w", encoding="utf-8") as f:
            f.write(out)
        print(f"Escrito {args.json}", file=sys.stderr)
    else:
        print(out)


if __name__ == "__main__":
    main()
