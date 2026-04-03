"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const endpoint = isLogin ? "/auth/login" : "/auth/signup";
    const payload = isLogin
      ? { email, password }
      : { email, password, name };

    if (!process.env.NEXT_PUBLIC_API_URL) {
      throw new Error("NEXT_PUBLIC_API_URL is not set");
    }
    const url = `${process.env.NEXT_PUBLIC_API_URL}${endpoint}`;
    console.log("[Auth] Calling API:", url);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      if (isLogin && data.token) {
        localStorage.setItem("token", data.token);
        // Save user info so navbar avatar can display name/initials
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/dashboard");
      } else if (!isLogin) {
        // Show success + verification hint
        const hint = data.verify_hint ? `\n\n🔗 Dev shortcut: ${data.verify_hint}` : "";
        setError(data.message + hint);
        setIsLogin(true);
      }
    } catch (err: unknown) {
      if (err instanceof TypeError && (err as TypeError).message === "Failed to fetch") {
        setError("Cannot connect to the server. Please check your internet connection or try again later.");
      } else {
        setError((err as Error).message || "An unexpected error occurred.");
      }
      console.error("[Auth] API Error:", err);
    }
  };

  return (
    <main style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, padding: "2rem", marginTop: "4rem" }}>
      <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "450px" }}>
        <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>{isLogin ? "Welcome Back" : "Create Account"}</h2>
        
        {error && <div style={{ color: error.includes("Account created") ? "#10b981" : "#ef4444", marginBottom: "1.5rem", textAlign: "center", fontSize: "0.95rem", background: "rgba(0,0,0,0.3)", padding: "10px", borderRadius: "8px" }}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <input 
              type="text" 
              className="modern-input" 
              placeholder="Full Name" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              required 
            />
          )}

          <input 
            type="email" 
            className="modern-input" 
            placeholder="Email Address" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />

          <input 
            type="password" 
            className="modern-input" 
            placeholder="Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />

          <button type="submit" className="modern-btn" style={{ marginTop: "1rem" }}>
            {isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.95rem" }}>
          {isLogin ? "New to FocusPath?" : "Already have an account?"}{" "}
          <span 
            style={{ color: "var(--primary)", cursor: "pointer", fontWeight: "600", textDecoration: "underline" }}
            onClick={() => { setIsLogin(!isLogin); setError(""); }}
          >
            {isLogin ? "Create an account" : "Log in here"}
          </span>
        </p>
      </div>
    </main>
  );
}
