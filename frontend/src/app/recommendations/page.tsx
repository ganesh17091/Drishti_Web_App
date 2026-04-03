"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Recommendations() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { router.push("/auth"); return; }

    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"}/ai/recommendations`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); });
  }, []);

  return (
    <main style={{ padding: "3rem 2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>🧭 AI Recommendations</h1>
        <button onClick={() => router.push("/dashboard")} className="modern-btn secondary-btn"
          style={{ width: "auto", padding: "10px 20px", marginTop: 0 }}>← Dashboard</button>
      </div>

      {loading ? (
        <div className="glass-panel animate-fade-in" style={{ textAlign: "center", padding: "4rem" }}>
          🧠 Gemini is curating your personal learning roadmap...
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ color: "#ef4444" }}>{error}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>

          {/* Roadmap Steps */}
          <div className="glass-panel animate-fade-in">
            <h2 style={{ marginBottom: "1.5rem", color: "var(--primary)" }}>🗺️ Career Roadmap</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {data?.roadmap_steps?.map((step: string, i: number) => (
                <div key={i} style={{ display: "flex", gap: "1rem", alignItems: "flex-start",
                  background: "rgba(0,0,0,0.25)", padding: "1rem", borderRadius: "10px" }}>
                  <div style={{ minWidth: "32px", height: "32px", borderRadius: "50%",
                    background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 700, fontSize: "0.9rem" }}>{i + 1}</div>
                  <p style={{ margin: 0, color: "var(--text-primary)", paddingTop: "4px" }}>{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Books */}
          <div className="glass-panel animate-fade-in">
            <h2 style={{ marginBottom: "1.5rem", color: "var(--secondary)" }}>📖 Recommended Books</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
              {data?.books?.map((book: any, i: number) => (
                <div key={i} style={{ background: "rgba(0,0,0,0.3)", padding: "1.25rem", borderRadius: "12px",
                  borderTop: "3px solid var(--secondary)" }}>
                  <div style={{ fontWeight: 700, marginBottom: "0.25rem" }}>{book.title}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginBottom: "0.75rem" }}>
                    by {book.author}
                  </div>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>{book.reason}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Research Papers */}
          <div className="glass-panel animate-fade-in">
            <h2 style={{ marginBottom: "1.5rem" }}>📄 Research Papers</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {data?.research_papers?.map((paper: any, i: number) => (
                <div key={i} style={{ background: "rgba(0,0,0,0.25)", padding: "1rem", borderRadius: "10px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  borderLeft: "3px solid var(--primary)" }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{paper.title}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>{paper.topic}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}
    </main>
  );
}
