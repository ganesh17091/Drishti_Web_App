"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Plan = {
  id: number;
  task: string;
  deadline: string;
  allocated_hours: number;
  status: string;
};

export default function StudyPlans() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState("");
  const [deadline, setDeadline] = useState("");
  const [hours, setHours] = useState(1);
  const [adding, setAdding] = useState(false);

  const token = () => localStorage.getItem("token");
  const API = process.env.NEXT_PUBLIC_API_URL;

  const fetchPlans = async () => {
    try {
      console.log("[Study] Calling API:", `${API}/study/plans`);
      const res = await fetch(`${API}/study/plans`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      if (res.status === 401) { router.push("/auth"); return; }
      const data = await res.json();
      setPlans(data);
      setLoading(false);
    } catch (err) {
      console.error("[Study] fetchPlans error:", err);
      setLoading(false);
    }
  };

  useEffect(() => { fetchPlans(); }, []);

  const addPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    try {
      console.log("[Study] Calling API:", `${API}/study/plans`);
      await fetch(`${API}/study/plans`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ task, deadline, allocated_hours: hours }),
      });
    } catch (err) {
      console.error("[Study] addPlan error:", err);
    }
    setTask(""); setDeadline(""); setHours(1);
    await fetchPlans();
    setAdding(false);
  };

  const completePlan = async (id: number) => {
    try {
      console.log("[Study] Calling API:", `${API}/study/plans/${id}/complete`);
      await fetch(`${API}/study/plans/${id}/complete`, {
        method: "POST", headers: { Authorization: `Bearer ${token()}` },
      });
    } catch (err) {
      console.error("[Study] completePlan error:", err);
    }
    fetchPlans();
  };

  const deletePlan = async (id: number) => {
    try {
      console.log("[Study] Calling API:", `${API}/study/plans/${id}`);
      await fetch(`${API}/study/plans/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token()}` },
      });
    } catch (err) {
      console.error("[Study] deletePlan error:", err);
    }
    fetchPlans();
  };

  const pending = plans.filter(p => p.status === "pending");
  const completed = plans.filter(p => p.status === "completed");

  return (
    <main style={{ padding: "3rem 2rem", maxWidth: "900px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>📚 Study Planner</h1>
        <button onClick={() => router.push("/dashboard")} className="modern-btn secondary-btn"
          style={{ width: "auto", padding: "10px 20px", marginTop: 0 }}>← Dashboard</button>
      </div>

      {/* Add Plan Form */}
      <div className="glass-panel animate-fade-in" style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1.5rem" }}>Add New Task</h2>
        <form onSubmit={addPlan}>
          <input className="modern-input" placeholder="Task description..." value={task}
            onChange={e => setTask(e.target.value)} required />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Deadline</label>
              <input type="date" className="modern-input" value={deadline}
                onChange={e => setDeadline(e.target.value)} required />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Allocated Hours</label>
              <input type="number" className="modern-input" min="0.5" step="0.5" value={hours}
                onChange={e => setHours(Number(e.target.value))} required />
            </div>
          </div>
          <button type="submit" className="modern-btn" disabled={adding}
            style={{ marginTop: "0.5rem" }}>{adding ? "Adding..." : "Add Task"}</button>
        </form>
      </div>

      {/* Progress Bar */}
      {plans.length > 0 && (
        <div className="glass-panel animate-fade-in" style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.75rem" }}>
            <span>Progress</span>
            <span style={{ color: "var(--primary)", fontWeight: 600 }}>{completed.length}/{plans.length} tasks</span>
          </div>
          <div style={{ background: "rgba(0,0,0,0.4)", borderRadius: "999px", height: "8px" }}>
            <div style={{ width: `${plans.length > 0 ? (completed.length / plans.length) * 100 : 0}%`,
              background: "linear-gradient(90deg, var(--primary), var(--secondary))",
              height: "100%", borderRadius: "999px", transition: "width 0.5s ease" }} />
          </div>
        </div>
      )}

      {/* Pending Tasks */}
      <div className="glass-panel animate-fade-in" style={{ marginBottom: "2rem" }}>
        <h2 style={{ marginBottom: "1.5rem" }}>⏳ Pending ({pending.length})</h2>
        {loading ? <p>Loading...</p> : pending.length === 0 ? (
          <p style={{ color: "var(--text-secondary)" }}>No pending tasks. Great work! 🎉</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {pending.map(p => (
              <div key={p.id} style={{ background: "rgba(0,0,0,0.3)", padding: "1.25rem",
                borderRadius: "12px", borderLeft: "4px solid var(--primary)",
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, marginBottom: "0.25rem" }}>{p.task}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    📅 {new Date(p.deadline).toLocaleDateString()} · ⏱ {p.allocated_hours}h
                  </div>
                </div>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button onClick={() => completePlan(p.id)}
                    style={{ padding: "8px 14px", background: "rgba(16,185,129,0.2)", border: "1px solid #10b981",
                      borderRadius: "8px", color: "#10b981", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>
                    ✓ Done
                  </button>
                  <button onClick={() => deletePlan(p.id)}
                    style={{ padding: "8px 14px", background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444",
                      borderRadius: "8px", color: "#ef4444", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Completed Tasks */}
      {completed.length > 0 && (
        <div className="glass-panel animate-fade-in">
          <h2 style={{ marginBottom: "1.5rem" }}>✅ Completed ({completed.length})</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {completed.map(p => (
              <div key={p.id} style={{ background: "rgba(0,0,0,0.2)", padding: "1rem",
                borderRadius: "12px", borderLeft: "4px solid #10b981", opacity: 0.7,
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, textDecoration: "line-through" }}>{p.task}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                    {p.allocated_hours}h allocated
                  </div>
                </div>
                <button onClick={() => deletePlan(p.id)}
                  style={{ padding: "6px 12px", background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444",
                    borderRadius: "8px", color: "#ef4444", cursor: "pointer", fontFamily: "Outfit, sans-serif" }}>
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
