"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

type Message = { id?: number; role: "user" | "assistant"; message: string; created_at?: string; };
const SUGGESTED_PROMPTS = ["What should I focus on?", "Add task: review notes", "Regenerate resources"];
const ACTION_LABELS: Record<string, string> = {
  update_schedule: "📅 Schedule Updated", add_task: "✅ Task Added",
  modify_goals: "🎯 Goals Updated", regenerate_recommendations: "🔗 Resources Refreshed",
};

export default function ChatWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const token = () => typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const API = process.env.NEXT_PUBLIC_API_URL;

  // Computed before any conditional return — determines if we're on a public page
  const isPublicRoute = pathname === "/" || pathname === "/auth" || pathname === "/onboarding";

  // All hooks must be declared BEFORE any conditional return (Rules of Hooks)
  useEffect(() => {
    if (isPublicRoute || !isOpen) return;
    const t = token();
    if (!t) return;
    setHistoryLoading(true);
    console.log("[ChatWidget] Calling API:", `${API}/chat/history`);
    fetch(`${API}/chat/history`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMessages(data); })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [isOpen, isPublicRoute]);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (!actionToast) return;
    const t = setTimeout(() => setActionToast(null), 3000);
    return () => clearTimeout(t);
  }, [actionToast]);

  // Now safe to early-return after all hooks have been called
  if (isPublicRoute) return null;

  const sendMessage = async (text?: string) => {
    const msgText = (text ?? input).trim();
    if (!msgText || loading) return;
    const t = token();
    if (!t) return;

    setMessages(prev => [...prev, { role: "user", message: msgText }]);
    setInput(""); setLoading(true);

    try {
      console.log("[ChatWidget] Calling API:", `${API}/chat/message`);
      const res = await fetch(`${API}/chat/message`, {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` },
        body: JSON.stringify({ message: msgText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setMessages(prev => [...prev, { role: "assistant", message: data.reply }]);
      if (data.action?.type && !data.action_result?.error) {
        setActionToast(ACTION_LABELS[data.action.type] || "✨ Action Performed");
        // Force a tiny reload delay to let the UI fetch updated data if needed
        if (["update_schedule", "add_task"].includes(data.action.type)) {
            setTimeout(() => window.dispatchEvent(new Event("focuspath:update")), 1000);
        }
      }
    } catch (err: unknown) {
      const msg = (err as Error)?.message || "";
      const isRateLimit = msg.includes("429") || msg.toLowerCase().includes("quota");
      const isFetchFail = err instanceof TypeError && msg === "Failed to fetch";
      setMessages(prev => [...prev, {
        role: "assistant",
        message: isRateLimit
          ? "⚠️ I'm receiving too many requests right now. Please wait a minute and try again."
          : isFetchFail
          ? "⚠️ Cannot reach the server. Check your internet connection."
          : "⚠️ Something went wrong.",
      }]);
      console.error("[ChatWidget] API Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999 }}>
        {!isOpen && (
          <button onClick={() => setIsOpen(true)}
            style={{
              width: "60px", height: "60px", borderRadius: "50%",
              background: "linear-gradient(135deg, var(--primary), var(--secondary))",
              border: "none", color: "white", fontSize: "1.8rem", cursor: "pointer",
              boxShadow: "0 8px 24px rgba(139,92,246,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform 0.2s",
            }}
            onMouseEnter={e => e.currentTarget.style.transform = "scale(1.05)"}
            onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
          >
            🤖
          </button>
        )}

        {isOpen && (
          <div style={{
            width: "360px", height: "550px", maxHeight: "calc(100vh - 40px)",
            background: "rgba(10,16,32,0.95)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "20px", display: "flex", flexDirection: "column",
            boxShadow: "0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(139,92,246,0.2)",
            overflow: "hidden", backdropFilter: "blur(20px)",
          }}>
            {/* Header */}
            <div style={{
              padding: "1rem", borderBottom: "1px solid rgba(255,255,255,0.08)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
              background: "rgba(255,255,255,0.02)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  width: "32px", height: "32px", borderRadius: "50%",
                  background: "linear-gradient(135deg, var(--primary), var(--secondary))",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1rem"
                }}>🤖</div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>FocusBot</h3>
                  <div style={{ fontSize: "0.7rem", color: "#10b981", display: "flex", alignItems: "center", gap: "4px" }}>
                    <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}/> Online
                  </div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} style={{
                background: "none", border: "none", color: "var(--text-secondary)",
                fontSize: "1.5rem", cursor: "pointer", padding: "0 5px"
              }}>×</button>
            </div>

            {/* Toast */}
            {actionToast && (
              <div style={{
                position: "absolute", top: "70px", left: "50%", transform: "translateX(-50%)",
                background: "var(--primary)", color: "white", padding: "6px 16px",
                borderRadius: "999px", fontSize: "0.8rem", fontWeight: 700, zIndex: 10,
                boxShadow: "0 4px 12px rgba(139,92,246,0.5)"
              }}>
                {actionToast}
              </div>
            )}

            {/* Messages */}
            <div style={{ flex: 1, overflowY: "auto", padding: "1rem", display: "flex", flexDirection: "column", gap: "12px" }}>
              {historyLoading ? (
                 <div style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "2rem", fontSize: "0.85rem" }}>Loading...</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: "center", marginTop: "1rem" }}>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "1rem" }}>
                    Ask me anything about your goals or schedule!
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {SUGGESTED_PROMPTS.map(p => (
                      <button key={p} onClick={() => sendMessage(p)} style={{
                        padding: "8px", background: "rgba(255,255,255,0.05)",
                        border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px",
                        color: "white", fontSize: "0.8rem", cursor: "pointer",
                        transition: "background 0.2s"
                      }} onMouseEnter={e=>e.currentTarget.style.background="rgba(139,92,246,0.15)"}
                         onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.05)"}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                    <div style={{
                      maxWidth: "85%", padding: "10px 14px",
                      background: m.role === "user" ? "var(--primary)" : "rgba(255,255,255,0.08)",
                      borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      fontSize: "0.85rem", lineHeight: 1.5,
                    }}>
                      {m.message}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div style={{ display: "flex", gap: "4px", padding: "10px" }}>
                  <div style={{ width: "6px", height: "6px", background: "var(--primary)", borderRadius: "50%", animation: "bounce 1s infinite" }} />
                  <div style={{ width: "6px", height: "6px", background: "var(--primary)", borderRadius: "50%", animation: "bounce 1s infinite 0.2s" }} />
                  <div style={{ width: "6px", height: "6px", background: "var(--primary)", borderRadius: "50%", animation: "bounce 1s infinite 0.4s" }} />
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: "0.8rem", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: "8px" }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") sendMessage(); }}
                placeholder="Ask FocusBot..."
                style={{
                  flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "999px", padding: "0 16px", color: "white", fontSize: "0.9rem", outline: "none"
                }}
              />
              <button disabled={!input.trim() || loading} onClick={() => sendMessage()}
                style={{
                  width: "38px", height: "38px", borderRadius: "50%",
                  background: input.trim() && !loading ? "var(--primary)" : "rgba(255,255,255,0.1)",
                  border: "none", color: "white", cursor: input.trim() && !loading ? "pointer" : "default"
                }}>
                ➤
              </button>
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }`}</style>
    </>
  );
}
