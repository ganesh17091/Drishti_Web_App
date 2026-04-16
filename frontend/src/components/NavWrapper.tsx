"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, Menu, Bell } from "lucide-react";

const PUBLIC_ROUTES = ["/", "/auth", "/onboarding", "/forgot-password", "/reset-password"];

type ExamItem = { id: number; title: string; days_left: number; emoji: string; color: string; urgency: string; type: string };

export default function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  // Use startsWith so dynamic segments like /reset-password/abc123 are also treated as public
  const showNav = !PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith(r + "/"));
  const [userName, setUserName] = useState<string>("");
  const [showMenu, setShowMenu] = useState(false);
  const [exams, setExams] = useState<ExamItem[]>([]);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUserName(JSON.parse(raw)?.name || "");
    } catch {}
  }, [pathname]);

  const API = process.env.NEXT_PUBLIC_API_URL;

  // Fetch exams/goals for persistent countdown strip
  useEffect(() => {
    if (!showNav) { setExams([]); return; }
    const token = localStorage.getItem("token");
    if (!token) return;
    console.log("[NavWrapper] Calling API:", `${API}/exams`);
    fetch(`${API}/exams`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setExams(d.filter((i: ExamItem) => i.days_left >= 0).slice(0, 6)); })
      .catch(() => {});
  }, [pathname, showNav]);

  const initials = userName
    ? userName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "U";

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/");
  };

  return (
    <body onClick={() => setShowMenu(false)}>
      <nav className="navbar">
        {/* Logo — left */}
        <button 
          className="logo" 
          onClick={() => router.push(showNav ? "/dashboard" : "/")} 
          aria-label="Navigate to Home"
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", background: "none", border: "none", padding: 0 }}
        >
          {!imgError ? (
            <img 
              src="/logo.png" 
              alt="FocusPath Logo" 
              style={{ height: "40px", objectFit: "contain" }} 
              onError={() => setImgError(true)} 
            />
          ) : (
            <div style={{ width: "32px", height: "32px", borderRadius: "8px", background: "linear-gradient(135deg, var(--primary), var(--secondary))", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
          )}
          <span style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--text-primary)", fontFamily: "Outfit, sans-serif" }}>FocusPath</span>
        </button>
        
        {/* Search Bar - Center */}
        {showNav && (
          <div style={{ flex: 1, maxWidth: "400px", margin: "0 2rem", position: "relative" }}>
             <Search size={18} style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
             <input type="text" placeholder="Search..." style={{
                 width: "100%", padding: "10px 16px 10px 42px",
                 background: "white", border: "none", borderRadius: "999px",
                 boxShadow: "0 2px 10px rgba(0,0,0,0.03)", fontFamily: "Outfit, sans-serif", outline: "none"
             }} />
          </div>
        )}

        {/* Right side controls */}
        {showNav && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>

            <div style={{
                width: "40px", height: "40px", background: "white", borderRadius: "50%",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 2px 10px rgba(0,0,0,0.03)", cursor: "pointer", color: "var(--text-secondary)"
            }}>
                <Bell size={20} />
            </div>

            {/* Profile Menu Button */}
            <div style={{ position: "relative" }}>
              <button
                id="navbar-profile-btn"
                onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
                style={{
                  display: "flex", alignItems: "center", gap: "8px",
                  padding: "4px 12px 4px 4px", background: "var(--primary)", borderRadius: "999px",
                  border: "none", cursor: "pointer", color: "white", fontFamily: "Outfit", fontWeight: 600,
                  transition: "all 0.2s", boxShadow: "0 4px 12px rgba(251,146,60,0.3)"
                }}
              >
                  <div style={{
                      width: "32px", height: "32px", borderRadius: "50%", background: "white", color: "var(--primary)",
                      display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.8rem", fontWeight: 700
                  }}>
                      {initials}
                  </div>
                  <span>Menu</span>
                  <Menu size={18} />
              </button>

              {/* Dropdown Menu */}
              {showMenu && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: "absolute", top: "calc(100% + 10px)", right: 0,
                    minWidth: "220px", zIndex: 500,
                    background: "rgba(255,255,255,0.98)",
                    border: "1px solid rgba(0,0,0,0.05)",
                    borderRadius: "16px",
                    boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                    backdropFilter: "blur(16px)",
                    overflow: "hidden",
                  }}
                >
                  {/* User name header */}
                  <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(0,0,0,0.05)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%",
                        background: "var(--primary)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: "0.85rem", color: "white", flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--text-primary)" }}>
                          {userName || "User"}
                        </div>
                        <div style={{ fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                          FocusPath Account
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Menu items */}
                  {[
                    { icon: "👤", label: "Edit Profile",         href: "/profile" },
                    { icon: "📊", label: "Performance Insights", href: "/insights" },
                    { icon: "⚙️", label: "Dashboard",            href: "/dashboard" },
                  ].map(item => (
                    <button key={item.href}
                      onClick={() => { router.push(item.href); setShowMenu(false); }}
                      style={{ width: "100%", padding: "0.75rem 1.25rem", background: "transparent",
                        border: "none", textAlign: "left", cursor: "pointer",
                        fontFamily: "Outfit, sans-serif", fontSize: "0.92rem", fontWeight: 500,
                        color: "var(--text-primary)", display: "flex", gap: "0.75rem", alignItems: "center",
                        transition: "background 0.15s, color 0.15s", borderBottom: "1px solid rgba(0,0,0,0.03)" }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(251,146,60,0.08)";
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--primary)";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-primary)";
                      }}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </button>
                  ))}

                  {/* Sign Out in dropdown too */}
                  <button
                    onClick={logout}
                    style={{ width: "100%", padding: "0.75rem 1.25rem", background: "transparent",
                      border: "none", textAlign: "left", cursor: "pointer",
                      fontFamily: "Outfit, sans-serif", fontSize: "0.92rem", fontWeight: 500,
                      color: "#ef4444", display: "flex", gap: "0.75rem", alignItems: "center",
                      transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"}
                    onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "transparent"}>
                    <span>🚪</span>
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* ── Persistent Countdown Strip ─────────────────────────────── */}
      {showNav && exams.length > 0 && (
        <div
          onClick={() => router.push("/exams")}
          style={{
            display: "flex", alignItems: "center", gap: "0.6rem",
            padding: "0 2.5rem", height: "42px", overflowX: "auto", overflowY: "hidden",
            background: "rgba(255,255,255,0.6)", backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(0,0,0,0.05)",
            scrollbarWidth: "none", cursor: "pointer", flexShrink: 0,
          }}
          title="Click to manage all countdowns"
        >
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-secondary)", letterSpacing: "1px", textTransform: "uppercase", flexShrink: 0 }}>
            ⏳ COUNTDOWN
          </span>
          <div style={{ width: "1px", height: "16px", background: "rgba(0,0,0,0.1)", flexShrink: 0 }} />

          {exams.map(item => {
            const isCritical = item.urgency === "critical";
            return (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: "5px", flexShrink: 0,
                padding: "3px 10px 3px 8px", borderRadius: "999px",
                background: isCritical ? "rgba(239,68,68,0.1)" : `rgba(251,146,60,0.1)`,
                border: `1px solid ${isCritical ? "rgba(239,68,68,0.2)" : "rgba(251,146,60,0.2)"}`,
                animation: isCritical ? "stripPulse 2s ease-in-out infinite" : "none",
              }}>
                <span style={{ fontSize: "0.85rem" }}>{item.emoji}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: isCritical ? "#ef4444" : "var(--primary)", whiteSpace: "nowrap" }}>
                  {item.title}
                </span>
                <span style={{
                  fontSize: "0.7rem", fontWeight: 800, marginLeft: "2px",
                  color: isCritical ? "white" : "white",
                  background: isCritical ? "#ef4444" : "var(--primary)",
                  padding: "2px 6px", borderRadius: "999px",
                }}>
                  {item.days_left === 0 ? "TODAY" : `${item.days_left}d`}
                </span>
              </div>
            );
          })}

          <div style={{ marginLeft: "auto", flexShrink: 0, fontSize: "0.72rem", color: "var(--text-secondary)", paddingLeft: "0.5rem", fontWeight: 500 }}>
            + Manage
          </div>

          <style>{`
            @keyframes stripPulse {
              0%,100% { opacity: 1; }
              50% { opacity: 0.6; }
            }
          `}</style>
        </div>
      )}

      {children}
    </body>
  );
}
