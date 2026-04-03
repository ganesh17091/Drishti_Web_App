"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfileEdit() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "", college: "", branch: "", age: "",
    current_role: "", goals: "", interests: "", daily_available_hours: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const token = () => localStorage.getItem("token");

  useEffect(() => {
    if (!token()) { router.push("/auth"); return; }
    const API = process.env.NEXT_PUBLIC_API_URL;
    console.log("[Profile] Calling API:", `${API}/profile`);
    fetch(`${API}/profile`, { headers: { Authorization: `Bearer ${token()}` } })
      .then(r => r.json())
      .then(d => {
        setForm({
          name: d.name || "", college: d.college || "", branch: d.branch || "",
          age: d.age?.toString() || "", current_role: d.current_role || "",
          goals: d.goals || "", interests: d.interests || "",
          daily_available_hours: d.daily_available_hours?.toString() || "",
        });
        setLoading(false);
      })
      .catch(err => { console.error("[Profile] GET error:", err); setLoading(false); });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setSuccess(""); setError("");
    try {
      const API = process.env.NEXT_PUBLIC_API_URL;
      console.log("[Profile] Calling API:", `${API}/profile`);
      const res = await fetch(`${API}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token()}` },
        body: JSON.stringify({
          ...form,
          age: form.age ? Number(form.age) : undefined,
          daily_available_hours: form.daily_available_hours ? Number(form.daily_available_hours) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess("Profile updated! Gemini will use your new info next time.");
    } catch (err: unknown) {
      if (err instanceof TypeError && (err as TypeError).message === "Failed to fetch") {
        setError("Cannot connect to the server. Please check your internet connection.");
      } else {
        setError((err as Error).message || "An unexpected error occurred.");
      }
      console.error("[Profile] PUT error:", err);
    } finally {
      setSaving(false);
    }
  };

  const update = (key: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <main style={{ padding: "3rem 2rem", maxWidth: "700px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h1>👤 Edit Profile</h1>
        <button onClick={() => router.push("/dashboard")} className="modern-btn secondary-btn"
          style={{ width: "auto", padding: "10px 20px", marginTop: 0 }}>← Dashboard</button>
      </div>

      {loading ? <div className="glass-panel" style={{ padding: "3rem", textAlign: "center" }}>Loading profile...</div> : (
        <div className="glass-panel animate-fade-in">
          {success && <div style={{ background: "rgba(16,185,129,0.15)", border: "1px solid #10b981",
            padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", color: "#10b981" }}>{success}</div>}
          {error && <div style={{ background: "rgba(239,68,68,0.15)", border: "1px solid #ef4444",
            padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", color: "#ef4444" }}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <h3 style={{ color: "var(--text-secondary)", marginBottom: "1rem", fontSize: "0.85rem",
              textTransform: "uppercase", letterSpacing: "1px" }}>Personal Info</h3>
            <input className="modern-input" placeholder="Full Name" value={form.name} onChange={update("name")} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <input className="modern-input" placeholder="College / University" value={form.college} onChange={update("college")} />
              <input className="modern-input" placeholder="Branch / Major" value={form.branch} onChange={update("branch")} />
            </div>

            <h3 style={{ color: "var(--text-secondary)", margin: "1.5rem 0 1rem", fontSize: "0.85rem",
              textTransform: "uppercase", letterSpacing: "1px" }}>Career & AI Profile</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <input className="modern-input" placeholder="Age" type="number" value={form.age} onChange={update("age")} />
              <input className="modern-input" placeholder="Daily Free Hours" type="number" value={form.daily_available_hours} onChange={update("daily_available_hours")} />
            </div>
            <input className="modern-input" placeholder="Current Role / Status (e.g. CS Student)" value={form.current_role} onChange={update("current_role")} />

            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Career Goals</label>
            <textarea className="modern-input" placeholder="e.g. Become a Machine Learning Engineer at a top company"
              value={form.goals} onChange={update("goals")}
              style={{ resize: "vertical", minHeight: "90px" }} />

            <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>Interests & Skills</label>
            <textarea className="modern-input" placeholder="e.g. Python, Deep Learning, Data Structures, Neural Networks"
              value={form.interests} onChange={update("interests")}
              style={{ resize: "vertical", minHeight: "90px" }} />

            <button type="submit" className="modern-btn" disabled={saving} style={{ marginTop: "1rem" }}>
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
