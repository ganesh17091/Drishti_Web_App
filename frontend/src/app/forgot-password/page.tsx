"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<{text: string, type: "success" | "error"} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    if (!process.env.NEXT_PUBLIC_API_URL) {
      setMessage({ text: "API URL is not configured.", type: "error" });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to process request.");
      }

      setMessage({ text: data.message, type: "success" });
      setEmail("");
    } catch (err: any) {
      if (err.message === "Failed to fetch") {
        setMessage({ text: "Cannot connect to the server. Please try again later.", type: "error" });
      } else {
        setMessage({ text: err.message || "An unexpected error occurred.", type: "error" });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, padding: "2rem", marginTop: "4rem" }}>
      <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "450px" }}>
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Recover Password</h2>
        <p style={{ textAlign: "center", color: "#ccc", marginBottom: "2rem", fontSize: "0.95rem" }}>
          Enter your registered email address and we'll send you a link to reset your password.
        </p>
        
        {message && (
          <div style={{ 
            color: message.type === "success" ? "#10b981" : "#ef4444", 
            marginBottom: "1.5rem", 
            textAlign: "center", 
            fontSize: "0.95rem", 
            background: "rgba(0,0,0,0.3)", 
            padding: "10px", 
            borderRadius: "8px" 
          }}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input 
            type="email" 
            className="modern-input" 
            placeholder="Email Address" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />

          <button type="submit" className="modern-btn" disabled={isLoading} style={{ marginTop: "1rem", opacity: isLoading ? 0.7 : 1 }}>
            {isLoading ? "Sending..." : "Send Reset Link"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <Link href="/auth" style={{ color: "var(--primary)", fontSize: "0.9rem", textDecoration: "none" }}>
            ← Back to Sign In
          </Link>
        </div>
      </div>
    </main>
  );
}
