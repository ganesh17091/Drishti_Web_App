"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type ExamGoal = {
  id: number; title: string; target_date: string;
  type: "exam" | "goal"; description: string;
  emoji: string; color: string; days_left: number; urgency: string;
};

const EMOJI_OPTIONS = ["📝","🎓","🏆","🎯","📚","💻","🧪","🔬","📐","🏅","⚡","🚀","🌟","💡","🎵","🏋️"];
const COLOR_OPTIONS = [
  "#8b5cf6","#ec4899","#f59e0b","#10b981","#6366f1",
  "#ef4444","#06b6d4","#f97316","#84cc16","#e879f9",
];

function urgencyStyle(urgency: string, color: string) {
  if (urgency === "critical") return { border: "1.5px solid #ef4444", boxShadow: "0 0 20px rgba(239,68,68,0.2)" };
  if (urgency === "soon")     return { border: `1.5px solid ${color}`, boxShadow: `0 0 16px ${color}25` };
  return { border: "1px solid rgba(255,255,255,0.08)" };
}

function DaysRing({ days, color }: { days: number; color: string }) {
  const capped = Math.max(0, Math.min(365, days));
  const R = 38, circ = 2 * Math.PI * R;
  const pct = days <= 0 ? 1 : Math.min(1, 1 - capped / 365);
  const filled = pct * circ;
  const c = days <= 7 ? "#ef4444" : days <= 30 ? "#f59e0b" : color;

  return (
    <div style={{ position: "relative", width: 96, height: 96, flexShrink: 0 }}>
      <svg width={96} height={96} viewBox="0 0 96 96">
        <circle cx={48} cy={48} r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth={10} />
        <circle cx={48} cy={48} r={R} fill="none" stroke={c} strokeWidth={10}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          strokeDashoffset={circ / 4}
          style={{ filter: `drop-shadow(0 0 6px ${c}80)` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: days > 999 ? "1rem" : "1.4rem", fontWeight: 900, color: c, lineHeight: 1 }}>
          {days <= 0 ? "🎉" : days}
        </span>
        {days > 0 && <span style={{ fontSize: "0.55rem", color: "var(--text-secondary)", marginTop: "1px" }}>days</span>}
      </div>
    </div>
  );
}

