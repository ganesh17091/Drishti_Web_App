"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const ACTIVITY_TYPES = ["study", "practice", "reading", "project", "revision", "idle", "other"];

export default function LogActivity() {
  const router = useRouter();
  const [type, setType] = useState("study");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(""); setError("");
    const token = localStorage.getItem("token");
    if (!token) { router.push("/auth"); return; }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/ai/log-activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activity_type: type, description, duration_minutes: duration }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccessMsg("✅ Activity logged! Keep going 🚀");
      setDescription("");
      setDuration(30);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "3rem 2rem", maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>⚡ Log Activity</h1>
        <button onClick={() => router.push("/dashboard")} className="modern-btn secondary-btn"
          style={{ width: "auto", padding: "10px 20px", marginTop: 0 }}>← Dashboard</button>
      </div>

      <div className="glass-panel animate-fade-in">
        <h2 style={{ marginBottom: "0.5rem" }}>What did you work on?</h2>
        <p>Track your study sessions to help Gemini generate smarter schedules.</p>

        {successMsg && (
          <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid #10b981",
            padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", color: "#10b981" }}>
            {successMsg}
          </div>
        )}
        {error && (
          <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444",
            padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", color: "#ef4444" }}>
            {error}
          </div>
        )}

        <form onSubmit={submit} style={{ marginTop: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Activity Type</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.5rem" }}>
            {ACTIVITY_TYPES.map(t => (
              <button key={t} type="button" onClick={() => setType(t)}
                style={{ padding: "8px 18px", borderRadius: "999px", border: "1px solid",
                  borderColor: type === t ? "var(--primary)" : "rgba(255,255,255,0.15)",
                  background: type === t ? "rgba(139,92,246,0.25)" : "rgba(0,0,0,0.2)",
                  color: type === t ? "var(--primary)" : "var(--text-secondary)",
                  cursor: "pointer", fontFamily: "Outfit, sans-serif", fontWeight: 600,
                  textTransform: "capitalize", transition: "all 0.2s" }}>
                {t}
              </button>
            ))}
          </div>

          <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Description</label>
          <input className="modern-input" placeholder={`What exactly did you do for '${type}'?`}
            value={description} onChange={e => setDescription(e.target.value)} required />

          <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
            Duration: <span style={{ color: "var(--primary)", fontWeight: 700 }}>{duration} minutes</span>
          </label>
          <input type="range" min={5} max={300} step={5} value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            style={{ width: "100%", marginBottom: "1.5rem", accentColor: "var(--primary)" }} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem",
            color: "var(--text-secondary)", marginTop: "-1.25rem", marginBottom: "1.5rem" }}>
            <span>5 min</span><span>5 hours</span>
          </div>

          <button type="submit" className="modern-btn" disabled={loading}>
            {loading ? "Saving..." : "Log This Activity"}
          </button>
        </form>
      </div>
    </main>
  );
}
