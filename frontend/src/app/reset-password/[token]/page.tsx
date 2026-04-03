"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<{text: string, type: "success" | "error"} | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (password !== confirmPassword) {
      setMessage({ text: "Passwords do not match.", type: "error" });
      return;
    }

    if (password.length < 6) {
      setMessage({ text: "Password must be at least 6 characters long.", type: "error" });
      return;
    }

    setIsLoading(true);

    if (!process.env.NEXT_PUBLIC_API_URL) {
      setMessage({ text: "API URL is not configured.", type: "error" });
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password.");
      }

      setMessage({ text: "Password has been successfully updated! Redirecting to login...", type: "success" });
      
      setTimeout(() => {
        router.push("/auth");
      }, 3000);

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
        <h2 style={{ textAlign: "center", marginBottom: "1rem" }}>Set New Password</h2>
        <p style={{ textAlign: "center", color: "#ccc", marginBottom: "2rem", fontSize: "0.95rem" }}>
          Please enter your new password below.
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
            type="password" 
            className="modern-input" 
            placeholder="New Password" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            disabled={message?.type === "success"}
          />

          <input 
            type="password" 
            className="modern-input" 
            placeholder="Confirm New Password" 
            value={confirmPassword} 
            onChange={e => setConfirmPassword(e.target.value)} 
            required 
            disabled={message?.type === "success"}
          />

          <button 
             type="submit" 
             className="modern-btn" 
             disabled={isLoading || message?.type === "success"} 
             style={{ marginTop: "1rem", opacity: (isLoading || message?.type === "success") ? 0.7 : 1 }}
          >
            {isLoading ? "Saving..." : "Update Password"}
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
