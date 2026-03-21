"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "../../i18n/LanguageContext";

const API = "https://la1-backend-production.up.railway.app";
const CHECKIN_REWARDS = [0.5, 0.5, 1, 1, 1.5, 1.5, 3];

function getActivities(t) {
  return [
  {
    id: "first-deposit",
    icon: "🎁",
    title: t("firstDeposit.title"),
    subtitle: t("firstDeposit.bannerDesc"),
    desc: t("firstDeposit.rule1"),
    badge: "HOT",
    badgeColor: "#FF4500",
    gradient: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,69,0,0.08))",
    border: "rgba(255,215,0,0.4)",
  },
  {
    id: "vip",
    icon: "👑",
    title: t("vip.title"),
    subtitle: t("vip.exclusiveBonus"),
    desc: t("vip.desc"),
    badge: "VIP",
    badgeColor: "#FFD700",
    gradient: "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(0,191,255,0.06))",
    border: "rgba(255,215,0,0.3)",
  },
  {
    id: "referral",
    icon: "🤝",
    title: t("referral.title"),
    subtitle: t("referral.commission"),
    desc: t("referral.desc"),
    badge: t("referral.permanent"),
    badgeColor: "#00BFFF",
    gradient: "linear-gradient(135deg, rgba(0,191,255,0.12), rgba(30,144,255,0.06))",
    border: "rgba(0,191,255,0.3)",
  },
  {
    id: "checkin",
    icon: "📅",
    title: t("checkin.title"),
    subtitle: t("checkin.subtitle"),
    desc: t("checkin.desc"),
    badge: t("checkin.daily"),
    badgeColor: "#00BFFF",
    gradient: "linear-gradient(135deg, rgba(0,191,255,0.1), rgba(255,215,0,0.06))",
    border: "rgba(0,191,255,0.25)",
  },
  {
    id: "tasks",
    icon: "🎯",
    title: t("tasks.title"),
    subtitle: t("tasks.subtitle"),
    desc: t("tasks.desc"),
    badge: t("checkin.daily"),
    badgeColor: "#FFD700",
    gradient: "linear-gradient(135deg, rgba(255,215,0,0.1), rgba(0,191,255,0.06))",
    border: "rgba(255,215,0,0.25)",
  },
  {
    id: "weekend",
    icon: "🎊",
    title: t("weekend.title"),
    subtitle: t("weekend.subtitle"),
    desc: t("weekend.desc"),
    badge: t("weekend.weekendBadge"),
    badgeColor: "#FF8C00",
    gradient: "linear-gradient(135deg, rgba(255,140,0,0.12), rgba(255,215,0,0.06))",
    border: "rgba(255,140,0,0.3)",
  },
  ];
}