export default function ExamsPage() {
  const router = useRouter();
  const [items, setItems] = useState<ExamGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [type, setType] = useState<"exam" | "goal">("exam");
  const [desc, setDesc] = useState("");
  const [emoji, setEmoji] = useState("📝");
  const [color, setColor] = useState("#8b5cf6");
  const [formError, setFormError] = useState("");

  const token = () => localStorage.getItem("token");
  const API = process.env.NEXT_PUBLIC_API_URL;

  useEffect(() => {
    const t = token();
    if (!t) { router.push("/auth"); return; }
    console.log("[Exams] Calling API:", `${API}/exams`);
    fetch(`${API}/exams`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json()).then(d => { if (Array.isArray(d)) setItems(d); })
      .catch(err => console.error("[Exams] fetchExams error:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    if (!title.trim() || !date) { setFormError("Title and date are required."); return; }
    setSubmitting(true);
    const t = token();
    try {
      console.log("[Exams] Calling API:", `${API}/exams`);
      const res = await fetch(`${API}/exams`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ title, target_date: date, type, description: desc, emoji, color }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setItems(prev => [...prev, data].sort((a, b) => a.days_left - b.days_left));
      setTitle(""); setDate(""); setDesc(""); setType("exam"); setEmoji("📝"); setColor("#8b5cf6");
      setShowForm(false);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    const t = token();
    try {
      console.log("[Exams] Calling API:", `${API}/exams/${id}`);
      await fetch(`${API}/exams/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
    } catch (err) {
      console.error("[Exams] deleteExam error:", err);
    }
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const exams = items.filter(i => i.type === "exam");
  const goals = items.filter(i => i.type === "goal");

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem 4rem" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "2.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            ⏳ Exams & Goals
          </h1>
          <p style={{ margin: "0.35rem 0 0" }}>Track countdowns for upcoming exams and short-term goals.</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={() => setShowForm(v => !v)} className="modern-btn"
            style={{ width: "auto", padding: "10px 22px", marginTop: 0, fontSize: "0.95rem" }}>
            {showForm ? "✕ Cancel" : "+ Add New"}
          </button>
          <button onClick={() => router.push("/dashboard")}
            style={{ padding: "10px 18px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", color: "var(--text-secondary)", cursor: "pointer", fontFamily: "Outfit, sans-serif", fontSize: "0.9rem", fontWeight: 600 }}>
            ← Dashboard
          </button>
        </div>
      </div>

      {/* Add Form */}
      {showForm && (
        <div className="glass-panel animate-fade-in" style={{ marginBottom: "2rem", padding: "2rem" }}>
          <h2 style={{ marginBottom: "1.5rem", fontSize: "1.2rem" }}>📌 Add New Countdown</h2>
          <form onSubmit={handleAdd}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>

              {/* Title */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Title *</label>
                <input className="modern-input" style={{ margin: 0 }} value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. JEE Mains, Complete DSA, CAT Exam..." required />
              </div>

              {/* Type */}
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Type</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  {(["exam", "goal"] as const).map(t => (
                    <button key={t} type="button" onClick={() => { setType(t); setEmoji(t === "exam" ? "📝" : "🎯"); }}
                      style={{
                        flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer",
                        fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.9rem",
                        border: type === t ? "1.5px solid var(--primary)" : "1px solid rgba(255,255,255,0.1)",
                        background: type === t ? "rgba(139,92,246,0.15)" : "rgba(255,255,255,0.03)",
                        color: type === t ? "var(--primary)" : "var(--text-secondary)",
                      }}>
                      {t === "exam" ? "📝 Exam" : "🎯 Goal"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Target Date *</label>
                <input type="date" className="modern-input" style={{ margin: 0, colorScheme: "dark" }}
                  value={date} onChange={e => setDate(e.target.value)} required min={new Date().toISOString().split("T")[0]} />
              </div>

              {/* Description */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Description (optional)</label>
                <input className="modern-input" style={{ margin: 0 }} value={desc} onChange={e => setDesc(e.target.value)}
                  placeholder="e.g. Target 300+ marks, Complete all LeetCode mediums..." />
              </div>

              {/* Emoji Picker */}
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Emoji</label>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {EMOJI_OPTIONS.map(e => (
                    <button key={e} type="button" onClick={() => setEmoji(e)}
                      style={{
                        width: "36px", height: "36px", borderRadius: "8px", fontSize: "1.1rem",
                        background: emoji === e ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.04)",
                        border: emoji === e ? "1.5px solid var(--primary)" : "1px solid rgba(255,255,255,0.08)",
                        cursor: "pointer",
                      }}>{e}</button>
                  ))}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>Color</label>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  {COLOR_OPTIONS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      style={{
                        width: "30px", height: "30px", borderRadius: "50%", background: c, cursor: "pointer",
                        border: color === c ? "3px solid white" : "2px solid transparent",
                        boxShadow: color === c ? `0 0 10px ${c}` : "none",
                        transition: "all 0.15s",
                      }} />
                  ))}
                </div>
              </div>
            </div>

            {formError && <p style={{ color: "#ef4444", fontSize: "0.88rem", margin: "1rem 0 0" }}>{formError}</p>}

            <button type="submit" className="modern-btn" disabled={submitting}
              style={{ marginTop: "1.5rem", maxWidth: "200px" }}>
              {submitting ? "Adding..." : "Add Countdown"}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--text-secondary)" }}>Loading your countdowns...</div>
      ) : items.length === 0 ? (
        <div className="glass-panel animate-fade-in" style={{ textAlign: "center", padding: "4rem 2rem" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⏳</div>
          <h2>No countdowns yet</h2>
          <p style={{ maxWidth: "400px", margin: "0 auto 2rem" }}>Add your upcoming exams and goals to see live countdowns here and across the app.</p>
          <button onClick={() => setShowForm(true)} className="modern-btn" style={{ maxWidth: "200px" }}>+ Add First Countdown</button>
        </div>
      ) : (
        <>
          {/* Exams Section */}
          {exams.length > 0 && (
            <section style={{ marginBottom: "2.5rem" }}>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                📝 Upcoming Exams
                <span style={{ fontSize: "0.75rem", background: "rgba(239,68,68,0.15)", color: "#ef4444", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
                  {exams.length}
                </span>
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: "1.25rem" }}>
                {exams.map(item => <CountdownCard key={item.id} item={item} onDelete={handleDelete} />)}
              </div>
            </section>
          )}

          {/* Goals Section */}
          {goals.length > 0 && (
            <section>
              <h2 style={{ fontSize: "1.1rem", marginBottom: "1.25rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                🎯 Short-Term Goals
                <span style={{ fontSize: "0.75rem", background: "rgba(139,92,246,0.15)", color: "var(--primary)", padding: "2px 8px", borderRadius: "999px", fontWeight: 600 }}>
                  {goals.length}
                </span>
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: "1.25rem" }}>
                {goals.map(item => <CountdownCard key={item.id} item={item} onDelete={handleDelete} />)}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

function CountdownCard({ item, onDelete }: { item: ExamGoal; onDelete: (id: number) => void }) {
  const isPast   = item.days_left < 0;
  const isToday  = item.days_left === 0;
  const urgStyle = urgencyStyle(item.urgency, item.color);

  return (
    <div className="glass-panel animate-fade-in"
      style={{ padding: "1.5rem", display: "flex", gap: "1.25rem", alignItems: "center", ...urgStyle, position: "relative", overflow: "hidden" }}>

      {/* Urgency pulse for critical */}
      {item.urgency === "critical" && !isPast && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #ef4444, #f97316)", animation: "pulse 2s ease-in-out infinite" }} />
      )}

      <DaysRing days={item.days_left} color={item.color} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.4rem" }}>
          <span style={{ fontSize: "1.3rem" }}>{item.emoji}</span>
          <span style={{ fontWeight: 800, fontSize: "1rem", lineHeight: 1.3 }}>{item.title}</span>
        </div>

        <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
          {isPast ? "✅ Past" : isToday ? "🔥 TODAY!" : new Date(item.target_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </div>

        {item.description && (
          <p style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", lineHeight: 1.5, color: "var(--text-secondary)" }}>{item.description}</p>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{
            fontSize: "0.72rem", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
            background: item.urgency === "critical" ? "rgba(239,68,68,0.15)" : `${item.color}18`,
            color: item.urgency === "critical" ? "#ef4444" : item.color,
          }}>
            {isPast ? "Completed" : isToday ? "Today!" : item.urgency === "critical" ? "🚨 Critical" : item.urgency === "soon" ? "⚡ Coming Soon" : "Upcoming"}
          </span>
          <button onClick={() => onDelete(item.id)}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(148,163,184,0.4)", fontSize: "1.1rem", lineHeight: 1, padding: "0 2px", transition: "color 0.2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "#ef4444")}
            onMouseLeave={e => (e.currentTarget.style.color = "rgba(148,163,184,0.4)")}>
            🗑
          </button>
        </div>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  );
}
