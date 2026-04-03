"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const PUBLIC_ROUTES = ["/", "/auth", "/onboarding"];

type ExamItem = { id: number; title: string; days_left: number; emoji: string; color: string; urgency: string; type: string };

export default function NavWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const showNav = !PUBLIC_ROUTES.includes(pathname);
  const [userName, setUserName] = useState<string>("");
  const [showMenu, setShowMenu] = useState(false);
  const [exams, setExams] = useState<ExamItem[]>([]);

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
        <div className="logo" onClick={() => router.push(showNav ? "/dashboard" : "/")}>
          FocusPath
        </div>

        {/* Right side controls */}
        {showNav && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>

            {/* Sign Out Button */}
            <button
              id="navbar-logout-btn"
              onClick={logout}
              style={{
                padding: "8px 20px",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: "8px",
                color: "var(--text-secondary)",
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
                fontWeight: 600,
                fontSize: "0.88rem",
                letterSpacing: "0.3px",
                transition: "all 0.2s",
              }}
              onMouseEnter={e => {
                const b = e.currentTarget;
                b.style.background = "rgba(239,68,68,0.15)";
                b.style.borderColor = "rgba(239,68,68,0.35)";
                b.style.color = "#ef4444";
              }}
              onMouseLeave={e => {
                const b = e.currentTarget;
                b.style.background = "rgba(255,255,255,0.05)";
                b.style.borderColor = "rgba(255,255,255,0.12)";
                b.style.color = "var(--text-secondary)";
              }}
            >
              Sign Out
            </button>

            {/* Profile Avatar — right of Sign Out */}
            <div style={{ position: "relative" }}>
              <div
                id="navbar-profile-avatar"
                onClick={e => { e.stopPropagation(); setShowMenu(v => !v); }}
                title={userName || "Profile"}
                style={{
                  width: "40px", height: "40px", borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, fontSize: "0.95rem", color: "white",
                  cursor: "pointer", userSelect: "none",
                  border: "2px solid rgba(255,255,255,0.12)",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  boxShadow: showMenu ? "0 0 0 3px rgba(139,92,246,0.4)" : "none",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(1.08)";
                  (e.currentTarget as HTMLDivElement).style.boxShadow = "0 0 0 3px rgba(139,92,246,0.4)";
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLDivElement).style.transform = "scale(1)";
                  if (!showMenu) (e.currentTarget as HTMLDivElement).style.boxShadow = "none";
                }}
              >
                {initials}
              </div>

              {/* Dropdown Menu */}
              {showMenu && (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: "absolute", top: "calc(100% + 10px)", right: 0,
                    minWidth: "200px", zIndex: 500,
                    background: "rgba(15,23,42,0.97)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "12px",
                    boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
                    backdropFilter: "blur(16px)",
                    overflow: "hidden",
                  }}
                >
                  {/* User name header */}
                  <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div style={{ width: "36px", height: "36px", borderRadius: "50%",
                        background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 700, fontSize: "0.85rem", color: "white", flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "white" }}>
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
                        fontFamily: "Outfit, sans-serif", fontSize: "0.9rem",
                        color: "var(--text-secondary)", display: "flex", gap: "0.75rem", alignItems: "center",
                        transition: "background 0.15s, color 0.15s", borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "rgba(139,92,246,0.12)";
                        (e.currentTarget as HTMLButtonElement).style.color = "white";
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                        (e.currentTarget as HTMLButtonElement).style.color = "var(--text-secondary)";
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
                      fontFamily: "Outfit, sans-serif", fontSize: "0.9rem",
                      color: "#ef4444", display: "flex", gap: "0.75rem", alignItems: "center",
                      transition: "background 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.1)"}
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
            padding: "0 2rem", height: "42px", overflowX: "auto", overflowY: "hidden",
            background: "rgba(10,16,32,0.85)", backdropFilter: "blur(12px)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            scrollbarWidth: "none", cursor: "pointer", flexShrink: 0,
          }}
          title="Click to manage all countdowns"
        >
          <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(148,163,184,0.5)", letterSpacing: "1px", textTransform: "uppercase", flexShrink: 0 }}>
            ⏳ COUNTDOWN
          </span>
          <div style={{ width: "1px", height: "16px", background: "rgba(255,255,255,0.08)", flexShrink: 0 }} />

          {exams.map(item => {
            const isCritical = item.urgency === "critical";
            return (
              <div key={item.id} style={{
                display: "flex", alignItems: "center", gap: "5px", flexShrink: 0,
                padding: "3px 10px 3px 8px", borderRadius: "999px",
                background: isCritical ? "rgba(239,68,68,0.12)" : `${item.color}12`,
                border: `1px solid ${isCritical ? "rgba(239,68,68,0.35)" : item.color + "35"}`,
                animation: isCritical ? "stripPulse 2s ease-in-out infinite" : "none",
              }}>
                <span style={{ fontSize: "0.85rem" }}>{item.emoji}</span>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: isCritical ? "#ef4444" : item.color, whiteSpace: "nowrap" }}>
                  {item.title}
                </span>
                <span style={{
                  fontSize: "0.7rem", fontWeight: 800, marginLeft: "2px",
                  color: isCritical ? "#ef4444" : "white",
                  background: isCritical ? "rgba(239,68,68,0.2)" : `${item.color}25`,
                  padding: "1px 6px", borderRadius: "999px",
                }}>
                  {item.days_left === 0 ? "TODAY" : `${item.days_left}d`}
                </span>
              </div>
            );
          })}

          <div style={{ marginLeft: "auto", flexShrink: 0, fontSize: "0.72rem", color: "rgba(148,163,184,0.35)", paddingLeft: "0.5rem" }}>
            + Manage →
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
