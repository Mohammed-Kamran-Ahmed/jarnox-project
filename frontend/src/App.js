import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, registerables } from "chart.js";

ChartJS.register(...registerables);

const API = "http://localhost:8000";

/* ─── Google Fonts injected at runtime ─── */
const fontLink = document.createElement("link");
fontLink.href =
  "https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Space+Mono:wght@400;700&display=swap";
fontLink.rel = "stylesheet";
document.head.appendChild(fontLink);

/* ─── Global CSS ─── */
const globalStyle = document.createElement("style");
globalStyle.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #040b14; overflow: hidden; }
  ::-webkit-scrollbar { width: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 99px; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-dot {
    0%, 100% { opacity: 1; transform: scale(1); }
    50%       { opacity: 0.4; transform: scale(0.7); }
  }
  @keyframes shimmer {
    0%   { background-position: -600px 0; }
    100% { background-position: 600px 0; }
  }
  @keyframes scanline {
    0%   { top: -4px; }
    100% { top: 100%; }
  }
  .fade-up  { animation: fadeUp 0.45s ease both; }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 11px 14px; border-radius: 10px; cursor: pointer;
    font-family: 'Space Mono', monospace; font-size: 12px;
    letter-spacing: 0.04em; color: #5c7a9b;
    transition: all 0.2s ease; position: relative; overflow: hidden;
    border: 1px solid transparent;
  }
  .nav-item:hover { color: #a3c4e8; background: rgba(34,100,180,0.08); border-color: rgba(34,100,180,0.15); }
  .nav-item.active {
    color: #e0f2fe; background: rgba(34,130,220,0.14);
    border-color: rgba(56,165,230,0.3);
  }
  .nav-item.active::before {
    content: ''; position: absolute; left: 0; top: 20%; bottom: 20%;
    width: 2px; background: #38bdf8; border-radius: 99px;
  }
  .stat-card {
    background: rgba(10,26,50,0.85);
    border: 1px solid rgba(30,80,140,0.35);
    border-radius: 14px; padding: 20px 22px;
    transition: border-color 0.2s, transform 0.2s;
    backdrop-filter: blur(8px);
  }
  .stat-card:hover { border-color: rgba(56,189,248,0.4); transform: translateY(-2px); }
  .btn-primary {
    background: linear-gradient(135deg, #0ea5e9, #2563eb);
    border: none; border-radius: 8px; color: #fff;
    font-family: 'Space Mono', monospace; font-size: 11px;
    font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    padding: 0 18px; height: 38px; cursor: pointer;
    transition: opacity 0.2s, transform 0.15s;
    box-shadow: 0 4px 18px rgba(14,165,233,0.35);
  }
  .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
  .select-ctrl {
    height: 38px; padding: 0 12px;
    background: rgba(10,26,50,0.9);
    border: 1px solid rgba(30,80,140,0.5); border-radius: 8px;
    color: #a3c4e8; font-family: 'Space Mono', monospace; font-size: 11px;
    outline: none; cursor: pointer; transition: border-color 0.2s;
  }
  .select-ctrl:hover, .select-ctrl:focus { border-color: #38bdf8; }
  .ticker-badge {
    display: inline-block; font-family: 'Space Mono', monospace;
    font-size: 10px; padding: 3px 8px; border-radius: 5px;
    background: rgba(14,165,233,0.12); color: #38bdf8;
    border: 1px solid rgba(56,189,248,0.25); letter-spacing: 0.06em;
  }
  .skeleton {
    background: linear-gradient(90deg, #0a1a32 25%, #0f2540 50%, #0a1a32 75%);
    background-size: 600px 100%;
    animation: shimmer 1.4s infinite linear;
    border-radius: 6px;
  }
`;
document.head.appendChild(globalStyle);

/* ─── Helpers ─── */
const fmt = (v) => (v !== undefined && v !== null ? Number(v).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "—");

function LiveDot({ up }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span
        style={{
          width: 7, height: 7, borderRadius: "50%",
          background: up ? "#4ade80" : "#f87171",
          animation: "pulse-dot 1.8s ease-in-out infinite",
          boxShadow: `0 0 6px ${up ? "#4ade80" : "#f87171"}`,
        }}
      />
    </span>
  );
}

/* ─── Main App ─── */
export default function App() {
  const [companies, setCompanies] = useState([]);
  const [selected, setSelected] = useState("RELIANCE.NS");
  const [compareSymbol, setCompareSymbol] = useState("TCS.NS");
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [compare, setCompare] = useState(null);
  const [top, setTop] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("chart"); // 'chart' | 'compare'

  useEffect(() => {
    axios.get(`${API}/companies`).then((r) => setCompanies(r.data));
    axios.get(`${API}/top`).then((r) => setTop(r.data));
  }, []);

  const fetchStock = useCallback(async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([
        axios.get(`${API}/data/${selected}?days=${days}`),
        axios.get(`${API}/summary/${selected}`),
      ]);
      setData(d.data);
      setSummary(s.data);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }, [selected, days]);

  useEffect(() => { fetchStock(); }, [fetchStock]);

  const handleCompare = async () => {
    const res = await axios.get(`${API}/compare?symbol1=${selected}&symbol2=${compareSymbol}`);
    setCompare(res.data);
    setTab("compare");
  };

  const isUp = summary ? summary.change >= 0 : true;

  const chartData = {
    labels: data.map((d) => d.Date),
    datasets: [
      {
        label: "Price",
        data: data.map((d) => d.Close),
        borderColor: "#38bdf8",
        borderWidth: 2,
        tension: 0.45,
        pointRadius: 0,
        fill: true,
        backgroundColor: (ctx) => {
          const g = ctx.chart.ctx.createLinearGradient(0, 0, 0, 340);
          g.addColorStop(0, "rgba(56,189,248,0.18)");
          g.addColorStop(1, "rgba(56,189,248,0)");
          return g;
        },
      },
      {
        label: "MA7",
        data: data.map((d) => d.MA7),
        borderColor: "#facc15",
        borderWidth: 1.5,
        borderDash: [5, 5],
        tension: 0.4,
        pointRadius: 0,
        fill: false,
      },
      {
        label: "Prediction",
        data: data.map((d) => d.Prediction),
        borderColor: "#c084fc",
        borderWidth: 1.5,
        tension: 0.4,
        pointRadius: 0,
        fill: false,
        borderDash: [3, 3],
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: {
        position: "top",
        align: "end",
        labels: {
          color: "#5c7a9b",
          font: { family: "'Space Mono', monospace", size: 10 },
          boxWidth: 16, boxHeight: 2, useBorderRadius: true, borderRadius: 2,
          padding: 16,
        },
      },
      tooltip: {
        backgroundColor: "rgba(4,11,30,0.95)",
        borderColor: "rgba(30,80,140,0.6)",
        borderWidth: 1,
        titleColor: "#7fb4d8",
        bodyColor: "#e0f2fe",
        titleFont: { family: "'Space Mono', monospace", size: 11 },
        bodyFont: { family: "'Space Mono', monospace", size: 11 },
        padding: 12,
        callbacks: {
          label: (ctx) => ` ${ctx.dataset.label}: ₹${fmt(ctx.raw)}`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: "#2e5070",
          font: { family: "'Space Mono', monospace", size: 10 },
          maxTicksLimit: 8,
        },
        grid: { color: "rgba(30,60,100,0.25)" },
      },
      y: {
        position: "right",
        ticks: {
          color: "#2e5070",
          font: { family: "'Space Mono', monospace", size: 10 },
          callback: (v) => `₹${Number(v).toLocaleString("en-IN")}`,
        },
        grid: { color: "rgba(30,60,100,0.2)" },
      },
    },
  };

  return (
    <div style={S.root}>
      {/* Ambient glow */}
      <div style={S.glowBlue} />
      <div style={S.glowPurple} />

      {/* ── Sidebar ── */}
      <aside style={S.sidebar}>
        {/* Logo */}
        <div style={S.logoWrap}>
          <span style={S.logoMark}>J</span>
          <span style={S.logoText}>ARNOX</span>
        </div>

        {/* Nav label */}
        <p style={S.sectionLabel}>MARKETS</p>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4, overflowY: "auto", flex: 1 }}>
          {companies.length === 0
            ? Array(8).fill(0).map((_, i) => (
                <div key={i} className="skeleton" style={{ height: 40, borderRadius: 10, marginBottom: 4 }} />
              ))
            : companies.map((c) => (
                <div
                  key={c.symbol}
                  className={`nav-item${selected === c.symbol ? " active" : ""}`}
                  onClick={() => setSelected(c.symbol)}
                >
                  <span style={{ flex: 1, fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: 12 }}>
                    {c.name}
                  </span>
                  <span className="ticker-badge">{c.symbol.split(".")[0]}</span>
                </div>
              ))}
        </nav>

        {/* Top movers */}
        {top && (
          <div style={S.moversBox}>
            <p style={S.sectionLabel}>TOP MOVERS</p>
            <div style={{ marginBottom: 12 }}>
              {top.gainers.map((g) => (
                <div key={g[0]} style={S.moverRow}>
                  <span style={S.moverName}>{g[0].split(".")[0]}</span>
                  <span style={{ ...S.moverPct, color: "#4ade80" }}>+{g[1].toFixed(2)}%</span>
                </div>
              ))}
            </div>
            {top.losers.map((l) => (
              <div key={l[0]} style={S.moverRow}>
                <span style={S.moverName}>{l[0].split(".")[0]}</span>
                <span style={{ ...S.moverPct, color: "#f87171" }}>{l[1].toFixed(2)}%</span>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ── Main ── */}
      <main style={S.main}>

        {/* ── Header bar ── */}
        <header style={S.header} className="fade-up">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {summary && <LiveDot up={isUp} />}
              <h1 style={S.stockName}>{selected}</h1>
            </div>

            {summary ? (
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <span style={S.priceDisplay}>₹{fmt(summary.current)}</span>
                <span
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: 13,
                    color: isUp ? "#4ade80" : "#f87171",
                    fontWeight: 700,
                  }}
                >
                  {isUp ? "▲" : "▼"} {Math.abs(summary.change)}% today
                </span>
              </div>
            ) : (
              <div className="skeleton" style={{ width: 220, height: 36, borderRadius: 8 }} />
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="select-ctrl"
            >
              <option value={30}>30 Days</option>
              <option value={90}>90 Days</option>
            </select>

            <select
              value={compareSymbol}
              onChange={(e) => setCompareSymbol(e.target.value)}
              className="select-ctrl"
            >
              {companies.map((c) => (
                <option key={c.symbol} value={c.symbol}>{c.name}</option>
              ))}
            </select>

            <button onClick={handleCompare} className="btn-primary">
              Compare ↗
            </button>
          </div>
        </header>

        {/* ── Stat cards ── */}
        <div style={S.statGrid} className="fade-up">
          {["52W High", "52W Low", "Average", "Volatility"].map((label, i) => {
            const vals = summary
              ? [summary.high, summary.low, summary.avg, `${summary.volatility}%`]
              : [null, null, null, null];
            return (
              <div key={label} className="stat-card" style={{ animationDelay: `${i * 0.06}s` }}>
                <p style={S.statLabel}>{label}</p>
                {vals[i] !== null ? (
                  <p style={S.statValue}>
                    {i < 3 ? "₹" : ""}{i < 3 ? fmt(vals[i]) : vals[i]}
                  </p>
                ) : (
                  <div className="skeleton" style={{ height: 28, borderRadius: 5, marginTop: 10 }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Tabs ── */}
        <div style={S.tabRow}>
          {["chart", "compare"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                ...S.tabBtn,
                color: tab === t ? "#e0f2fe" : "#3a6080",
                borderBottom: tab === t ? "2px solid #38bdf8" : "2px solid transparent",
              }}
            >
              {t === "chart" ? "PRICE CHART" : "COMPARISON"}
            </button>
          ))}
        </div>

        {/* ── Chart / Compare panel ── */}
        <div style={S.panel} className="fade-up">
          {tab === "chart" && (
            <div style={{ height: "100%" }}>
              {loading ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", gap: 10, color: "#2e5070", fontFamily: "'Space Mono', monospace", fontSize: 12 }}>
                  <span style={{ animation: "pulse-dot 1.2s infinite" }}>●</span> Fetching data…
                </div>
              ) : (
                <Line data={chartData} options={chartOptions} />
              )}
            </div>
          )}

          {tab === "compare" && (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {compare ? (
                <div style={S.compareGrid}>
                  {[
                    { sym: compare.symbol1, perf: compare.perf1 },
                    { sym: compare.symbol2, perf: compare.perf2 },
                  ].map((item, idx) => {
                    const pos = parseFloat(item.perf) >= 0;
                    return (
                      <div key={idx} style={S.compareCard}>
                        <p style={S.statLabel}>{item.sym}</p>
                        <p style={{ ...S.priceDisplay, fontSize: 34, color: pos ? "#4ade80" : "#f87171", marginTop: 10 }}>
                          {pos ? "+" : ""}{item.perf}
                        </p>
                        <p style={{ color: "#3a6080", fontFamily: "'Space Mono', monospace", fontSize: 11, marginTop: 8 }}>
                          {days}-day performance
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p style={{ color: "#2e5070", fontFamily: "'Space Mono', monospace", fontSize: 12, textAlign: "center", lineHeight: 2 }}>
                  Select a stock above and press<br />
                  <span style={{ color: "#38bdf8" }}>Compare ↗</span> to see head-to-head performance.
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

/* ─── Style object ─── */
const S = {
  root: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    background: "#040b14",
    color: "#c9dff0",
    fontFamily: "'Syne', sans-serif",
    overflow: "hidden",
    position: "relative",
  },
  glowBlue: {
    position: "fixed", top: -120, left: 200,
    width: 500, height: 500, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 70%)",
    pointerEvents: "none",
  },
  glowPurple: {
    position: "fixed", bottom: -100, right: 100,
    width: 400, height: 400, borderRadius: "50%",
    background: "radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)",
    pointerEvents: "none",
  },

  /* Sidebar */
  sidebar: {
    width: 230,
    minWidth: 230,
    display: "flex",
    flexDirection: "column",
    padding: "26px 14px",
    borderRight: "1px solid rgba(20,50,90,0.6)",
    background: "rgba(4,11,22,0.75)",
    backdropFilter: "blur(16px)",
    overflowY: "auto",
    zIndex: 10,
    gap: 4,
  },
  logoWrap: {
    display: "flex", alignItems: "center", gap: 8, marginBottom: 28,
  },
  logoMark: {
    width: 32, height: 32,
    background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
    borderRadius: 9,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18, color: "#fff",
    flexShrink: 0,
  },
  logoText: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: 18,
    letterSpacing: "0.12em", color: "#e0f2fe",
  },
  sectionLabel: {
    fontFamily: "'Space Mono', monospace", fontSize: 9,
    letterSpacing: "0.14em", color: "#1e4060",
    padding: "10px 4px 6px",
  },
  moversBox: {
    marginTop: "auto",
    paddingTop: 16,
    borderTop: "1px solid rgba(20,50,90,0.5)",
  },
  moverRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "5px 4px",
  },
  moverName: {
    fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#3a6080",
  },
  moverPct: {
    fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
  },

  /* Main */
  main: {
    flex: 1, display: "flex", flexDirection: "column",
    padding: "28px 32px 24px",
    overflow: "hidden", gap: 20,
  },
  header: {
    display: "flex", justifyContent: "space-between",
    alignItems: "flex-start", gap: 20, flexWrap: "wrap",
  },
  stockName: {
    fontFamily: "'Syne', sans-serif", fontWeight: 800,
    fontSize: 22, letterSpacing: "0.04em", color: "#e0f2fe",
  },
  priceDisplay: {
    fontFamily: "'Space Mono', monospace", fontWeight: 700,
    fontSize: 28, color: "#e0f2fe", letterSpacing: "-0.01em",
  },

  /* Stats */
  statGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
  },
  statLabel: {
    fontFamily: "'Space Mono', monospace", fontSize: 10,
    letterSpacing: "0.1em", color: "#2e5070", marginBottom: 8,
  },
  statValue: {
    fontFamily: "'Space Mono', monospace", fontWeight: 700,
    fontSize: 18, color: "#a8d4f0",
  },

  /* Tabs */
  tabRow: {
    display: "flex", gap: 0, borderBottom: "1px solid rgba(20,50,90,0.5)",
  },
  tabBtn: {
    background: "none", border: "none", cursor: "pointer",
    fontFamily: "'Space Mono', monospace", fontSize: 11,
    letterSpacing: "0.1em", padding: "8px 20px",
    transition: "color 0.2s, border-color 0.2s",
  },

  /* Panel */
  panel: {
    flex: 1,
    background: "rgba(6,16,34,0.7)",
    border: "1px solid rgba(20,50,90,0.5)",
    borderRadius: 16,
    padding: 20,
    backdropFilter: "blur(10px)",
    minHeight: 0,
  },

  /* Compare */
  compareGrid: {
    display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, width: "100%", maxWidth: 540,
  },
  compareCard: {
    background: "rgba(10,26,50,0.9)",
    border: "1px solid rgba(30,80,140,0.35)",
    borderRadius: 16, padding: "28px 24px", textAlign: "center",
  },
};