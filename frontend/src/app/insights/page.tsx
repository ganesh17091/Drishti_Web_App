"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from "recharts";

type InsightData = {
  stats: {
    total_hours: number;
    total_sessions: number;
    streak_days: number;
    tasks_completed: number;
    tasks_pending: number;
  };
  daily_chart: { day: string; date: string; hours: number; minutes: number }[];
  activity_pie: { name: string; value: number }[];
  ai_analysis: {
    productivity_level: string;
    strengths: string[];
    weaknesses: string[];
    insights: string;
  };
};

const PIE_COLORS = ["#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#6366f1", "#ef4444"];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div style={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)",
        padding: "10px 14px", borderRadius: "8px" }}>
        <p style={{ margin: 0, fontWeight: 700, color: "var(--primary)" }}>{label}</p>
        <p style={{ margin: 0, color: "white" }}>{payload[0].value}h studied</p>
      </div>
    );
  }
  return null;
};

const StatCard = ({ icon, label, value, color, sub }: any) => (
  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
    <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>{icon}</div>
    <div style={{ fontSize: "2.2rem", fontWeight: 800, color }}>{value}</div>
    <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{label}</div>
    {sub && <div style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>{sub}</div>}
  </div>
);

export default function Insights() {
  const router = useRouter();
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/auth"); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/ai/insights`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Build radar data from strengths vs weaknesses count
  const radarData = data ? [
    { subject: "Strengths", score: (data.ai_analysis?.strengths?.length || 0) * 20 },
    { subject: "Consistency", score: Math.min(100, (data.stats.streak_days || 0) * 15) },
    { subject: "Study Hours", score: Math.min(100, (data.stats.total_hours / 10) * 100) },
    { subject: "Tasks Done", score: Math.min(100, (data.stats.tasks_completed / Math.max(1, data.stats.tasks_completed + data.stats.tasks_pending)) * 100) },
    { subject: "Sessions", score: Math.min(100, data.stats.total_sessions * 10) },
  ] : [];

  return (
    <main style={{ padding: "3rem 2rem", maxWidth: "1100px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2.5rem" }}>
        <div>
          <h1>📊 Performance Insights</h1>
          <p>Your progress analytics powered by real data + Gemini AI analysis</p>
        </div>
        <button onClick={() => router.push("/dashboard")} className="modern-btn secondary-btn"
          style={{ width: "auto", padding: "10px 20px", marginTop: 0 }}>← Dashboard</button>
      </div>

      {loading ? (
        <div className="glass-panel animate-fade-in" style={{ textAlign: "center", padding: "5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧠</div>
          <p style={{ fontSize: "1.1rem" }}>Analyzing your performance data...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ color: "#ef4444", textAlign: "center", padding: "3rem" }}>
          {error === "Profile not found. Complete onboarding first." ? (
            <>
              <p>{error}</p>
              <button onClick={() => router.push("/onboarding")} className="modern-btn" style={{ marginTop: "1rem", width: "auto", padding: "10px 24px" }}>
                Complete Onboarding →
              </button>
            </>
          ) : error}
        </div>
      ) : data ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* Stats Row */}
          <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1rem" }}>
            <StatCard icon="⏱️" label="Total Hours" value={data.stats.total_hours} color="var(--primary)" sub="all time" />
            <StatCard icon="🎯" label="Sessions" value={data.stats.total_sessions} color="var(--secondary)" sub="logged" />
            <StatCard icon="🔥" label="Day Streak" value={data.stats.streak_days} color="#f59e0b" sub="consecutive days" />
            <StatCard icon="✅" label="Tasks Done" value={data.stats.tasks_completed} color="#10b981" sub="completed" />
            <StatCard icon="⏳" label="Pending" value={data.stats.tasks_pending} color="#6366f1" sub="tasks left" />
          </div>

          {/* Bar Chart + Radar */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1.5rem" }}>
            {/* Daily Bar Chart */}
            <div className="glass-panel animate-fade-in">
              <h2 style={{ marginBottom: "1.5rem" }}>📅 Study Hours — Last 7 Days</h2>
              {data.daily_chart.every(d => d.hours === 0) ? (
                <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                  No activity logged yet. Start logging your sessions!
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.daily_chart} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="day" stroke="#94a3b8" fontSize={13} />
                    <YAxis stroke="#94a3b8" fontSize={12} unit="h" />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="hours" fill="url(#barGrad)" radius={[6, 6, 0, 0]} />
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#ec4899" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Radar Chart */}
            <div className="glass-panel animate-fade-in">
              <h2 style={{ marginBottom: "1rem" }}>🕸️ Performance Radar</h2>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="rgba(255,255,255,0.1)" />
                  <PolarAngleAxis dataKey="subject" stroke="#94a3b8" fontSize={11} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="transparent" fontSize={9} />
                  <Radar name="Performance" dataKey="score" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart + AI Analysis */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "1.5rem" }}>
            {/* Activity Pie */}
            <div className="glass-panel animate-fade-in">
              <h2 style={{ marginBottom: "1rem" }}>🥧 Activity Breakdown</h2>
              {data.activity_pie.length === 0 ? (
                <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                  No activities logged yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={data.activity_pie} dataKey="value" cx="50%" cy="50%"
                      innerRadius={55} outerRadius={90} paddingAngle={3} label={false}>
                      {data.activity_pie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" wrapperStyle={{ fontSize: "0.85rem", color: "#94a3b8" }} />
                    <Tooltip formatter={(v: any) => [`${v}h`, "Hours"]}
                      contentStyle={{ background: "rgba(15,23,42,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* AI Analysis Panel */}
            <div className="glass-panel animate-fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <h2>🧠 Gemini AI Analysis</h2>
                <span style={{ padding: "4px 14px", borderRadius: "999px", fontSize: "0.85rem",
                  background: "rgba(139,92,246,0.2)", color: "var(--primary)", fontWeight: 600 }}>
                  {data.ai_analysis?.productivity_level}
                </span>
              </div>

              <p style={{ marginBottom: "1.5rem", fontSize: "0.95rem", lineHeight: 1.7 }}>
                {data.ai_analysis?.insights}
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                <div style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: "12px", padding: "1rem" }}>
                  <div style={{ fontWeight: 700, color: "#10b981", marginBottom: "0.75rem" }}>💪 Strengths</div>
                  {data.ai_analysis?.strengths?.map((s, i) => (
                    <div key={i} style={{ fontSize: "0.88rem", color: "var(--text-secondary)", padding: "4px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "0.5rem" }}>
                      <span style={{ color: "#10b981" }}>✓</span>{s}
                    </div>
                  ))}
                </div>
                <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "12px", padding: "1rem" }}>
                  <div style={{ fontWeight: 700, color: "#ef4444", marginBottom: "0.75rem" }}>📈 Areas to Improve</div>
                  {data.ai_analysis?.weaknesses?.map((w, i) => (
                    <div key={i} style={{ fontSize: "0.88rem", color: "var(--text-secondary)", padding: "4px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.05)", display: "flex", gap: "0.5rem" }}>
                      <span style={{ color: "#f59e0b" }}>→</span>{w}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : null}
    </main>
  );
}
