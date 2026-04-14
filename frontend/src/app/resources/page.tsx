"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// Utility to grab YouTube ID for embedding
const getYoutubeId = (url: string) => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([^&]{11})/);
  return match ? match[1] : null;
};

type Book = { title: string; author: string; why: string; level: string; url: string };
type Video = { title: string; channel: string; topic: string; duration_est: string; url: string };
type Short = { title: string; topic: string; url: string };
type Course = { title: string; platform: string; level: string; free: boolean; why: string; url: string };

type Resources = {
  books?: Book[];
  youtube_videos?: Video[];
  youtube_shorts?: Short[];
  courses?: Course[];
};

const LEVEL_COLOR: Record<string, string> = {
  Beginner: "#10b981",
  Intermediate: "#f59e0b",
  Advanced: "#ef4444",
};

const PLATFORM_ICON: Record<string, string> = {
  Coursera: "🎓", edX: "🏫", Udemy: "🎯",
  "fast.ai": "⚡", "MIT OCW": "🏛️", "Stanford Online": "🌟",
};

export default function Resources() {
  const router = useRouter();
  const [data, setData] = useState<Resources | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"books" | "videos" | "shorts" | "courses">("books");
  const [playingVideo, setPlayingVideo] = useState<{title: string, url: string} | null>(null);

  const token = () => localStorage.getItem("token");

  const fetchResources = async () => {
    const t = token();
    if (!t) { router.push("/auth"); return; }
    const API = process.env.NEXT_PUBLIC_API_URL;
    try {
      console.log("[Resources] Calling API:", `${API}/ai/resources`);
      const res = await fetch(`${API}/ai/resources`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "Failed to load resources");
      setData(json);
    } catch (e: unknown) {
      const msg = (e as Error)?.message || "";
      if (msg === "RATE_LIMIT" || msg?.includes("too many requests")) {
          setError("⚠️ API Rate Limit Exceeded: FocusBot has hit the Groq API rate limit. Please wait 60 seconds and refresh!");
      } else if (e instanceof TypeError && msg === "Failed to fetch") {
          setError("Cannot connect to the server. Please check your internet connection.");
      } else {
          setError(msg);
      }
      console.error("[Resources] fetchResources error:", e);
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    setRefreshing(true);
    setError("");
    const t = token();
    const API = process.env.NEXT_PUBLIC_API_URL;
    try {
      console.log("[Resources] Calling API:", `${API}/ai/resources/refresh`);
      const res = await fetch(`${API}/ai/resources/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error || "Failed to refresh");
      setData(json);
    } catch (e: unknown) {
      const msg = (e as Error)?.message || "";
      if (msg === "RATE_LIMIT" || msg?.includes("too many requests")) {
          setError("⚠️ API Rate Limit Exceeded: FocusBot has hit the API rate limit. Please wait 60 seconds and refresh!");
      } else if (e instanceof TypeError && msg === "Failed to fetch") {
          setError("Cannot connect to the server. Please check your internet connection.");
      } else {
          setError(msg);
      }
      console.error("[Resources] refresh error:", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchResources(); }, []);

  // Reset playing video when switching tabs
  useEffect(() => { setPlayingVideo(null); }, [tab]);

  const TabBtn = ({ id, label, count }: { id: typeof tab; label: string; count?: number }) => (
    <button onClick={() => setTab(id)}
      style={{
        padding: "10px 20px", border: "none", borderRadius: "999px", cursor: "pointer",
        fontFamily: "Outfit, sans-serif", fontWeight: 600, fontSize: "0.95rem",
        background: tab === id ? "linear-gradient(135deg, var(--primary), var(--secondary))" : "rgba(255,255,255,0.05)",
        color: tab === id ? "white" : "var(--text-secondary)",
        transition: "all 0.2s",
      }}>
      {label} {count !== undefined && <span style={{ opacity: 0.75, fontSize: "0.85rem" }}>({count})</span>}
    </button>
  );

  const isVideoTab = tab === "videos" || tab === "shorts";

  return (
    <main style={{ padding: "3rem 2rem", maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1>🔗 Learning Resources</h1>
          <p>Books, YouTube videos, Shorts & courses — curated by AI from your career goals</p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button onClick={refresh} disabled={refreshing} className="modern-btn secondary-btn"
            style={{ width: "auto", padding: "10px 18px", marginTop: 0, fontSize: "0.9rem" }}>
            {refreshing ? "Refreshing..." : "🔄 Refresh"}
          </button>
          <button onClick={() => router.push("/dashboard")} className="modern-btn secondary-btn"
            style={{ width: "auto", padding: "10px 18px", marginTop: 0, fontSize: "0.9rem" }}>
            ← Dashboard
          </button>
        </div>
      </div>

      {loading ? (
        <div className="glass-panel animate-fade-in" style={{ textAlign: "center", padding: "5rem" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🧠</div>
          <p style={{ fontSize: "1.1rem" }}>AI is analyzing your profile and curating resources...</p>
        </div>
      ) : error ? (
        <div className="glass-panel" style={{ color: "#ef4444", textAlign: "center", padding: "3rem" }}>{error}</div>
      ) : data ? (
        <>
          {/* Tab Bar */}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <TabBtn id="books" label="📖 Books" count={data.books?.length} />
            <TabBtn id="videos" label="▶️ Videos" count={data.youtube_videos?.length} />
            <TabBtn id="shorts" label="⚡ Shorts" count={data.youtube_shorts?.length} />
            <TabBtn id="courses" label="🎓 Courses" count={data.courses?.length} />
          </div>

          <div style={{ display: "flex", gap: "2rem", flexDirection: window.innerWidth < 800 ? "column" : "row" }}>
            
            {/* Embedded Player Left Rail (Only on Video Tabs) */}
            {isVideoTab && (
              <div style={{ flex: "0 0 450px", position: "sticky", top: "2rem", height: "fit-content" }}>
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                  {playingVideo && getYoutubeId(playingVideo.url) ? (
                    <>
                      <h3 style={{ marginBottom: "1rem", fontSize: "1.1rem", lineHeight: 1.3 }}>{playingVideo.title}</h3>
                      <iframe
                        width="100%"
                        height={tab === "shorts" ? "550" : "250"}
                        src={`https://www.youtube.com/embed/${getYoutubeId(playingVideo.url)}?autoplay=1`}
                        frameBorder="0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        style={{ borderRadius: "10px", background: "black" }}
                      ></iframe>
                    </>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: tab === "shorts" ? "550px" : "280px", textAlign: "center", background: "rgba(0,0,0,0.2)", borderRadius: "10px", padding: "2rem" }}>
                      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>💡</div>
                      <h3 style={{ marginBottom: "1rem", color: "var(--text-primary)" }}>Select a video to play</h3>
                      <div style={{ padding: "1.5rem", borderLeft: "4px solid var(--primary)", background: "rgba(139,92,246,0.1)", borderRadius: "0 8px 8px 0" }}>
                        <p style={{ color: "var(--text-secondary)", fontStyle: "italic", margin: 0, fontSize: "0.95rem", lineHeight: 1.5 }}>
                          "The beautiful thing about learning is that no one can take it away from you." <br/><br/>
                          <strong style={{ color: "var(--primary)" }}>– B.B. King</strong>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Content Right Rail */}
            <div style={{ flex: 1, minWidth: 0 }}>
              {/* Books Tab */}
              {tab === "books" && (
                <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "1.25rem" }}>
                  {data.books?.map((book, i) => (
                    <a key={i} href={book.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                      <div className="glass-panel" style={{ padding: "1.5rem", height: "100%", cursor: "pointer", transition: "transform 0.2s, box-shadow 0.2s", borderTop: `3px solid ${LEVEL_COLOR[book.level] || "var(--primary)"}` }}
                        onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 12px 30px rgba(0,0,0,0.4)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                          <span style={{ fontSize: "2rem" }}>📚</span>
                          <span style={{ fontSize: "0.75rem", padding: "3px 10px", borderRadius: "999px", background: LEVEL_COLOR[book.level] + "25", color: LEVEL_COLOR[book.level], fontWeight: 600 }}>
                            {book.level}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: "1rem", marginBottom: "0.25rem", lineHeight: 1.3 }}>{book.title}</div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.75rem" }}>by {book.author}</div>
                        <p style={{ fontSize: "0.88rem", color: "var(--text-secondary)", margin: 0 }}>{book.why}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}

              {/* Videos Tab */}
              {tab === "videos" && (
                <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                  {data.youtube_videos?.map((vid, i) => (
                    <div key={i} onClick={() => setPlayingVideo({title: vid.title, url: vid.url})}
                      className="glass-panel" style={{ padding: "1.25rem", cursor: "pointer", display: "flex", gap: "1.25rem", alignItems: "center", transition: "transform 0.2s", borderLeft: "4px solid #ef4444", background: playingVideo?.title === vid.title ? "rgba(239,68,68,0.1)" : "" }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = "translateX(4px)"}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = "none"}>
                      <div style={{ minWidth: "52px", height: "52px", borderRadius: "12px", background: "rgba(239,68,68,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>
                        ▶️
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>{vid.title}</div>
                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          <span>📺 {vid.channel}</span>
                          <span>· {vid.topic}</span>
                          <span style={{ marginLeft: "auto", padding: "2px 8px", background: "rgba(239,68,68,0.15)", color: "#ef4444", borderRadius: "999px" }}>
                            {vid.duration_est}
                          </span>
                        </div>
                      </div>
                      <div style={{ color: "#ef4444", fontSize: "0.85rem", fontWeight: 600 }}>
                        {playingVideo?.title === vid.title ? "Playing..." : "Play Now"}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Shorts Tab */}
              {tab === "shorts" && (
                <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1.25rem" }}>
                  {data.youtube_shorts?.map((s, i) => (
                    <div key={i} onClick={() => setPlayingVideo({title: s.title, url: s.url})}
                      className="glass-panel" style={{ padding: "1.5rem", cursor: "pointer", textAlign: "center", transition: "transform 0.2s, box-shadow 0.2s", background: playingVideo?.title === s.title ? "rgba(236,72,153,0.15)" : "linear-gradient(135deg, rgba(139,92,246,0.1), rgba(236,72,153,0.1))", border: playingVideo?.title === s.title ? "1px solid #ec4899" : "" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "scale(1.03)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = "none"; }}>
                      <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚡</div>
                      <div style={{ fontWeight: 700, marginBottom: "0.5rem", fontSize: "1rem" }}>{s.title}</div>
                      <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1rem" }}>{s.topic}</div>
                      <div style={{ color: "var(--secondary)", fontWeight: 600, fontSize: "0.9rem" }}>
                        {playingVideo?.title === s.title ? "Playing..." : "Play Short"}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Courses Tab */}
              {tab === "courses" && (
                <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {data.courses?.map((c, i) => (
                    <a key={i} href={c.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit" }}>
                      <div className="glass-panel" style={{ padding: "1.5rem", cursor: "pointer", display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "1.25rem", alignItems: "center", transition: "transform 0.2s" }}
                        onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)"}
                        onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = "none"}>
                        <div style={{ fontSize: "2.5rem" }}>{PLATFORM_ICON[c.platform] || "🎓"}</div>
                        <div>
                          <div style={{ fontWeight: 700, marginBottom: "0.3rem" }}>{c.title}</div>
                          <div style={{ display: "flex", gap: "0.75rem", fontSize: "0.85rem", flexWrap: "wrap" }}>
                            <span style={{ color: "var(--text-secondary)" }}>{c.platform}</span>
                            <span style={{ color: LEVEL_COLOR[c.level] || "var(--primary)" }}>· {c.level}</span>
                            <span style={{ color: c.free ? "#10b981" : "#f59e0b", fontWeight: 600 }}>
                              {c.free ? "✓ Free" : "Paid"}
                            </span>
                          </div>
                          <p style={{ margin: "0.5rem 0 0", fontSize: "0.88rem", color: "var(--text-secondary)" }}>{c.why}</p>
                        </div>
                        <div style={{ color: "var(--primary)", fontWeight: 600, fontSize: "0.9rem" }}>
                          Enroll →
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}
