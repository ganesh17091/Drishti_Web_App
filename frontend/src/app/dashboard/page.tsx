"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

type InsightData = {
  stats: { total_hours: number; total_sessions: number; streak_days: number; tasks_completed: number; tasks_pending: number };
  daily_chart: { day: string; hours: number }[];
  ai_analysis: { productivity_level: string; insights: string };
};

const NAV_ITEMS = [
  { href: "/study",           icon: "📚", label: "Study Planner",       color: "#8b5cf6" },
  { href: "/exams",           icon: "⏳", label: "Exams & Goals",       color: "#f59e0b" },
  { href: "/log-activity",    icon: "⚡", label: "Log Activity",         color: "#f59e0b" },
  { href: "/recommendations", icon: "🧭", label: "AI Recommendations",  color: "#ec4899" },
  { href: "/resources",       icon: "🔗", label: "Learning Resources",  color: "#6366f1" },
  { href: "/insights",        icon: "📊", label: "Performance Insights", color: "#10b981" },
  { href: "/wellbeing",       icon: "🌿", label: "Digital Wellbeing",   color: "#34d399" },
  { href: "/profile",         icon: "👤", label: "Edit Profile",         color: "#94a3b8" },
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: "rgba(15,23,42,0.97)", border: "1px solid rgba(139,92,246,0.4)",
        padding: "10px 14px", borderRadius: "8px" }}>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>{label}</p>
        <p style={{ margin: 0, fontWeight: 700, color: "#8b5cf6" }}>{payload[0].value}h</p>
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const router = useRouter();
  const [schedule, setSchedule] = useState<any>(null);
  const [insights, setInsights] = useState<InsightData | null>(null);
  const [schedLoading, setSchedLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);

  const token = () => localStorage.getItem("token");
  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const t = token();
    if (!t) { router.push("/auth"); return; }

    const loadData = () => {
      setSchedLoading(true);

      // Step 1: Check if today's schedule already exists
      console.log("[Dashboard] Calling API:", `${API}/ai/schedule/today`);
      fetch(`${API}/ai/schedule/today`, {
        headers: { Authorization: `Bearer ${t}` },
      })
        .then(r => {
          if (r.status === 401) { router.push("/auth"); return null; }
          if (r.status === 404) { router.push("/onboarding"); return null; }
          return r.json();
        })
        .then(d => {
          if (!d) return;
          // If today's schedule has content, use it directly
          if (d.schedule && d.schedule.length > 0) {
            setSchedule(d);
            setSchedLoading(false);
          } else {
            // Step 2: No schedule yet — generate one via Gemini
            console.log("[Dashboard] Calling API:", `${API}/ai/generate-schedule`);
            fetch(`${API}/ai/generate-schedule`, {
              method: "POST",
              headers: { Authorization: `Bearer ${t}` },
            })
              .then(r => {
                if (r.status === 404) { router.push("/onboarding"); return null; }
                return r.json();
              })
              .then(d => { if (d) setSchedule(d); })
              .catch(() => {})
              .finally(() => setSchedLoading(false));
          }
        })
        .catch(() => setSchedLoading(false));

      // Fetch insights (non-blocking, silent error)
      console.log("[Dashboard] Calling API:", `${API}/ai/insights`);
      fetch(`${API}/ai/insights`, {
        headers: { Authorization: `Bearer ${t}` },
      })
        .then(r => r.json())
        .then(d => { if (!d.error) setInsights(d); })
        .catch(() => {})
        .finally(() => setInsightsLoading(false));
    };

    loadData();

    // Hot-reload the dashboard silently whenever FocusBot takes an action
    window.addEventListener("focuspath:update", loadData);
    return () => window.removeEventListener("focuspath:update", loadData);

  }, [router]);

  return (
    <div style={{ display: "flex", gap: "2rem", padding: "2.5rem 2rem", maxWidth: "1400px", margin: "0 auto", minHeight: "calc(100vh - 72px)" }}>

      {/* ─── LEFT PANEL ───────────────────────────────────── */}
      <aside style={{ width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* User Greeting */}
        <div className="glass-panel animate-fade-in" style={{ padding: "1.5rem", textAlign: "center" }}>
          <div style={{ width: "60px", height: "60px", borderRadius: "50%", margin: "0 auto 1rem",
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.6rem" }}>
            🎯
          </div>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "0.25rem" }}>Career Dashboard</h2>
          <p style={{ margin: 0, fontSize: "0.88rem" }}>AI-Powered Focus Engine</p>
        </div>

        {/* Navigation Menu */}
        <div className="glass-panel animate-fade-in" style={{ padding: "1rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "1.5px",
            color: "var(--text-secondary)", textTransform: "uppercase", padding: "0 0.5rem", marginBottom: "0.75rem" }}>
            Navigation
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {NAV_ITEMS.map(item => (
              <button key={item.href} onClick={() => router.push(item.href)}
                style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.7rem 0.85rem",
                  background: "transparent", border: "none", borderRadius: "10px", cursor: "pointer",
                  fontFamily: "Outfit, sans-serif", fontSize: "0.95rem", fontWeight: 500,
                  color: "var(--text-primary)", transition: "all 0.2s", textAlign: "left",
                  borderLeft: "3px solid transparent" }}
                onMouseEnter={e => {
                  const el = e.currentTarget;
                  el.style.background = "rgba(255,255,255,0.05)";
                  el.style.borderLeftColor = item.color;
                  el.style.paddingLeft = "1.1rem";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget;
                  el.style.background = "transparent";
                  el.style.borderLeftColor = "transparent";
                  el.style.paddingLeft = "0.85rem";
                }}>
                <span style={{ fontSize: "1.2rem", minWidth: "24px", textAlign: "center" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Quick Stats */}
        {insights && (
          <div className="glass-panel animate-fade-in" style={{ padding: "1.25rem" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "1.5px",
              color: "var(--text-secondary)", textTransform: "uppercase", marginBottom: "0.85rem" }}>
              Quick Stats
            </div>
            {[
              { icon: "⏱️", label: "Total Hours", val: `${insights.stats.total_hours}h`, color: "#8b5cf6" },
              { icon: "🔥", label: "Day Streak",  val: `${insights.stats.streak_days}d`, color: "#f59e0b" },
              { icon: "✅", label: "Tasks Done",  val: insights.stats.tasks_completed,    color: "#10b981" },
              { icon: "🎯", label: "Sessions",    val: insights.stats.total_sessions,      color: "#ec4899" },
            ].map(s => (
              <div key={s.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "0.6rem 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>{s.icon} {s.label}</span>
                <span style={{ color: s.color, fontWeight: 700 }}>{s.val}</span>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ─── RIGHT PANEL ──────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>

        {/* Row 0: Stats Strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem" }}>
          {[
            { icon: "⏱️", label: "Total Hours",  sub: "all time",         val: insights ? `${insights.stats.total_hours}h`        : "—", color: "#8b5cf6" },
            { icon: "🎯", label: "Sessions",     sub: "logged",           val: insights ? `${insights.stats.total_sessions}`      : "—", color: "#ec4899" },
            { icon: "🔥", label: "Day Streak",   sub: "consecutive days", val: insights ? `${insights.stats.streak_days}d`         : "—", color: "#f59e0b" },
            { icon: "✅", label: "Tasks Done",   sub: "completed",        val: insights ? `${insights.stats.tasks_completed}`     : "—", color: "#10b981" },
            { icon: "⏳", label: "Pending",      sub: "tasks left",       val: insights ? `${insights.stats.tasks_pending}`       : "—", color: "#6366f1" },
          ].map(s => (
            <div key={s.label} className="glass-panel animate-fade-in"
              style={{ padding: "1.25rem 1rem", textAlign: "center", borderTop: `3px solid ${s.color}` }}>
              <div style={{ fontSize: "1.6rem", marginBottom: "0.4rem" }}>{s.icon}</div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>
                {insightsLoading ? "…" : s.val}
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.85rem", marginTop: "0.4rem" }}>{s.label}</div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Row 1: Productivity Badge + Bar Chart */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem" }}>

          {/* Productivity Level */}
          <div className="glass-panel animate-fade-in" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
            {insightsLoading ? (
              <p style={{ textAlign: "center" }}>Loading analysis...</p>
            ) : insights ? (
              <>
                <div style={{ fontSize: "0.8rem", letterSpacing: "1.5px", color: "var(--text-secondary)",
                  textTransform: "uppercase", marginBottom: "0.75rem" }}>AI Productivity Level</div>
                <div style={{ fontSize: "1.5rem", fontWeight: 800,
                  background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                  marginBottom: "1rem" }}>
                  {insights.ai_analysis?.productivity_level}
                </div>
                <p style={{ fontSize: "0.88rem", lineHeight: 1.6, color: "var(--text-secondary)", margin: 0 }}>
                  {insights.ai_analysis?.insights?.slice(0, 160)}...
                </p>
                <button onClick={() => router.push("/insights")}
                  style={{ marginTop: "1rem", padding: "8px 16px", background: "rgba(139,92,246,0.15)",
                    border: "1px solid rgba(139,92,246,0.3)", borderRadius: "8px", color: "var(--primary)",
                    cursor: "pointer", fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.88rem" }}>
                  View Full Insights →
                </button>
              </>
            ) : (
              <>
                <div style={{ fontSize: "1.3rem", fontWeight: 700, marginBottom: "0.75rem" }}>📊 Track Progress</div>
                <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: "0 0 1rem" }}>
                  Log activities to unlock your AI performance analysis.
                </p>
                <button onClick={() => router.push("/log-activity")}
                  style={{ padding: "8px 16px", background: "rgba(139,92,246,0.15)",
                    border: "1px solid rgba(139,92,246,0.3)", borderRadius: "8px", color: "var(--primary)",
                    cursor: "pointer", fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.88rem" }}>
                  Log First Activity →
                </button>
              </>
            )}
          </div>

          {/* 7-Day Bar Chart */}
          <div className="glass-panel animate-fade-in" style={{ padding: "1.75rem" }}>
            <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700 }}>📅 Study Hours — Last 7 Days</h3>
            {!insightsLoading && insights?.daily_chart ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={insights.daily_chart} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                  <XAxis dataKey="day" stroke="#94a3b8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} unit="h" tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="hours" fill="url(#dashGrad)" radius={[6, 6, 0, 0]} />
                  <defs>
                    <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8b5cf6" />
                      <stop offset="100%" stopColor="#ec4899" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: "180px", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)" }}>
                {insightsLoading ? "Loading chart..." : "No data yet — start logging activities!"}
              </div>
            )}
          </div>
        </div>

        {/* Row 2: Today's AI Schedule */}
        <div className="glass-panel animate-fade-in" style={{ padding: "1.75rem" }}>
          <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 700 }}>
            🤖 Today's AI-Generated Schedule
          </h3>
          {!schedLoading && schedule?.daily_focus && (
            <p style={{ color: "var(--primary)", fontStyle: "italic", margin: "0 0 1.25rem", fontSize: "0.9rem" }}>
              🎯 {schedule.daily_focus}
            </p>
          )}

          {schedLoading ? (
            <p style={{ textAlign: "center", color: "var(--text-secondary)" }}>Gemini is building your schedule...</p>
          ) : schedule?.schedule ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
              {schedule.schedule.map((item: any, idx: number) => (
                <div key={idx} style={{ background: "rgba(0,0,0,0.3)", padding: "1rem 1.25rem",
                  borderRadius: "12px", borderLeft: "3px solid var(--secondary)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.4rem" }}>
                    <span style={{ fontWeight: 700, color: "var(--secondary)", fontSize: "0.95rem" }}>{item.time}</span>
                    <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>{item.duration}m</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-primary)", lineHeight: 1.5 }}>{item.task}</p>
                </div>
              ))}
            </div>
          ) : schedule?.error === "RATE_LIMIT" || schedule?.error?.includes("RATE_LIMIT") ? (
            <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid #ef4444", background: "rgba(239,68,68,0.05)" }}>
              <h4 style={{ margin: "0 0 0.5rem", color: "#ef4444", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>⚠️</span> API Rate Limit Exceeded
              </h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                FocusBot hit Google's free-tier request limit (15 requests/min). Please wait 60 seconds and refresh the page to try again!
              </p>
            </div>
          ) : schedule?.error ? (
             <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid #f59e0b", background: "rgba(245,158,11,0.05)" }}>
              <h4 style={{ margin: "0 0 0.5rem", color: "#f59e0b", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span>⚠️</span> AI Generation Failed
              </h4>
              <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                {schedule.error}
              </p>
            </div>
          ) : (
            <p style={{ color: "var(--text-secondary)" }}>Schedule unavailable. Check your profile is complete.</p>
          )}
        </div>

      </main>
    </div>
  );
}
