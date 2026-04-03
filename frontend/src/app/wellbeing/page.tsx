"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────
type Activity = { type: string; label: string; minutes: number; hours: number; pct: number; color: string };
type TimelineEntry = { time: string; type: string; label: string; description: string; duration: number; color: string };
type HourlyEntry = { hour: number; minutes: number };

type WellbeingData = {
  date: string;
  total_minutes: number;
  total_hours: number;
  session_count: number;
  daily_goal_hours: number;
  goal_progress_pct: number;
  activity_breakdown: Activity[];
  timeline: TimelineEntry[];
  hourly: HourlyEntry[];
  focus_score: number;
  most_active_type: string | null;
  tasks_completed: number;
  tasks_pending: number;
  yesterday_minutes: number;
  change_pct: number | null;
  change_direction: "up" | "down";
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmtTime = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

const HOUR_LABELS = ["12a","1","2","3","4","5","6","7","8","9","10","11","12p","1","2","3","4","5","6","7","8","9","10","11"];

// ─── Circular Ring Component ─────────────────────────────────────────────────
function ScreenTimeRing({ pct, hours, goal }: { pct: number; hours: number; goal: number }) {
  const R = 88;
  const circ = 2 * Math.PI * R;
  const filled = (pct / 100) * circ;
  const color = pct >= 100 ? "#10b981" : pct >= 60 ? "#8b5cf6" : pct >= 30 ? "#f59e0b" : "#64748b";

  return (
    <div style={{ position: "relative", width: 220, height: 220, margin: "0 auto" }}>
      <svg width={220} height={220} viewBox="0 0 220 220">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={110} cy={110} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={18} />
        {/* Progress */}
        <circle
          cx={110} cy={110} r={R} fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={18}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          strokeDashoffset={circ / 4}
          style={{ transition: "stroke-dasharray 1s cubic-bezier(.4,0,.2,1)" }}
        />
        {/* Glow dot at tip */}
        {pct > 2 && (
          <circle
            cx={110 + R * Math.cos((filled / circ) * 2 * Math.PI - Math.PI / 2)}
            cy={110 + R * Math.sin((filled / circ) * 2 * Math.PI - Math.PI / 2)}
            r={9} fill={color}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        )}
      </svg>
      {/* Center text */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontSize: "2.4rem", fontWeight: 800, lineHeight: 1, color: "white" }}>
          {hours}h
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>
          of {goal}h goal
        </div>
        <div style={{
          marginTop: "0.5rem", padding: "2px 10px", borderRadius: "999px",
          background: `${color}22`, color, fontSize: "0.8rem", fontWeight: 700,
        }}>
          {pct}%
        </div>
      </div>
    </div>
  );
}

// ─── Focus Score Meter ────────────────────────────────────────────────────────
function FocusMeter({ score }: { score: number }) {
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";
  const label = score >= 80 ? "Excellent" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Low";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Focus Score</span>
        <span style={{ fontWeight: 800, color, fontSize: "1rem" }}>{score} — {label}</span>
      </div>
      <div style={{ height: "10px", borderRadius: "999px", background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${score}%`, borderRadius: "999px",
          background: `linear-gradient(90deg, #8b5cf6, ${color})`,
          transition: "width 1s cubic-bezier(.4,0,.2,1)",
          boxShadow: `0 0 12px ${color}60`,
        }} />
      </div>
    </div>
  );
}

// ─── Hourly Heatmap ───────────────────────────────────────────────────────────
function HourlyHeatmap({ hourly }: { hourly: HourlyEntry[] }) {
  const maxMin = Math.max(...hourly.map(h => h.minutes), 1);
  return (
    <div>
      <div style={{ display: "flex", gap: "3px", alignItems: "flex-end", height: "48px" }}>
        {hourly.map(h => {
          const pct = h.minutes / maxMin;
          const active = h.minutes > 0;
          return (
            <div key={h.hour} title={`${HOUR_LABELS[h.hour]} — ${fmtTime(h.minutes)}`}
              style={{
                flex: 1, borderRadius: "3px 3px 0 0",
                height: `${Math.max(active ? 6 : 2, pct * 48)}px`,
                background: active
                  ? `rgba(139,92,246,${0.2 + pct * 0.8})`
                  : "rgba(255,255,255,0.04)",
                cursor: active ? "pointer" : "default",
                transition: "height 0.5s ease",
              }} />
          );
        })}
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
        {["12a","6","12p","6","11"].map((l, i) => (
          <span key={i} style={{ fontSize: "0.65rem", color: "rgba(148,163,184,0.5)" }}>{l}</span>
        ))}
      </div>
    </div>
  );
}

