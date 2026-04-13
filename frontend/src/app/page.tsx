"use client";
import { useRouter } from "next/navigation";

const STATS = [
  { icon: "⏱️", label: "Total Hours",  sub: "all time",         color: "#8b5cf6" },
  { icon: "🎯", label: "Sessions",     sub: "logged",           color: "#ec4899" },
  { icon: "🔥", label: "Day Streak",   sub: "consecutive days", color: "#f59e0b" },
  { icon: "✅", label: "Tasks Done",   sub: "completed",        color: "#10b981" },
  { icon: "⏳", label: "Pending",      sub: "tasks left",       color: "#6366f1" },
];

const FEATURES = [
  { icon: "🤖", title: "AI Daily Schedule",   desc: "Gemini builds your perfect study schedule every morning based on your goals." },
  { icon: "📚", title: "Study Planner",        desc: "Track tasks with deadlines, mark them done, and watch your progress grow." },
  { icon: "🧭", title: "Career Roadmap",       desc: "Personalized step-by-step guidance from where you are to where you want to be." },
  { icon: "🔗", title: "Curated Resources",    desc: "AI-picked books, YouTube videos, Shorts, and courses for your exact career goal." },
];

export default function Home() {
  const router = useRouter();

  return (
    <main style={{ maxWidth: "1000px", margin: "0 auto", padding: "4rem 2rem", display: "flex", flexDirection: "column", gap: "3rem", alignItems: "center" }}>

      {/* Hero */}
      <div className="glass-panel animate-fade-in" style={{ textAlign: "center", padding: "3.5rem 3rem", width: "100%" }}>
        <div style={{ display: "inline-block", padding: "6px 18px", borderRadius: "999px", marginBottom: "1.5rem",
          background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.3)",
          fontSize: "0.85rem", color: "var(--primary)", fontWeight: 600, letterSpacing: "1px" }}>
          POWERED BY GOOGLE GEMINI 2.5
        </div>
        <h1 style={{ background: "linear-gradient(135deg, var(--primary), var(--secondary))",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          fontSize: "3.2rem", lineHeight: 1.15, marginBottom: "1.25rem" }}>
          Welcome to Drishti
        </h1>
        <p style={{ fontSize: "1.15rem", maxWidth: "580px", margin: "0 auto 2.5rem", lineHeight: 1.7 }}>
          Your AI-powered career co-pilot. Get personalized daily schedules, curated resources, and an intelligent roadmap — all built around your unique goals.
        </p>
        <button
          className="modern-btn"
          style={{ maxWidth: "220px", fontSize: "1.1rem", padding: "0.9rem 2rem" }}
          onClick={() => router.push("/auth")}
        >
          Launch Portal →
        </button>
      </div>

      {/* Mini Stats Strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "0.85rem", width: "100%" }}>
        {STATS.map(s => (
          <div key={s.label} className="glass-panel animate-fade-in"
            style={{ padding: "1rem 0.75rem", textAlign: "center", borderTop: `2px solid ${s.color}20` }}>
            <div style={{ fontSize: "1.4rem", marginBottom: "0.35rem" }}>{s.icon}</div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: s.color, lineHeight: 1 }}>—</div>
            <div style={{ fontWeight: 600, fontSize: "0.82rem", marginTop: "0.3rem" }}>{s.label}</div>
            <div style={{ color: "var(--text-secondary)", fontSize: "0.72rem" }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Feature Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1.25rem", width: "100%" }}>
        {FEATURES.map(f => (
          <div key={f.title} className="glass-panel animate-fade-in"
            style={{ padding: "1.5rem", display: "flex", gap: "1rem", alignItems: "flex-start" }}>
            <span style={{ fontSize: "1.8rem", flexShrink: 0 }}>{f.icon}</span>
            <div>
              <div style={{ fontWeight: 700, marginBottom: "0.35rem" }}>{f.title}</div>
              <p style={{ margin: 0, fontSize: "0.88rem", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA Bottom */}
      <p style={{ textAlign: "center", fontSize: "0.9rem" }}>
        Already have an account?{" "}
        <span onClick={() => router.push("/auth")}
          style={{ color: "var(--primary)", cursor: "pointer", fontWeight: 600, textDecoration: "underline" }}>
          Sign in here
        </span>
      </p>

    </main>
  );
}