export default function ActivityPage() {
  const { t } = useLanguage();
  const [token, setToken] = useState(null);
  const [summary, setSummary] = useState(null);
  const [checkinStatus, setCheckinStatus] = useState(null);
  const [vip, setVip] = useState(null);
  const [referral, setReferral] = useState(null);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const init = async () => {
      let tok = localStorage.getItem("la1_token");
      // In Telegram environment, always call /tg-login to bind TG data
      const tg = typeof window !== "undefined" && window.Telegram?.WebApp;
      if (tg && tg.initData && tg.initData.length > 0) {
        tg.ready();
        tg.expand();
        try {
          const refCode = localStorage.getItem("la1_ref") || "";
          const res = await fetch(`${API}/tg-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData, ...(refCode ? { referral: refCode } : {}) }),
          });
          const data = await res.json();
          if (data.token) {
            localStorage.setItem("la1_token", data.token);
            localStorage.setItem("la1_user", JSON.stringify(data.user));
            if (data.referral_linked) localStorage.removeItem("la1_ref");
            tok = data.token;
          }
        } catch (e) {}
      }
      setToken(tok);
      if (tok) {
        const headers = { Authorization: `Bearer ${tok}` };
        Promise.all([
          fetch(`${API}/promo/summary`, { headers }).then(r => r.json()).catch(() => ({})),
          fetch(`${API}/promo/checkin-status`, { headers }).then(r => r.json()).catch(() => null),
          fetch(`${API}/promo/vip-info`, { headers }).then(r => r.json()).catch(() => null),
          fetch(`${API}/promo/referral-info`, { headers }).then(r => r.json()).catch(() => null),
        ]).then(([s, c, v, ref]) => { setSummary(s); setCheckinStatus(c); setVip(v); setReferral(ref); });
      }
    };
    init();
  }, []);

  async function quickCheckin(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!token) { window.location.href = "/login"; return; }
    const res = await fetch(`${API}/promo/checkin`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    const data = await res.json();
    if (data.ok) { setMsg(`✅ ${t("checkin.success")}！+${data.reward} USDT`); setCheckinStatus(prev => ({ ...prev, checkedToday: true })); }
    else setMsg(data.error || t("checkin.alreadySigned"));
    setTimeout(() => setMsg(""), 3000);
  }

  const cardStyle = {
    background: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,215,0,0.2)",
    borderRadius: "16px",
    padding: "0",
    marginBottom: "12px",
    overflow: "hidden",
    boxShadow: "0 0 20px rgba(0,191,255,0.06)",
    position: "relative",
  };

  return (
    <div className="fade-in" style={{ padding: "16px", paddingBottom: "100px", maxWidth: "480px", margin: "0 auto" }}>
      <h1 style={{ fontSize: "22px", fontWeight: "bold", textAlign: "center", color: "#FFD700", marginBottom: "6px" }}>
        🔥 {t("activity.title")}
      </h1>
      <p style={{ textAlign: "center", color: "#888", fontSize: "13px", marginBottom: "20px" }}>{t("activity.subtitle")}</p>

      {msg && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.95)", border: "1px solid #FFD700", padding: "12px 24px", borderRadius: "12px", zIndex: 9999, color: "#FFD700", fontWeight: "bold", fontSize: "14px", maxWidth: "90vw", textAlign: "center" }}>
          {msg}
        </div>
      )}

      {/* Activity Cards */}
      {getActivities(t).map((act) => (
        <Link key={act.id} href={`/activity/${act.id}`} style={{ textDecoration: "none", display: "block" }}>
          <div style={{ ...cardStyle, border: `1px solid ${act.border}` }}>
            {/* Top gradient bar */}
            <div style={{ height: "3px", background: act.gradient.replace("rgba", "").includes("FFD700") ? "linear-gradient(90deg, #FFD700, #00BFFF)" : "linear-gradient(90deg, #00BFFF, #FFD700)" }} />
            <div style={{ padding: "16px", background: act.gradient }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ display: "flex", gap: "12px", alignItems: "flex-start", flex: 1 }}>
                  <div style={{ fontSize: "36px", lineHeight: 1 }}>{act.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "3px" }}>
                      <span style={{ fontSize: "16px", fontWeight: "bold", color: "#fff" }}>{act.title}</span>
                      <span style={{ background: act.badgeColor, color: "#000", fontSize: "10px", padding: "2px 7px", borderRadius: "10px", fontWeight: "bold" }}>{act.badge}</span>
                    </div>
                    <div style={{ fontSize: "13px", color: "#FFD700", fontWeight: "bold", marginBottom: "3px" }}>{act.subtitle}</div>
                    <div style={{ fontSize: "12px", color: "#888" }}>{act.desc}</div>
                  </div>
                </div>
                <div style={{ color: "#FFD700", fontSize: "18px", marginLeft: "8px", flexShrink: 0 }}>›</div>
              </div>

              {/* Special inline content for checkin */}
              {act.id === "checkin" && (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "4px", marginBottom: "10px" }}>
                    {CHECKIN_REWARDS.map((r, i) => {
                      const streak = checkinStatus?.streak || 0;
                      const checked = i < streak;
                      const isToday = !checkinStatus?.checkedToday && i === streak;
                      return (
                        <div key={i} style={{
                          textAlign: "center", padding: "6px 2px", borderRadius: "8px",
                          background: checked ? "rgba(255,215,0,0.2)" : isToday ? "rgba(0,191,255,0.2)" : "rgba(255,255,255,0.05)",
                          border: checked ? "1px solid rgba(255,215,0,0.4)" : isToday ? "1px solid rgba(0,191,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        }}>
                          <div style={{ fontSize: "9px", color: "#666" }}>D{i + 1}</div>
                          <div style={{ fontSize: "11px", fontWeight: "bold", color: checked ? "#FFD700" : isToday ? "#00BFFF" : "#555" }}>
                            {checked ? "✅" : `${r}U`}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!checkinStatus?.checkedToday ? (
                    <button onClick={quickCheckin} style={{ width: "100%", padding: "9px", borderRadius: "10px", border: "none", background: "linear-gradient(135deg, #FFD700, #FFA500)", color: "#000", fontWeight: "bold", fontSize: "13px", cursor: "pointer" }}>
                      {t("checkin.signNow")} (D{(checkinStatus?.streak || 0) + 1})
                    </button>
                  ) : (
                    <div style={{ textAlign: "center", padding: "8px", color: "#FFD700", fontSize: "13px", fontWeight: "bold" }}>✅ {t("checkin.signed")}</div>
                  )}
                </div>
              )}

              {/* Special inline content for VIP */}
              {act.id === "vip" && vip && (
                <div style={{ marginTop: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888", marginBottom: "4px" }}>
                    <span>{vip.vip_name || t("vip.normalMember")}</span>
                    <span>{t("common.bet")} {(vip.total_bet || 0).toLocaleString()} / {(vip.next_bet || 0).toLocaleString()} U</span>
                  </div>
                  <div style={{ height: "6px", background: "rgba(255,255,255,0.1)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${vip.progress || 0}%`, background: "linear-gradient(90deg, #FFD700, #00BFFF)", borderRadius: "3px" }} />
                  </div>
                </div>
              )}

              {/* Special inline content for referral */}
              {act.id === "referral" && (
                <div style={{ marginTop: "10px" }}>
                  {referral ? (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                      <div style={{ textAlign: "center", background: "rgba(255,215,0,0.1)", borderRadius: "10px", padding: "8px 4px", border: "1px solid rgba(255,215,0,0.2)" }}>
                        <div style={{ fontSize: "18px", fontWeight: "bold", color: "#FFD700" }}>{referral.invite_count || 0}</div>
                        <div style={{ fontSize: "10px", color: "#888" }}>已邀請</div>
                      </div>
                      <div style={{ textAlign: "center", background: "rgba(0,255,136,0.08)", borderRadius: "10px", padding: "8px 4px", border: "1px solid rgba(0,255,136,0.15)" }}>
                        <div style={{ fontSize: "16px", fontWeight: "bold", color: "#00FF88" }}>{(referral.total_commission || 0).toFixed(1)}U</div>
                        <div style={{ fontSize: "10px", color: "#888" }}>累計分潤</div>
                      </div>
                      <div style={{ textAlign: "center", background: "rgba(255,165,0,0.08)", borderRadius: "10px", padding: "8px 4px", border: "1px solid rgba(255,165,0,0.15)" }}>
                        <div style={{ fontSize: "16px", fontWeight: "bold", color: "#FFA500" }}>{(referral.pending_commission || 0).toFixed(1)}U</div>
                        <div style={{ fontSize: "10px", color: "#888" }}>待發放</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                      <div style={{ flex: 1, textAlign: "center", background: "rgba(255,215,0,0.1)", borderRadius: "10px", padding: "10px 8px", border: "1px solid rgba(255,215,0,0.25)" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#FFD700" }}>10%</div>
                        <div style={{ fontSize: "10px", color: "#888" }}>分潤獎勵比例</div>
                      </div>
                      <div style={{ flex: 1, textAlign: "center", background: "rgba(0,191,255,0.08)", borderRadius: "10px", padding: "10px 8px", border: "1px solid rgba(0,191,255,0.2)" }}>
                        <div style={{ fontSize: "24px", fontWeight: "bold", color: "#00BFFF" }}>5x</div>
                        <div style={{ fontSize: "10px", color: "#888" }}>流水要求</div>
                      </div>
                    </div>
                  )}
                  <div style={{ fontSize: "11px", color: "#888", textAlign: "center" }}>💰 好友每次儲値，邀請人獲得 10% 分潤獎勵 · 次日自動發放</div>
                </div>
              )}

              {/* View details hint */}
              <div style={{ marginTop: "10px", textAlign: "right", fontSize: "12px", color: "rgba(255,215,0,0.6)" }}>
                {t("activity.viewRules")} →
              </div>
            </div>
          </div>
        </Link>
      ))}

      {/* Risk warning */}
      <div style={{ background: "rgba(255,69,0,0.05)", border: "1px solid rgba(255,69,0,0.2)", borderRadius: "12px", padding: "14px", marginTop: "8px" }}>
        <h3 style={{ fontSize: "13px", fontWeight: "bold", color: "#FF6347", marginBottom: "8px" }}>⚠️ {t("activity.riskTitle")}</h3>
        <div style={{ fontSize: "11px", color: "#888", lineHeight: "1.8" }}>
          <p>• {t("activity.risk1")}</p>
          <p>• {t("activity.risk2")}</p>
          <p>• {t("activity.risk3")}</p>
        </div>
      </div>
    </div>
  );
}