// ─── Custom Pie Tooltip ───────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }: any) => {
  if (active && payload?.length) {
    const d = payload[0].payload;
    return (
      <div style={{ background: "rgba(15,23,42,0.97)", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 14px", borderRadius: "10px" }}>
        <div style={{ fontWeight: 700, color: d.color }}>{d.label}</div>
        <div style={{ color: "#94a3b8", fontSize: "0.85rem" }}>{fmtTime(d.minutes)} · {d.pct}%</div>
      </div>
    );
  }
  return null;
};

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function WellbeingPage() {
  const router = useRouter();
  const [data, setData] = useState<WellbeingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (!t) { router.push("/auth"); return; }

    const API = process.env.NEXT_PUBLIC_API_URL;
    console.log("[Wellbeing] Calling API:", `${API}/wellbeing/today`);
    fetch(`${API}/wellbeing/today`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(r => r.json())
      .then(d => { if (!d.error) setData(d); })
      .catch((err) => { console.error("[Wellbeing] API error:", err); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "60vh" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🌿</div>
        <p>Loading your wellbeing data...</p>
      </div>
    </div>
  );

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "2rem", display: "flex", alignItems: "center", gap: "0.6rem" }}>
            🌿 Digital Wellbeing
          </h1>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.95rem" }}>{today}</p>
        </div>
        <button onClick={() => router.push("/dashboard")}
          style={{
            padding: "9px 18px", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px",
            color: "var(--text-secondary)", cursor: "pointer",
            fontFamily: "Outfit, sans-serif", fontSize: "0.9rem", fontWeight: 600,
          }}>← Dashboard</button>
      </div>

      {!data || data.session_count === 0 ? (
        /* ── Empty state ── */
        <div className="glass-panel animate-fade-in" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1.25rem" }}>🌱</div>
          <h2>No activity logged today yet</h2>
          <p style={{ maxWidth: "480px", margin: "0 auto 2rem" }}>
            Start logging study sessions to track your screen time and daily progress here.
          </p>
          <button onClick={() => router.push("/log-activity")}
            className="modern-btn" style={{ maxWidth: "240px" }}>
            Log Your First Session →
          </button>
        </div>
      ) : (
        <>
          {/* ── Row 1: Screen Time Ring + Stats ── */}
          <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem", marginBottom: "1.5rem" }}>

            {/* Ring card */}
            <div className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 700, letterSpacing: "1.5px", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                Today's Screen Time
              </div>
              <ScreenTimeRing pct={data.goal_progress_pct} hours={data.total_hours} goal={data.daily_goal_hours} />

              {/* Yesterday comparison */}
              {data.change_pct !== null && (
                <div style={{
                  padding: "6px 14px", borderRadius: "999px", fontSize: "0.82rem", fontWeight: 700,
                  background: data.change_direction === "up" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                  color: data.change_direction === "up" ? "#10b981" : "#ef4444",
                  border: `1px solid ${data.change_direction === "up" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
                }}>
                  {data.change_direction === "up" ? "▲" : "▼"} {Math.abs(data.change_pct)}% vs yesterday
                </div>
              )}
            </div>

            {/* Stats grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              {[
                { icon: "⏱️", label: "Total Time",    val: fmtTime(data.total_minutes),  sub: "logged today",      color: "#8b5cf6" },
                { icon: "🔄", label: "Sessions",      val: data.session_count,            sub: "activity sessions", color: "#ec4899" },
                { icon: "✅", label: "Tasks Done",    val: data.tasks_completed,          sub: "completed",         color: "#10b981" },
                { icon: "⏳", label: "Tasks Pending", val: data.tasks_pending,            sub: "still to do",       color: "#f59e0b" },
              ].map(s => (
                <div key={s.label} className="glass-panel"
                  style={{ padding: "1.25rem", borderTop: `3px solid ${s.color}`, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <div style={{ fontSize: "1.5rem" }}>{s.icon}</div>
                  <div style={{ fontSize: "2rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>{s.val}</div>
                  <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>{s.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Row 2: Focus Score + Heatmap ── */}
          <div className="glass-panel animate-fade-in" style={{ padding: "1.75rem", marginBottom: "1.5rem" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2.5rem", alignItems: "center" }}>
              <div>
                <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>🎯 Focus Score</h3>
                <FocusMeter score={data.focus_score} />
                <p style={{ margin: "0.85rem 0 0", fontSize: "0.83rem", lineHeight: 1.6 }}>
                  Based on time studied, number of sessions, and tasks completed today.
                  {data.most_active_type && ` Your strongest category today: `}
                  {data.most_active_type && (
                    <span style={{ fontWeight: 700, color: "var(--primary)" }}>{data.most_active_type}</span>
                  )}
                </p>
              </div>
              <div>
                <h3 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700 }}>📊 Activity Heatmap</h3>
                <HourlyHeatmap hourly={data.hourly} />
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  Hover bars to see minutes per hour
                </p>
              </div>
            </div>
          </div>

          {/* ── Row 3: Pie Chart + "What You Did Today" ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: "1.5rem", marginBottom: "1.5rem" }}>

            {/* Pie Chart */}
            <div className="glass-panel animate-fade-in" style={{ padding: "1.75rem" }}>
              <h3 style={{ margin: "0 0 1.25rem", fontSize: "0.95rem", fontWeight: 700 }}>🥧 Activity Breakdown</h3>
              {data.activity_breakdown.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={data.activity_breakdown}
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={90}
                        paddingAngle={3}
                        dataKey="minutes"
                        nameKey="label"
                      >
                        {data.activity_breakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Legend */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.5rem" }}>
                    {data.activity_breakdown.map((a, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: "10px", height: "10px", borderRadius: "3px", background: a.color, flexShrink: 0 }} />
                          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>{a.label}</span>
                        </div>
                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: a.color }}>{fmtTime(a.minutes)}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ color: "var(--text-secondary)", textAlign: "center", padding: "2rem 0" }}>No data</div>
              )}
            </div>

            {/* Timeline */}
            <div className="glass-panel animate-fade-in" style={{ padding: "1.75rem" }}>
              <h3 style={{ margin: "0 0 1.25rem", fontSize: "0.95rem", fontWeight: 700 }}>🕐 What You Did Today</h3>

              {data.timeline.length === 0 ? (
                <p style={{ color: "var(--text-secondary)" }}>No sessions logged yet.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0", maxHeight: "380px", overflowY: "auto", scrollbarWidth: "thin" }}>
                  {data.timeline.map((entry, i) => (
                    <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start", position: "relative", paddingBottom: "1.1rem" }}>
                      {/* Timeline line */}
                      {i < data.timeline.length - 1 && (
                        <div style={{
                          position: "absolute", left: "15px", top: "32px",
                          width: "2px", bottom: 0,
                          background: "rgba(255,255,255,0.06)",
                        }} />
                      )}

                      {/* Dot */}
                      <div style={{
                        width: "30px", height: "30px", borderRadius: "50%", flexShrink: 0,
                        background: `${entry.color}22`,
                        border: `2px solid ${entry.color}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.7rem", fontWeight: 700, color: entry.color,
                        marginTop: "2px", zIndex: 1,
                      }}>
                        {entry.label.slice(0, 2).toUpperCase()}
                      </div>

                      {/* Content */}
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{entry.label}</span>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{entry.time}</span>
                        </div>
                        {entry.description && (
                          <p style={{ margin: 0, fontSize: "0.83rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>
                            {entry.description}
                          </p>
                        )}
                        <div style={{
                          display: "inline-block", marginTop: "0.3rem",
                          fontSize: "0.75rem", fontWeight: 600,
                          padding: "2px 8px", borderRadius: "999px",
                          background: `${entry.color}18`, color: entry.color,
                        }}>
                          {fmtTime(entry.duration)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Row 4: Wellbeing Tips ── */}
          <div className="glass-panel animate-fade-in" style={{ padding: "1.75rem" }}>
            <h3 style={{ margin: "0 0 1.25rem", fontSize: "0.95rem", fontWeight: 700 }}>💡 Wellbeing Tips for Today</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem" }}>
              {[
                data.total_hours < 1 && { icon: "🚀", tip: "You've barely started — even 30 focused minutes today will build momentum!" },
                data.total_hours >= data.daily_goal_hours && { icon: "🏆", tip: "You've hit your daily goal! Great discipline. Make sure to rest your eyes." },
                data.session_count > 5 && { icon: "🧠", tip: "Many short sessions detected. Try a 90-min deep work block tomorrow for better flow." },
                data.focus_score < 40 && { icon: "🌿", tip: "Low focus today. Try the Pomodoro technique: 25 min on, 5 min off." },
                data.tasks_pending > 3 && { icon: "📋", tip: `You have ${data.tasks_pending} pending tasks. Tackle the hardest one first tomorrow.` },
                { icon: "👁️", tip: "Remember the 20-20-20 rule: every 20 min, look at something 20 feet away for 20 seconds." },
                { icon: "💧", tip: "Stay hydrated! A glass of water every hour improves focus and cognitive performance." },
                { icon: "🚶", tip: "Take a 10-minute walk between study sessions to reset your brain and boost energy." },
              ].filter(Boolean).slice(0, 4).map((t: any, i) => (
                <div key={i} style={{
                  padding: "1rem", background: "rgba(139,92,246,0.06)",
                  border: "1px solid rgba(139,92,246,0.15)", borderRadius: "12px",
                }}>
                  <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{t.icon}</div>
                  <p style={{ margin: 0, fontSize: "0.85rem", lineHeight: 1.6 }}>{t.tip}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
