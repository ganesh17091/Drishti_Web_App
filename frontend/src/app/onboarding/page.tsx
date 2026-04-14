"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Onboarding() {
  const router = useRouter();
  const [age, setAge] = useState(20);
  const [role, setRole] = useState("");
  const [goals, setGoals] = useState("");
  const [interests, setInterests] = useState("");
  const [hours, setHours] = useState(4);
  const [collegeTiming, setCollegeTiming] = useState("");
  const [sleepSchedule, setSleepSchedule] = useState("");
  const [weakSubjects, setWeakSubjects] = useState("");
  const [loading, setLoading] = useState(false);

  const submitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/auth");
      return;
    }

    const API = process.env.NEXT_PUBLIC_API_URL;
    console.log("[Onboarding] Calling API:", `${API}/ai/onboarding`);

    try {
      const res = await fetch(`${API}/ai/onboarding`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          age,
          current_role: role,
          goals,
          interests,
          daily_available_hours: hours,
          college_timing: collegeTiming,
          sleep_schedule: sleepSchedule,
          weak_subjects: weakSubjects,
        }),
      });

      if (res.ok) {
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("[Onboarding] API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main style={{ padding: "4rem 2rem", maxWidth: "600px", margin: "0 auto" }}>
      <div className="glass-panel animate-fade-in">
        <h2>Complete Your Profile</h2>
        <p>Give Gemini some context to generate your perfect career map.</p>

        <form onSubmit={submitProfile} style={{ marginTop: "2rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem" }}>Age</label>
          <input type="number" className="modern-input" value={age} onChange={e => setAge(Number(e.target.value))} required />

          <label style={{ display: "block", marginBottom: "0.5rem" }}>Current Role / Major</label>
          <input type="text" className="modern-input" placeholder="e.g. Computer Science Student" value={role} onChange={e => setRole(e.target.value)} required />

          <label style={{ display: "block", marginBottom: "0.5rem" }}>Career Goals</label>
          <input type="text" className="modern-input" placeholder="e.g. Become a Machine Learning Engineer" value={goals} onChange={e => setGoals(e.target.value)} required />

          <label style={{ display: "block", marginBottom: "0.5rem" }}>Interests</label>
          <input type="text" className="modern-input" placeholder="e.g. Python, AI, Neural Networks" value={interests} onChange={e => setInterests(e.target.value)} required />

          <label style={{ display: "block", marginBottom: "0.5rem" }}>Daily Available Free Hours</label>
          <input type="number" className="modern-input" min="1" max="24" value={hours} onChange={e => setHours(Number(e.target.value))} required />

          <label style={{ display: "block", marginBottom: "0.5rem" }}>College / Work Timings</label>
          <input type="text" className="modern-input" placeholder="e.g. 9 AM to 4 PM" value={collegeTiming} onChange={e => setCollegeTiming(e.target.value)} required />

          <label style={{ display: "block", marginBottom: "0.5rem" }}>Sleep Schedule</label>
          <input type="text" className="modern-input" placeholder="e.g. 11 PM to 7 AM" value={sleepSchedule} onChange={e => setSleepSchedule(e.target.value)} required />

          <label style={{ display: "block", marginBottom: "0.5rem" }}>Weak Subjects / Challenges</label>
          <input type="text" className="modern-input" placeholder="e.g. Mathematics, Procrastination" value={weakSubjects} onChange={e => setWeakSubjects(e.target.value)} required />

          <button type="submit" className="modern-btn" disabled={loading}>
            {loading ? "Syncing..." : "Finalize Profile"}
          </button>
        </form>
      </div>
    </main>
  );
}
