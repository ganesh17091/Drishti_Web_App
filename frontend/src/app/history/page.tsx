"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/study",           icon: "📚", label: "Study Planner",       color: "#8b5cf6" },
  { href: "/exams",           icon: "⏳", label: "Exams & Goals",       color: "#f59e0b" },
  { href: "/log-activity",    icon: "⚡", label: "Log Activity",         color: "#f59e0b" },
  { href: "/recommendations", icon: "🧭", label: "AI Recommendations",  color: "#ec4899" },
  { href: "/resources",       icon: "🔗", label: "Learning Resources",  color: "#6366f1" },
  { href: "/insights",        icon: "📊", label: "Performance Insights", color: "#10b981" },
  { href: "/history",         icon: "🕰️", label: "History & Activities",color: "#64748b" },
  { href: "/wellbeing",       icon: "🌿", label: "Digital Wellbeing",   color: "#34d399" },
  { href: "/profile",         icon: "👤", label: "Edit Profile",         color: "#94a3b8" },
];

export default function HistoryPage() {
  const router = useRouter();
  const [schedule, setSchedule] = useState<any>(null);
  const [insights, setInsights] = useState<any>(null);
  const [activities, setActivities] = useState<any[]>([]);
  
  const [schedLoading, setSchedLoading] = useState(true);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [actsLoading, setActsLoading] = useState(true);

  const getLocalDateString = useCallback((d: Date = new Date()) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }, []);

  const [selectedDate, setSelectedDate] = useState(() => {
    // defaults to yesterday on mount if possible, or today if they want to choose
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return getLocalDateString(d);
  });

  const token = () => localStorage.getItem("token");
  const API = process.env.NEXT_PUBLIC_API_URL;

  const loadData = useCallback(() => {
    const controller = new AbortController();
    const t = token();
    if (!t) { router.push("/auth"); return controller; }

    setSchedLoading(true);
    setInsightsLoading(true);
    setActsLoading(true);
    setSchedule(null);
    setInsights(null);
    setActivities([]);

    // Capture exact date to prevent applying stale fetches
    const reqDate = selectedDate;

    // 1. Fetch Schedule for Past Date
    fetch(`${API}/ai/schedule?date=${reqDate}`, {
      headers: { Authorization: `Bearer ${t}` },
      signal: controller.signal
    })
      .then(r => {
        if (r.status === 401) { router.push("/auth"); return null; }
        return r.json();
      })
      .then(d => {
        if (!d || controller.signal.aborted) return;
        if (d.schedule && d.schedule.length > 0) {
          setSchedule(d);
        } else {
          setSchedule({ error: "No AI Schedule generated for this specific date." });
        }
      })
      .catch(e => {
        if (e.name !== "AbortError") setSchedule({ error: "Failed to load schedule." });
      })
      .finally(() => { if (!controller.signal.aborted) setSchedLoading(false) });

    // 2. Fetch Insights (AI feedback & daily stats) for Past Date
    fetch(`${API}/ai/insights?date=${reqDate}`, {
      headers: { Authorization: `Bearer ${t}` },
      signal: controller.signal
    })
      .then(r => {
        if (r.status === 401) { router.push("/auth"); return null; }
        return r.json();
      })
      .then(d => { 
        if (!d || controller.signal.aborted) return;
        if (!d.error) setInsights(d); 
      })
      .catch(e => {
        if (e.name !== "AbortError") console.error("Insights fetch error", e);
      })
      .finally(() => { if (!controller.signal.aborted) setInsightsLoading(false) });

    // 3. Fetch specific Activities Timeline
    fetch(`${API}/ai/history-activities?date=${reqDate}`, {
      headers: { Authorization: `Bearer ${t}` },
      signal: controller.signal
    })
      .then(r => {
        if (r.status === 401) { router.push("/auth"); return null; }
        return r.json();
      })
      .then(d => { 
        if (!d || controller.signal.aborted) return;
        if (d.activities) setActivities(d.activities); 
      })
      .catch(e => {
        if (e.name !== "AbortError") console.error("Activities fetch error", e);
      })
      .finally(() => { if (!controller.signal.aborted) setActsLoading(false) });

    return controller;
  }, [router, API, selectedDate]);

  useEffect(() => {
    const controller = loadData();
    return () => controller.abort();
  }, [loadData]);

  return (
    <div style={{ display: "flex", gap: "2rem", padding: "2.5rem 4%", maxWidth: "1800px", margin: "0 auto", minHeight: "calc(100vh - 72px)" }}>
      {/* ─── LEFT PANEL ───────────────────────────────────── */}
      <aside style={{ width: "280px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        {/* Navigation Menu */}
        <div className="glass-panel animate-fade-in" style={{ padding: "1rem" }}>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, letterSpacing: "1.5px",
            color: "var(--text-secondary)", textTransform: "uppercase", padding: "0 0.5rem", marginBottom: "0.75rem" }}>
            Navigation
          </div>
          <nav style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            <button onClick={() => router.push("/dashboard")}
                style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.7rem 0.85rem",
                  background: "transparent", border: "none", borderRadius: "10px", cursor: "pointer",
                  fontFamily: "Outfit, sans-serif", fontSize: "0.95rem", fontWeight: 500,
                  color: "var(--text-primary)", transition: "all 0.2s", textAlign: "left",
                  borderLeft: "3px solid transparent" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,0,0,0.03)"; e.currentTarget.style.paddingLeft = "1.1rem"; }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.paddingLeft = "0.85rem"; }}>
                <span style={{ fontSize: "1.2rem", minWidth: "24px", textAlign: "center" }}>🏠</span>
                <span>Dashboard</span>
            </button>
            {NAV_ITEMS.map(item => (
              <button key={item.href} onClick={() => router.push(item.href)}
                style={{ display: "flex", alignItems: "center", gap: "0.85rem", padding: "0.7rem 0.85rem",
                  background: item.href === "/history" ? "rgba(0,0,0,0.05)" : "transparent", 
                  border: "none", borderRadius: "10px", cursor: "pointer",
                  fontFamily: "Outfit, sans-serif", fontSize: "0.95rem", fontWeight: item.href === "/history" ? 700 : 500,
                  color: "var(--text-primary)", transition: "all 0.2s", textAlign: "left",
                  borderLeft: item.href === "/history" ? `3px solid ${item.color}` : "3px solid transparent" }}
                onMouseEnter={e => { if(item.href !== "/history"){ e.currentTarget.style.background = "rgba(0,0,0,0.03)"; e.currentTarget.style.borderLeftColor = item.color; e.currentTarget.style.paddingLeft = "1.1rem"; } }}
                onMouseLeave={e => { if(item.href !== "/history"){ e.currentTarget.style.background = "transparent"; e.currentTarget.style.borderLeftColor = "transparent"; e.currentTarget.style.paddingLeft = "0.85rem"; } }}>
                <span style={{ fontSize: "1.2rem", minWidth: "24px", textAlign: "center" }}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      {/* ─── RIGHT PANEL ──────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>
        
        {/* Header & Date Selector */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
          <div>
             <h1 style={{ margin: 0, fontSize: "1.8rem", color: "var(--text-primary)" }}>Historical Timeline</h1>
             <p style={{ margin: "4px 0 0", color: "var(--text-secondary)", fontSize: "0.9rem" }}>Review your past activities, schedules, and AI insights.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <label style={{ color: "var(--text-secondary)", fontSize: "0.9rem", fontWeight: 600 }}>Select Date:</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} max={getLocalDateString()}
              style={{ padding: "10px 14px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.2)", color: "white", outline: "none", fontFamily: "Outfit", colorScheme: "dark", fontSize: "0.95rem" }}
            />
          </div>
        </div>

        {/* Overview Stats for that Day */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
          {[
            { icon: "⏱️", label: "Hours Tracked", val: insights ? `${insights.stats?.daily_hours ?? 0}h` : "—", color: "#8b5cf6" },
            { icon: "🎯", label: "Sessions Logged", val: insights ? `${insights.stats?.daily_sessions ?? 0}` : "—", color: "#ea580c" },
            { icon: "✅", label: "Tasks Completed", val: insights ? `${insights.stats?.daily_tasks ?? 0}` : "—", color: "#10b981" },
          ].map(s => (
            <div key={s.label} className="glass-panel animate-fade-in"
              style={{ padding: "1.5rem", display: "flex", alignItems: "center", gap: "1.2rem", borderTop: `4px solid ${s.color}` }}>
              <div style={{ fontSize: "2.5rem" }}>{s.icon}</div>
              <div>
                <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>{insightsLoading ? "…" : s.val}</div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", marginTop: "0.4rem", color: "var(--text-secondary)" }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
            {/* Activities Timeline */}
            <div className="glass-panel animate-fade-in" style={{ padding: "1.75rem", display: "flex", flexDirection: "column" }}>
                <h3 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem", fontWeight: 700 }}>⚡ Activity Log</h3>
                {actsLoading ? (
                    <p style={{ color: "var(--text-secondary)" }}>Loading timeline...</p>
                ) : activities.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", maxHeight: "400px", overflowY: "auto", paddingRight: "10px" }} className="custom-scrollbar">
                        {activities.map((act, idx) => (
                            <div key={idx} style={{ display: "flex", gap: "1rem" }}>
                                {(() => {
                                    const parts = typeof act.time === "string" ? act.time.split(" ") : [];
                                    const datePart = parts[0] ?? "";
                                    const timePart = parts[1] ?? "";
                                    return (
                                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "40px" }}>
                                          <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-secondary)" }}>{datePart}</div>
                                          <div style={{ fontSize: "0.6rem", color: "var(--text-secondary)" }}>{timePart}</div>
                                      </div>
                                    );
                                })()}
                                <div style={{ flex: 1, background: "rgba(255,255,255,0.4)", border: "1px solid rgba(0,0,0,0.05)", padding: "12px", borderRadius: "12px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{act.activity_type}</span>
                                        <span className="badge badge-orange">{act.duration_minutes}m</span>
                                    </div>
                                    <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: 1.4 }}>{act.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ padding: "2rem", textAlign: "center", background: "rgba(0,0,0,0.02)", borderRadius: "12px" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🏜️</div>
                        <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>No activities recorded on this date.</p>
                    </div>
                )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* AI Schedule */}
                <div className="glass-panel animate-fade-in" style={{ padding: "1.75rem" }}>
                    <h3 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem", fontWeight: 700 }}>🤖 AI Schedule</h3>
                    {schedLoading ? (
                        <p style={{ color: "var(--text-secondary)" }}>Loading schedule...</p>
                    ) : schedule?.schedule ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", maxHeight: "250px", overflowY: "auto", paddingRight: "10px" }} className="custom-scrollbar">
                             {schedule.schedule.map((item: any, idx: number) => (
                                <div key={idx} style={{ padding: "10px 14px", background: "rgba(255,255,255,0.4)", borderRadius: "10px", display: "flex", gap: "15px", alignItems: "center" }}>
                                    <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--primary)", minWidth: "65px" }}>{item.time}</div>
                                    <div style={{ flex: 1, fontSize: "0.9rem" }}>{item.task}</div>
                                    <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>{item.duration}m</div>
                                </div>
                             ))}
                        </div>
                    ) : (
                        <div style={{ padding: "2rem", textAlign: "center", background: "rgba(0,0,0,0.02)", borderRadius: "12px" }}>
                            <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.9rem" }}>{schedule?.error || "No schedule generated for this date."}</p>
                        </div>
                    )}
                </div>

                {/* AI Insights specific for that day */}
                <div className="glass-panel glass-panel-orange animate-fade-in" style={{ padding: "1.75rem", flex: 1 }}>
                    <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 700 }}>🧠 Daily Verdict</h3>
                    {insightsLoading ? (
                         <p style={{ color: "var(--text-secondary)" }}>Loading analysis...</p>
                    ) : insights?.ai_analysis ? (
                        <>
                            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#ea580c", marginBottom: "0.75rem" }}>
                            {insights.ai_analysis.productivity_level}
                            </div>
                            <p style={{ fontSize: "0.9rem", lineHeight: 1.6, color: "var(--text-primary)", margin: 0 }}>
                            {insights.ai_analysis.insights}
                            </p>
                        </>
                    ) : (
                        <p style={{ margin: "1rem 0 0", color: "var(--text-secondary)", opacity: 0.8, fontSize: "0.9rem" }}>No AI insights were generated on this date (requires logged activity).</p>
                    )}
                </div>
            </div>

        </div>
      </main>
    </div>
  );
}
