"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function AuthComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState<{text: string, type: "success" | "error"} | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);

  useEffect(() => {
    const verified = searchParams.get("verified");
    const errObj = searchParams.get("error");
    
    if (verified === "true") {
      setIsLogin(true);
      setMessage({ text: "Account successfully verified. You can now log in.", type: "success" });
    } else if (errObj) {
      if (errObj === "invalid_token") setMessage({ text: "Invalid or expired verification link.", type: "error" });
      if (errObj === "expired_token") setMessage({ text: "Verification link has expired. Please request a new one.", type: "error" });
      if (errObj === "server_error") setMessage({ text: "An error occurred during verification. Please try again.", type: "error" });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setNeedsVerification(false);

    const endpoint = isLogin ? "/auth/login" : "/auth/signup";
    const payload = isLogin
      ? { email, password }
      : { email, password, name };

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) {
      setMessage({ text: "App is misconfigured: API URL is not set. Please contact support.", type: "error" });
      return;
    }
    const url = `${baseUrl.replace(/\/$/, "")}${endpoint}`;
    console.log("[Auth] Calling API:", url);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        if (data.error && data.error.includes("verify your email address")) {
          setNeedsVerification(true);
        }
        throw new Error(data.error || "Authentication failed");
      }

      if (isLogin && data.token) {
        localStorage.setItem("token", data.token);
        if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
        router.push("/dashboard");
      } else if (!isLogin) {
        // Hardcoded message — never render raw server response to prevent accidental link exposure
        setMessage({ text: "Account created! Please check your email to verify your account.", type: "success" });
        setIsLogin(true);
      }
    } catch (err: unknown) {
      console.error("[Auth] API error:", err);
      // TypeError covers all network-level failures (no connection, DNS failure, etc.)
      // regardless of the exact message text which differs between Chrome/Firefox/Safari
      if (err instanceof TypeError) {
        setMessage({ text: "Cannot connect to the server. Please try again later.", type: "error" });
      } else {
        setMessage({ text: (err as Error).message || "An unexpected error occurred.", type: "error" });
      }
    }
  };

  const handleResend = async () => {
    if (!email) {
      setMessage({ text: "Please enter your email address to resend verification.", type: "error" });
      return;
    }
    
    setMessage(null);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ text: "A fresh verification link has been sent to your email.", type: "success" });
        setNeedsVerification(false);
      } else {
        setMessage({ text: data.error || "Failed to resend verification link.", type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Network error while resending. Please try again.", type: "error" });
    }
  };

  return (
    <div className="glass-panel animate-fade-in" style={{ width: "100%", maxWidth: "450px" }}>
      <h2 style={{ textAlign: "center", marginBottom: "2rem" }}>{isLogin ? "Welcome Back" : "Create Account"}</h2>
      
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
          {needsVerification && (
            <div style={{ marginTop: "10px" }}>
              <button 
                onClick={handleResend}
                style={{
                  background: "transparent", border: "1px solid var(--primary)", 
                  color: "var(--primary)", padding: "5px 15px", borderRadius: "5px",
                  cursor: "pointer", fontSize: "0.85rem"
                }}
              >
                Resend Verification Email
              </button>
            </div>
          )}
        </div>
      )}

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
        
        {isLogin && (
          <div style={{ textAlign: "right", marginTop: "10px" }}>
            <Link href="/forgot-password" style={{ color: "var(--primary)", fontSize: "0.85rem", textDecoration: "none" }}>
              Forgot Password?
            </Link>
          </div>
        )}
      </form>

      <p style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.95rem" }}>
        {isLogin ? "New to Drishti?" : "Already have an account?"}{" "}
        <span 
          style={{ color: "var(--primary)", cursor: "pointer", fontWeight: "600", textDecoration: "underline" }}
          onClick={() => { setIsLogin(!isLogin); setMessage(null); setNeedsVerification(false); }}
        >
          {isLogin ? "Create an account" : "Log in here"}
        </span>
      </p>
    </div>
  );
}

export default function AuthPage() {
  return (
    <main style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, padding: "2rem", marginTop: "4rem" }}>
      <Suspense fallback={<div style={{ textAlign: 'center' }}>Loading authentication...</div>}>
         <AuthComponent />
      </Suspense>
    </main>
  );
}
