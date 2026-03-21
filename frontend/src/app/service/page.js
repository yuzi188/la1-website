"use client";
import { useState, useEffect } from "react";
import { useLanguage } from "../../i18n/LanguageContext";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://la1-backend-production.up.railway.app";

export default function ServicePage() {
  const { t } = useLanguage();
  const [token, setToken] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitMsg, setSubmitMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeView, setActiveView] = useState("form");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    const tk = typeof window !== "undefined" ? localStorage.getItem("la1_token") : null;
    if (tk) {
      setToken(tk);
      fetchTickets(tk);
    }
  }, []);

  const fetchTickets = (tk2) => {
    const tk = tk2 || token;
    if (!tk) return;
    fetch(`${BACKEND}/my-tickets`, { headers: { Authorization: `Bearer ${tk}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setTickets(data); })
      .catch(() => {});
  };

  const handleSubmit = async () => {
    if (!token) { setSubmitMsg(t("service.loginFirst")); return; }
    if (!subject.trim() || !message.trim()) { setSubmitMsg(t("service.fillRequired")); return; }
    setSubmitting(true);
    setSubmitMsg("");
    try {
      const r = await fetch(`${BACKEND}/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ subject, message }),
      });
      const d = await r.json();
      if (d.ok) {
        setSubmitMsg(t("service.ticketSubmitted"));
        setSubject("");
        setMessage("");
        fetchTickets();
      } else {
        setSubmitMsg("❌ " + (d.error || t("service.submitFailed")));
      }
    } catch {
      setSubmitMsg(t("service.networkError"));
    }
    setSubmitting(false);
  };

  const statusMap = {
    open: { label: t("service.statusOpen"), color: "#FF8800", icon: "⏳" },
    replied: { label: t("service.statusReplied"), color: "#00FF88", icon: "✅" },
    closed: { label: t("service.statusClosed"), color: "#888", icon: "🔒" },
  };

  return (
    <div className="fade-in" style={{ padding: "0 0 16px", maxWidth: "480px", margin: "0 auto" }}>

      {/* ── Header Banner ── */}
      <div style={{
        position: "relative",
        height: "160px",
        overflow: "hidden",
        marginBottom: "20px",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "url(/assets/service-banner.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }} />
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.8) 100%)",
        }} />
        <div style={{ position: "absolute", bottom: "16px", left: "20px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: "900", color: "#FFD700", marginBottom: "4px", textShadow: "0 0 20px rgba(255,215,0,0.8)" }}>
            {t("service.title")}
          </h1>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)" }}>{t("service.subtitle")}</p>
        </div>
      </div>

      <div style={{ padding: "0 16px" }}>

        {/* ── Tab Switch ── */}
        <div style={{
          display: "flex", gap: "0",
          marginBottom: "16px",
          background: "rgba(255,255,255,0.03)",
          borderRadius: "10px",
          border: "1px solid rgba(255,215,0,0.15)",
          overflow: "hidden",
        }}>
          {[
            { id: "form", label: t("service.submitTicket") },
            { id: "history", label: t("service.ticketHistory") + ` (${tickets.length})` },
          ].map(tb => (
            <button key={tb.id} onClick={() => setActiveView(tb.id)} style={{
              flex: 1, padding: "12px",
              background: activeView === tb.id ? "rgba(255,215,0,0.1)" : "transparent",
              border: "none",
              borderBottom: activeView === tb.id ? "2px solid #FFD700" : "2px solid transparent",
              color: activeView === tb.id ? "#FFD700" : "#555",
              fontWeight: activeView === tb.id ? 700 : 400,
              fontSize: "13px", cursor: "pointer",
            }}>{tb.label}</button>
          ))}
        </div>

        {/* ── Submit Form ── */}
        {activeView === "form" && (
          <div style={{
            background: "linear-gradient(135deg, rgba(255,215,0,0.05), rgba(0,191,255,0.03))",
            border: "1px solid rgba(255,215,0,0.2)",
            borderRadius: "14px",
            padding: "20px",
          }}>
            {!token ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔒</div>
                <div style={{ fontSize: "14px", color: "#aaa", marginBottom: "12px" }}>{t("service.loginRequired")}</div>
                <a href="/login" style={{
                  display: "inline-block", padding: "10px 24px",
                  background: "linear-gradient(135deg, #FFD700, #B8860B)",
                  borderRadius: "20px", color: "#000", fontWeight: 700,
                  textDecoration: "none", fontSize: "14px",
                }}>{t("service.goLogin")}</a>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ color: "#888", fontSize: "11px", marginBottom: "6px", display: "block" }}>{t("service.subjectLabel")}</label>
                  <input value={subject} onChange={e => setSubject(e.target.value)}
                    placeholder={t("service.subjectPlaceholder")}
                    style={{
                      width: "100%", padding: "12px 14px",
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,215,0,0.2)",
                      borderRadius: "10px", color: "#fff", fontSize: "14px",
                      boxSizing: "border-box",
                    }} />
                </div>
                <div style={{ marginBottom: "14px" }}>
                  <label style={{ color: "#888", fontSize: "11px", marginBottom: "6px", display: "block" }}>{t("service.descLabel")}</label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    placeholder={t("service.descPlaceholder")}
                    style={{
                      width: "100%", minHeight: "120px", padding: "12px 14px",
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,215,0,0.2)",
                      borderRadius: "10px", color: "#fff", fontSize: "14px",
                      resize: "vertical", boxSizing: "border-box",
                      lineHeight: "1.6",
                    }} />
                </div>
                {submitMsg && (
                  <div style={{
                    padding: "10px 14px",
                    background: submitMsg.startsWith("✅") ? "rgba(0,255,136,0.08)" : "rgba(255,68,68,0.08)",
                    border: `1px solid ${submitMsg.startsWith("✅") ? "rgba(0,255,136,0.3)" : "rgba(255,68,68,0.3)"}`,
                    borderRadius: "8px",
                    color: submitMsg.startsWith("✅") ? "#00FF88" : "#FF4444",
                    fontSize: "13px",
                    marginBottom: "12px",
                  }}>{submitMsg}</div>
                )}
                <button onClick={handleSubmit} disabled={submitting} style={{
                  width: "100%", padding: "14px",
                  background: "linear-gradient(135deg, #FFD700, #B8860B)",
                  border: "none", borderRadius: "12px",
                  color: "#000", fontWeight: 800, fontSize: "15px",
                  cursor: submitting ? "not-allowed" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                  boxShadow: "0 0 20px rgba(255,215,0,0.2)",
                }}>
                  {submitting ? t("service.submitting") : t("service.submitBtn")}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Ticket History ── */}
        {activeView === "history" && (
          <div>
            {!token ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>🔒</div>
                <div style={{ fontSize: "14px", color: "#aaa" }}>{t("service.loginToView")}</div>
              </div>
            ) : tickets.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div style={{ fontSize: "36px", marginBottom: "12px" }}>📭</div>
                <div style={{ fontSize: "14px", color: "#555" }}>{t("service.noTickets")}</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {tickets.map(tk => {
                  const st = statusMap[tk.status] || statusMap.open;
                  const expanded = expandedId === tk.id;
                  return (
                    <div key={tk.id} onClick={() => setExpandedId(expanded ? null : tk.id)} style={{
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${expanded ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.06)"}`,
                      borderRadius: "12px",
                      padding: "14px 16px",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: expanded ? "10px" : 0 }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, color: "#fff", marginBottom: "3px" }}>
                            {st.icon} {tk.subject}
                          </div>
                          <div style={{ fontSize: "11px", color: "#555" }}>
                            #{tk.id} · {(tk.created_at || "").slice(0, 16)}
                          </div>
                        </div>
                        <span style={{
                          background: st.color + "22",
                          color: st.color,
                          border: `1px solid ${st.color}55`,
                          borderRadius: "6px",
                          padding: "3px 10px",
                          fontSize: "11px",
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}>{st.label}</span>
                      </div>
                      {expanded && (
                        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px" }}>
                          <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "8px", lineHeight: "1.6" }}>
                            <span style={{ color: "#888" }}>{t("service.myQuestion")}</span><br/>
                            {tk.message}
                          </div>
                          {tk.admin_reply && (
                            <div style={{
                              background: "rgba(0,191,255,0.06)",
                              border: "1px solid rgba(0,191,255,0.2)",
                              borderRadius: "8px",
                              padding: "10px 12px",
                              marginTop: "8px",
                            }}>
                              <div style={{ fontSize: "11px", color: "#00BFFF", fontWeight: 700, marginBottom: "4px" }}>{t("service.adminReply")}</div>
                              <div style={{ fontSize: "12px", color: "#ccc", lineHeight: "1.6" }}>{tk.admin_reply}</div>
                              {tk.replied_at && <div style={{ fontSize: "10px", color: "#555", marginTop: "4px" }}>{(tk.replied_at || "").slice(0, 16)}</div>}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {token && (
              <button onClick={() => fetchTickets()} style={{
                width: "100%", marginTop: "14px", padding: "10px",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,215,0,0.15)",
                borderRadius: "10px",
                color: "#FFD700", fontSize: "13px",
                cursor: "pointer",
              }}>{t("service.refreshList")}</button>
            )}
          </div>
        )}

        {/* ── Quick Contact ── */}
        <div style={{
          marginTop: "20px",
          background: "rgba(255,255,255,0.02)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "12px",
          padding: "16px",
          textAlign: "center",
        }}>
          <div style={{ fontSize: "13px", color: "#888", marginBottom: "10px" }}>{t("service.needHelp")}</div>
          <a href="https://t.me/LA1111_bot" target="_blank" rel="noopener noreferrer" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "10px 20px",
            background: "linear-gradient(135deg, #00BFFF, #1E90FF)",
            borderRadius: "20px", color: "#fff",
            fontWeight: 700, fontSize: "13px",
            textDecoration: "none",
            boxShadow: "0 0 15px rgba(0,191,255,0.2)",
          }}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
              <path d="M21 4L3 11.3l5.8 2.1L18 7.6l-6.9 6.1.1 5L14 15.8l3.1 2.3L21 4Z" fill="#fff"/>
            </svg>
            {t("service.tgService")}
          </a>
        </div>

        {/* ── Service Nodes ── */}
        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {[
              { name: t("service.onlineService"), icon: "🎧", color: "#FFD700", status: true },
              { name: t("service.tgService"), icon: "✈️", color: "#00BFFF", status: true },
              { name: t("service.faq"), icon: "❓", color: "#FF8800", status: true },
            ].map((node, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "10px",
                padding: "12px 8px",
                textAlign: "center",
              }}>
                <div style={{ fontSize: "20px", marginBottom: "6px" }}>{node.icon}</div>
                <div style={{ fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>{node.name}</div>
                <div style={{
                  width: "6px", height: "6px",
                  borderRadius: "50%",
                  background: node.status ? "#00FF88" : "#FF4444",
                  margin: "0 auto",
                  boxShadow: `0 0 6px ${node.color}`,
                }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
