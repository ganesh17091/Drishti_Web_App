"use client";
import { useState } from "react";
import { MessageSquare, X, Send } from "lucide-react";

export default function CustomerSupportWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setMessage("");
    }, 2000);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: "fixed",
          bottom: "2rem",
          left: "2rem",
          width: "60px",
          height: "60px",
          borderRadius: "50%",
          background: "var(--primary)",
          color: "white",
          border: "none",
          boxShadow: "0 4px 20px rgba(251, 146, 60, 0.4)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          zIndex: 1000,
          transition: "transform 0.2s, box-shadow 0.2s",
          transform: isOpen ? "scale(0)": "scale(1)"
        }}
        onMouseEnter={(e) => {
           e.currentTarget.style.transform = "scale(1.05)";
           e.currentTarget.style.boxShadow = "0 6px 24px rgba(251, 146, 60, 0.5)";
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 20px rgba(251, 146, 60, 0.4)";
        }}
      >
        <MessageSquare size={28} />
      </button>

      {isOpen && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          left: "2rem",
          width: "340px",
          background: "white",
          borderRadius: "20px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
          zIndex: 1001,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          fontFamily: "Outfit, sans-serif"
        }}>
          {/* Header */}
          <div style={{
            background: "linear-gradient(135deg, var(--primary), var(--secondary))",
            color: "white",
            padding: "1rem 1.5rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MessageSquare size={20} />
                <span style={{ fontWeight: 600, fontSize: "1.1rem" }}>Help & Support</span>
            </div>
            <button onClick={() => setIsOpen(false)} style={{
                background: "transparent", border: "none", color: "white", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center"
            }}>
                <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div style={{ padding: "1.5rem", flex: 1, background: "#fdfaf4" }}>
              {submitted ? (
                  <div style={{ textAlign: "center", padding: "2rem 0", color: "var(--text-primary)" }}>
                      <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>✅</div>
                      <h3 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem" }}>Message Sent!</h3>
                      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: 0 }}>We'll get back to you soon.</p>
                  </div>
              ) : (
                  <>
                    <p style={{ margin: "0 0 1rem", fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        Have a question or need help with a feature? Send us a message.
                    </p>
                    <form onSubmit={handleSubmit}>
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Type your message here..."
                            style={{
                                width: "100%", height: "120px", padding: "12px", border: "1px solid rgba(0,0,0,0.1)",
                                borderRadius: "12px", background: "white", resize: "none", fontSize: "0.9rem",
                                fontFamily: "Outfit, sans-serif", color: "var(--text-primary)", outline: "none",
                                marginBottom: "1rem"
                            }}
                            onFocus={(e) => e.target.style.borderColor = "var(--primary)"}
                            onBlur={(e) => e.target.style.borderColor = "rgba(0,0,0,0.1)"}
                        />
                        <button type="submit" className="modern-btn primary" style={{
                            display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", marginTop: 0
                        }}>
                            Send Message <Send size={16} />
                        </button>
                    </form>
                  </>
              )}
          </div>
        </div>
      )}
    </>
  );
}
