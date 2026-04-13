"use client";
import { useEffect, useState, useCallback } from "react";
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

import { CircularProgressbar, buildStyles } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

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
  const [schedSlowLoad, setSchedSlowLoad] = useState(false);

  const token = () => localStorage.getItem("token");
  const API = process.env.NEXT_PUBLIC_API_URL;

  const loadData = useCallback(() => {
    const t = token();
    if (!t) { router.push("/auth"); return; }

    setSchedLoading(true);
    setSchedule(null);
    setSchedSlowLoad(false);

    // Cold-start hint after 6 seconds
    const slowTimer = setTimeout(() => setSchedSlowLoad(true), 6000);

    // Step 1: Check if today's schedule already exists
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
        if (d.schedule && d.schedule.length > 0) {
          setSchedule(d);
          setSchedLoading(false);
          clearTimeout(slowTimer);
          setSchedSlowLoad(false);
        } else {
          // Step 2: Generate fresh schedule via Gemini
          fetch(`${API}/ai/generate-schedule`, {
            method: "POST",
            headers: { Authorization: `Bearer ${t}` },
          })
            .then(async r => {
              const body = await r.json();
              if (r.status === 400) {
                // No activity logs — show actionable message
                setSchedule({ error: body.error || "Please log at least one activity before generating a schedule." });
              } else if (r.status === 429 || body?.error === "RATE_LIMIT") {
                setSchedule({
                  error: "RATE_LIMIT",
                  message: body?.message || "API rate limit reached. Please wait a minute and try again.",
                });
              } else if (!r.ok) {
                setSchedule({ error: body?.error || `Server error (${r.status}). Please try again.` });
              } else {
                setSchedule(body);
              }
            })
            .catch(() => {
              setSchedule({ error: "Cannot reach the server. The backend may be waking up — please retry in 30 seconds." });
            })
            .finally(() => {
              clearTimeout(slowTimer);
              setSchedSlowLoad(false);
              setSchedLoading(false);
            });
        }
      })
      .catch(() => {
        clearTimeout(slowTimer);
        setSchedSlowLoad(false);
        setSchedule({ error: "Cannot reach the server. Please check your connection and retry." });
        setSchedLoading(false);
      });

    // Fetch insights (non-blocking)
    setInsightsLoading(true);
    fetch(`${API}/ai/insights`, {
      headers: { Authorization: `Bearer ${t}` },
    })
      .then(r => r.json())
      .then(d => { if (!d.error) setInsights(d); })
      .catch(() => {})
      .finally(() => setInsightsLoading(false));
  }, [router, API]);

  useEffect(() => {
    loadData();
    window.addEventListener("focuspath:update", loadData);
    return () => window.removeEventListener("focuspath:update", loadData);
  }, [loadData]);

  return (
    <div style={{ display: "flex", gap: "2rem", padding: "2.5rem 4%", maxWidth: "1800px", margin: "0 auto", minHeight: "calc(100vh - 72px)" }}>

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
                  el.style.background = "rgba(0,0,0,0.03)";
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
                padding: "0.6rem 0", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                <span style={{ color: "var(--text-secondary)", fontSize: "0.88rem" }}>{s.icon} {s.label}</span>
                <span style={{ color: s.color, fontWeight: 700 }}>{s.val}</span>
              </div>
            ))}
          </div>
        )}
      </aside>

      {/* ─── RIGHT PANEL ──────────────────────────────────── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", gap: "1.5rem", minWidth: 0 }}>

        {/* Row 0: Stats Strip (Time Analytics overview mock) */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1rem" }}>
          {/* Main Time Analytics Widget */}
          <div className="glass-panel" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Time Analytics</div>
            <div style={{ fontSize: "2.5rem", fontWeight: 800, color: "var(--text-primary)" }}>
              {insightsLoading ? "..." : (insights ? `${insights.stats.total_hours}h` : "0h")} <span style={{fontSize: "1rem", color: "var(--text-secondary)"}}>14m</span>
            </div>
            
            {/* Progress Bar */}
            <div style={{ display: "flex", width: "100%", height: "14px", borderRadius: "999px", overflow: "hidden", gap: "2px", marginTop: "0.5rem" }}>
                <div style={{ width: "62%", height: "100%", background: "#ea580c" }} title="Deep work 62%"></div>
                <div style={{ width: "12%", height: "100%", background: "#facc15" }} title="Internal Tasks 12%"></div>
                <div style={{ width: "7%", height: "100%", background: "#8b5cf6" }} title="Meetings 7%"></div>
                <div style={{ width: "19%", height: "100%", background: "#94a3b8" }} title="Breaks 19%"></div>
            </div>
            {/* Legend */}
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem", fontWeight: 500 }}>
                <span style={{color: "#ea580c"}}>Deep work 62%</span>
                <span style={{color: "#facc15"}}>Tasks 12%</span>
                <span style={{color: "#8b5cf6"}}>Meets 7%</span>
                <span>Breaks 19%</span>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem" }}>
          {[
            { icon: "🎯", label: "Sessions",     sub: "logged",           val: insights ? `${insights.stats.total_sessions}`      : "—", color: "#ea580c" },
            { icon: "🔥", label: "Streak",       sub: "consecutive days", val: insights ? `${insights.stats.streak_days}d`         : "—", color: "#facc15" },
            { icon: "✅", label: "Tasks Done",   sub: "completed",        val: insights ? `${insights.stats.tasks_completed}`     : "—", color: "#10b981" },
            { icon: "⏳", label: "Pending",      sub: "tasks left",       val: insights ? `${insights.stats.tasks_pending}`       : "—", color: "#6366f1" },
          ].map(s => (
            <div key={s.label} className="glass-panel animate-fade-in"
              style={{ padding: "1.25rem 1rem", textAlign: "center", borderTop: `3px solid ${s.color}`, display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <div style={{ fontSize: "1.4rem", marginBottom: "0.2rem" }}>{s.icon}</div>
              <div style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                {insightsLoading ? "…" : s.val}
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.85rem", marginTop: "0.4rem", color: "var(--text-secondary)" }}>{s.label}</div>
            </div>
          ))}
          </div>
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

        {/* Row 2: Today's AI Schedule & Other widgets */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
            
            {/* AI Smart Schedule Widget */}
            <div className="glass-panel animate-fade-in" style={{ padding: "1.75rem", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
                    🤖 AI Smart Schedule <span className="badge badge-gray" style={{fontSize: "0.65rem"}}>AI OPTIMIZED</span>
                </h3>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Based on your patterns</span>
              </div>
              
              {!schedLoading && schedule?.daily_focus && (
                <p style={{ color: "var(--primary)", fontStyle: "italic", margin: "0 0 1.25rem", fontSize: "0.9rem" }}>
                  🎯 {schedule.daily_focus}
                </p>
              )}

              {schedLoading ? (
                <div style={{ textAlign: "center", padding: "1.5rem 0", flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div>
                      <p style={{ color: "var(--text-secondary)", margin: 0 }}>Gemini is building your schedule...</p>
                      {schedSlowLoad && (
                        <p style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "0.75rem", opacity: 0.7 }}>
                          ⏳ Server is waking up (free tier cold start) — this may take 30–60 seconds...
                        </p>
                      )}
                  </div>
                </div>
              ) : schedule?.schedule ? (
                <div className="custom-scrollbar" style={{ display: "flex", gap: "1rem", overflowX: "auto", paddingBottom: "1rem", marginTop: "1rem" }}>
                  {schedule.schedule.map((item: any, idx: number) => {
                      const colors = ["#ea580c", "#8b5cf6", "#facc15", "#10b981", "#ec4899"];
                      const itemColor = colors[idx % colors.length];
                      return (
                        <div key={idx} style={{ 
                            minWidth: "160px", background: "rgba(255,255,255,0.6)", padding: "1rem",
                            borderRadius: "16px", border: "1px solid rgba(0,0,0,0.05)",
                            position: "relative", display: "flex", flexDirection: "column",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                        }}>
                          <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: itemColor, marginBottom: "8px" }}></div>
                          <div style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: "0.95rem", marginBottom: "4px" }}>
                              {item.time}
                          </div>
                          <p style={{ margin: 0, fontSize: "0.88rem", color: "var(--text-secondary)", lineHeight: 1.3, flex: 1 }}>{item.task}</p>
                          <div style={{ marginTop: "12px", background: "white", padding: "4px 8px", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-primary)", alignSelf: "flex-start", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
                              {item.duration}m
                          </div>
                        </div>
                      )
                  })}
                </div>
              ) : schedule?.error === "RATE_LIMIT" ? (
                <div style={{ padding: "1.5rem", borderLeft: "4px solid #ef4444", background: "rgba(239,68,68,0.05)", borderRadius: "8px" }}>
                  <h4 style={{ margin: "0 0 0.5rem", color: "#ef4444", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>⚠️</span> Free-Tier Rate Limit Reached
                  </h4>
                  <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {schedule?.message || "FocusBot hit its daily API free-tier limit. Please wait a bit and try again!"}
                  </p>
                  <button onClick={loadData} style={{
                    padding: "8px 18px", background: "rgba(239,68,68,0.1)", border: "none", borderRadius: "8px", color: "#ef4444", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem"
                  }}>🔄 Try Again</button>
                </div>
              ) : schedule?.error ? (
                <div style={{ padding: "1.5rem", borderLeft: "4px solid #f59e0b", background: "rgba(245,158,11,0.05)", borderRadius: "8px" }}>
                  <h4 style={{ margin: "0 0 0.5rem", color: "#f59e0b", fontSize: "1.05rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span>⚠️</span> Schedule Unavailable
                  </h4>
                  <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                    {schedule.error}
                  </p>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <button onClick={loadData} style={{
                      padding: "8px 18px", background: "rgba(245,158,11,0.1)", border: "none", borderRadius: "8px", color: "#ea580c", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem"
                    }}>🔄 Retry</button>
                    <button onClick={() => router.push("/log-activity")} style={{
                      padding: "8px 18px", background: "var(--primary)", border: "none", borderRadius: "8px", color: "white", cursor: "pointer", fontWeight: 600, fontSize: "0.85rem"
                    }}>⚡ Log Activity</button>
                  </div>
                </div>
              ) : (
                <p style={{ color: "var(--text-secondary)" }}>Schedule unavailable. Check your profile is complete.</p>
              )}
            </div>

            {/* Right Side Column (Tasks/Time Tracker) */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                
                {/* Tasks Module Mockup */}
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ margin: "0 0 1rem", fontSize: "1.1rem", fontWeight: 700 }}>Today's Tasks</h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "10px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                            <div>
                                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>App Design</div>
                            </div>
                            <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
                                <span className="badge badge-orange">High</span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>4h</span>
                            </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "white", padding: "10px", borderRadius: "12px", boxShadow: "0 2px 6px rgba(0,0,0,0.02)" }}>
                            <div>
                                <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-primary)" }}>Team Meeting</div>
                            </div>
                            <div style={{display: "flex", gap: "8px", alignItems: "center"}}>
                                <span className="badge badge-gray">Mid</span>
                                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 600 }}>30m</span>
                            </div>
                        </div>
                    </div>
                    <button className="modern-btn" style={{ background: "white", color: "var(--text-primary)", border: "1px solid rgba(0,0,0,0.1)", fontSize: "0.9rem", padding: "10px", marginTop: "1rem" }}>
                        Add New Task
                    </button>
                </div>

                {/* Team Tasks Overview (Orange style mockup) */}
                <div className="glass-panel glass-panel-orange" style={{ padding: "1.5rem" }}>
                    <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 700 }}>Goals Overview</h3>
                    <p style={{ fontSize: "0.85rem", opacity: 0.9, marginBottom: "1rem" }}>Your top priorities aligned with AI recommendations.</p>
                    <div style={{ background: "rgba(255,255,255,0.2)", padding: "12px", borderRadius: "10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>Frontend Dev</span>
                        <span style={{ fontSize: "0.8rem", background: "white", color: "#ea580c", padding: "2px 8px", borderRadius: "6px", fontWeight: 700 }}>Active</span>
                    </div>
                </div>

                {/* Time Tracker */}
                <div className="glass-panel" style={{ padding: "1.5rem", display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <div style={{ width: "100%", display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
                        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>Time Tracker</h3>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>Today</span>
                    </div>
                    <div style={{ width: "140px", height: "140px", position: "relative" }}>
                        <CircularProgressbar
                            value={insights ? (insights.stats.total_hours % 8) / 8 * 100 : 75}
                            strokeWidth={8}
                            styles={buildStyles({
                                rotation: 0.25,
                                strokeLinecap: 'round',
                                pathTransitionDuration: 0.5,
                                pathColor: `rgba(251, 146, 60, 1)`,
                                textColor: 'transparent',
                                trailColor: 'rgba(0,0,0,0.05)',
                                backgroundColor: '#fdfcf7',
                            })}
                        />
                        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
                            <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--text-primary)", lineHeight: 1 }}>
                                {insightsLoading ? "..." : (insights ? `0${insights.stats.total_hours % 8}:14` : "06:14")}
                            </div>
                            <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "1px" }}>HOURS</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>

      </main>
    </div>
  );
}
