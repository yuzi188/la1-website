"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../i18n/LanguageContext";

const API = "https://la1-backend-production.up.railway.app";
// VIP names will be translated dynamically using t()
const CHECKIN_REWARDS = [0.5, 0.5, 1, 1, 1.5, 1.5, 3];

export default function ProfilePage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [vip, setVip] = useState(null);
  const [referral, setReferral] = useState(null);
  const [checkin, setCheckin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const tryLogin = async () => {
      let token = localStorage.getItem("la1_token");
      if (token) { fetchAll(token); return; }
      const tg = typeof window !== "undefined" && window.Telegram?.WebApp;
      if (tg && tg.initData && tg.initData.length > 0) {
        tg.ready();
        tg.expand();
        try {
          const res = await fetch(`${API}/tg-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData }),
          });
          const data = await res.json();
          if (data.token) {
            localStorage.setItem("la1_token", data.token);
            localStorage.setItem("la1_user", JSON.stringify(data.user));
            fetchAll(data.token);
            return;
          }
        } catch (e) {}
      }
      setLoading(false);
    };
    tryLogin();
  }, []);

  async function fetchAll(token) {
    const headers = { Authorization: `Bearer ${token}` };
    try {
      const [me, prof, v, r, c] = await Promise.all([
        fetch(`${API}/me`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API}/api/user/profile`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API}/promo/vip-info`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API}/promo/referral-info`, { headers }).then(r => r.json()).catch(() => null),
        fetch(`${API}/promo/checkin-status`, { headers }).then(r => r.json()).catch(() => null),
      ]);
      if (me && !me.error) setUser(me);
      if (prof && !prof.error) setUserProfile(prof);
      setVip(v); setReferral(r); setCheckin(c);
    } catch (e) {}
    setLoading(false);
  }

  function handleLogout() {
    localStorage.removeItem("la1_token");
    localStorage.removeItem("la1_user");
    router.push("/");
  }

  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => { setMsg(`✅ ${t("referral.copied")}`); setTimeout(() => setMsg(""), 2000); });
  }

  async function doCheckin() {
    const token = localStorage.getItem("la1_token");
    if (!token) return;
    const res = await fetch(`${API}/promo/checkin`, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } });
    const data = await res.json();
    if (data.ok) { setMsg(`✅ +${data.reward}U`); fetchAll(token); }
    else setMsg(data.error || "Error");
    setTimeout(() => setMsg(""), 3000);
  }

  const cardStyle = {
    background: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,215,0,0.2)",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 0 15px rgba(0,191,255,0.08)",
  };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#FFD700" }}>{t("common.loading")}</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="fade-in" style={{ padding: "16px", textAlign: "center", paddingTop: "60px" }}>
        <div style={{ fontSize: "60px", marginBottom: "16px" }}>🔒</div>
        <h2 style={{ color: "#FFD700", marginBottom: "8px" }}>{t("login.title")}</h2>
        <p style={{ color: "#888", marginBottom: "20px" }}>{t("login.subtitle")}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px", maxWidth: "300px", margin: "0 auto" }}>
          <a href="/login" style={{ padding: "14px", background: "linear-gradient(135deg, #FFD700, #FFA500)", borderRadius: "12px", color: "#000", fontWeight: "bold", textAlign: "center", textDecoration: "none" }}>{t("login.loginBtn")}</a>
          <a href="https://t.me/LA1111_bot" target="_blank" rel="noopener noreferrer" style={{ padding: "14px", background: "rgba(0,191,255,0.1)", border: "1px solid rgba(0,191,255,0.3)", borderRadius: "12px", color: "#00BFFF", fontWeight: "bold", textAlign: "center", textDecoration: "none" }}>Telegram</a>
        </div>
      </div>
    );
  }

  const vipLevel = vip?.vip_level || 0;
  const VIP_NAMES_DYNAMIC = [t("profile.vipNormal"), "VIP1", "VIP2", "VIP3", "VIP4", "VIP5"];
  const vipName = VIP_NAMES_DYNAMIC[vipLevel] || t("profile.vipNormal");

  return (
    <div className="fade-in" style={{ padding: "16px", paddingBottom: "100px" }}>
      {msg && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.9)", border: "1px solid #FFD700", padding: "12px 24px", borderRadius: "12px", zIndex: 9999, color: "#FFD700", fontWeight: "bold", fontSize: "14px" }}>
          {msg}
        </div>
      )}

      {/* Avatar + Basic Info */}
      {(() => {
        // Priority: custom avatar > default initial circle
        const customAvatar = userProfile?.avatar || "";
        // Priority: custom nickname > TG display name
        const displayName = userProfile?.nickname || user.first_name || user.username || "";
        return (
          <div style={{ ...cardStyle, textAlign: "center", background: "linear-gradient(180deg, rgba(255,215,0,0.08), rgba(0,0,0,0.6))" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "-10px" }}>
              <button onClick={handleLogout} style={{ background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)", borderRadius: "20px", color: "#ff6666", padding: "4px 12px", cursor: "pointer", fontSize: "11px" }}>{t("profile.logout")}</button>
            </div>
            <div style={{
              width: "72px", height: "72px", borderRadius: "50%",
              background: customAvatar ? "transparent" : "linear-gradient(135deg, #FFD700, #D4AF37)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "32px", margin: "0 auto 12px",
              boxShadow: "0 0 25px rgba(255,215,0,0.4)", color: "#000", fontWeight: "900",
              overflow: "hidden",
            }}>
              {customAvatar
                ? <img src={customAvatar} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (displayName ? displayName.charAt(0).toUpperCase() : "👤")}
            </div>
            <h2 style={{ fontSize: "18px", color: "#fff", marginBottom: "4px" }}>
              {displayName}
            </h2>
            {user.tg_id && (
              <p style={{ fontSize: "12px", color: "#888", marginBottom: "8px" }}>@{user.username} | TG ID: {user.tg_id}</p>
            )}
            <div style={{
              display: "inline-block", padding: "4px 16px",
              background: vipLevel > 0 ? "linear-gradient(135deg, #FFD700, #FF8C00)" : "rgba(255,255,255,0.1)",
              borderRadius: "20px", color: vipLevel > 0 ? "#000" : "#888",
              fontSize: "12px", fontWeight: "bold",
            }}>
              👑 {vipName}
            </div>
          </div>
        );
      })()}

      {/* Balance Card */}
      <div style={{ ...cardStyle, background: "linear-gradient(135deg, rgba(255,215,0,0.1), rgba(0,191,255,0.05))" }}>
        <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>{t("profile.balance")} (USDT)</div>
        <div style={{ fontSize: "36px", fontWeight: "900", color: "#FFD700", marginBottom: "4px" }}>
          $ {(user.balance || 0).toFixed(2)}
        </div>
        {user.wager_requirement > 0 && (
          <div style={{ fontSize: "11px", color: "#FF6347", marginBottom: "12px" }}>
            🎯 {t("profile.wagerReq")}：{(user.wager_requirement || 0).toFixed(0)} USDT
          </div>
        )}
        <div style={{ display: "flex", gap: "10px" }}>
          <a href="/deposit" style={{ flex: 1, padding: "12px", background: "linear-gradient(135deg, #FFD700, #FFA500)", borderRadius: "10px", color: "#000", fontWeight: "bold", textAlign: "center", textDecoration: "none", fontSize: "14px" }}>{t("deposit.depositTab")}</a>
          <a href="https://t.me/LA1111_bot" target="_blank" style={{ flex: 1, padding: "12px", background: "rgba(0,191,255,0.1)", border: "1px solid rgba(0,191,255,0.3)", borderRadius: "10px", color: "#00BFFF", fontWeight: "bold", textAlign: "center", textDecoration: "none", fontSize: "14px" }}>{t("deposit.withdrawTab")}</a>
        </div>
      </div>

      {/* VIP Progress */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700" }}>👑 VIP {t("vip.progress")}</h3>
          <span style={{ fontSize: "12px", color: "#00BFFF" }}>{((vip?.rebate || 0) * 100).toFixed(1)}%</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888", marginBottom: "4px" }}>
          <span>{vipName}</span>
          <span>{vip?.next_level || "VIP1"}</span>
        </div>
        <div style={{ height: "10px", background: "rgba(255,255,255,0.1)", borderRadius: "5px", overflow: "hidden", marginBottom: "8px" }}>
          <div style={{
            height: "100%", width: `${vip?.progress || 0}%`,
            background: "linear-gradient(90deg, #FFD700, #00BFFF)",
            borderRadius: "5px", transition: "width 0.8s ease",
            boxShadow: "0 0 10px rgba(255,215,0,0.5)",
          }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#888" }}>
          <span>{t("profile.totalBet")}：{(vip?.total_bet || 0).toLocaleString()}</span>
          <span>{(vip?.remaining || 0).toLocaleString()} USDT</span>
        </div>
      </div>

      {/* Daily Checkin */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700" }}>{t("profile.checkinCard")}</h3>
          <span style={{ fontSize: "12px", color: checkin?.checkedToday ? "#4CAF50" : "#00BFFF" }}>
            {checkin?.checkedToday ? t("checkin.signed") : t("checkin.signNow")}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "6px", marginBottom: "12px" }}>
          {CHECKIN_REWARDS.map((r, i) => {
            const streak = checkin?.streak || 0;
            const checked = checkin?.checkedToday ? i < streak : i < streak;
            const isToday = checkin?.checkedToday ? i === streak - 1 : i === streak;
            return (
              <div key={i} style={{
                textAlign: "center", padding: "6px 2px", borderRadius: "8px",
                background: checked ? "rgba(255,215,0,0.15)" : isToday ? "rgba(0,191,255,0.15)" : "rgba(255,255,255,0.03)",
                border: checked ? "1px solid rgba(255,215,0,0.4)" : isToday ? "1px solid rgba(0,191,255,0.4)" : "1px solid rgba(255,255,255,0.06)",
              }}>
                <div style={{ fontSize: "9px", color: "#666" }}>D{i + 1}</div>
                <div style={{ fontSize: "12px", fontWeight: "bold", color: checked ? "#FFD700" : isToday ? "#00BFFF" : "#444" }}>
                  {checked ? "✅" : `${r}U`}
                </div>
              </div>
            );
          })}
        </div>
        <button onClick={doCheckin} disabled={checkin?.checkedToday} style={{
          width: "100%", padding: "10px", borderRadius: "10px", border: "none", fontWeight: "bold", fontSize: "14px", cursor: checkin?.checkedToday ? "default" : "pointer",
          background: checkin?.checkedToday ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #FFD700, #D4AF37)",
          color: checkin?.checkedToday ? "#555" : "#000",
        }}>
          {checkin?.checkedToday ? t("profile.checkedToday") : t("profile.checkinNow")}
        </button>
      </div>

      {/* Referral / 分潤獎勵 Card */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
          <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700" }}>🤝 邀請返傭</h3>
          <a href="/activity/referral" style={{ fontSize: "11px", color: "#00BFFF", textDecoration: "none" }}>查看詳情 ›</a>
        </div>
        {/* Stats Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
          <div style={{ textAlign: "center", background: "rgba(255,215,0,0.08)", borderRadius: "10px", padding: "10px 6px" }}>
            <div style={{ fontSize: "20px", fontWeight: "bold", color: "#FFD700" }}>{referral?.invite_count || 0}</div>
            <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>已邀請</div>
          </div>
          <div style={{ textAlign: "center", background: "rgba(0,255,136,0.08)", borderRadius: "10px", padding: "10px 6px" }}>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#00FF88" }}>{(referral?.total_commission || referral?.invite_earnings || 0).toFixed(2)}</div>
            <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>累計分潤 (U)</div>
          </div>
          <div style={{ textAlign: "center", background: "rgba(255,165,0,0.08)", borderRadius: "10px", padding: "10px 6px" }}>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: "#FFA500" }}>{(referral?.pending_commission || 0).toFixed(2)}</div>
            <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>待發放 (U)</div>
          </div>
        </div>
        {/* Invite Code */}
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px" }}>
          <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>專屬邀請碼</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700", letterSpacing: "2px" }}>{referral?.invite_code || "---"}</span>
            <button onClick={() => copyText(referral?.invite_link || referral?.tg_link || "")} style={{ background: "rgba(255,215,0,0.2)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: "8px", padding: "4px 12px", color: "#FFD700", fontSize: "11px", cursor: "pointer" }}>複製連結</button>
          </div>
          <div style={{ fontSize: "10px", color: "#888", marginTop: "6px" }}>💰 分潤獎勵：好友每次儲値的 10% · 次日自動發放</div>
        </div>
      </div>

      {/* Account Stats */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700", marginBottom: "12px" }}>{t("profile.statsCard")}</h3>
        {[
          { label: t("profile.totalDeposit"), value: `${(user.total_deposit || 0).toFixed(2)} USDT`, color: "#FFD700" },
          { label: t("profile.totalBet"), value: `${(user.total_bet || 0).toLocaleString()} USDT`, color: "#00BFFF" },
          { label: t("profile.firstDepositBonus"), value: user.first_deposit_claimed ? t("profile.claimed") : t("profile.notClaimed"), color: user.first_deposit_claimed ? "#4CAF50" : "#888" },
          { label: t("profile.wagerReq"), value: `${(user.wager_requirement || 0).toFixed(0)} USDT`, color: "#FF6347" },
        ].map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: i < 3 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
            <span style={{ fontSize: "13px", color: "#888" }}>{item.label}</span>
            <span style={{ fontSize: "13px", fontWeight: "bold", color: item.color }}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Menu */}
      <div style={cardStyle}>
        {[
          { icon: "🎁", label: t("profile.activityCenter"), href: "/activity" },
          { icon: "📋", label: t("profile.transactionHistory"), href: "/profile/transactions" },
          { icon: "🔒", label: t("profile.securityCenter"), href: "/profile/security" },
          { icon: "📞", label: t("profile.contactService"), href: "/service" },
        ].map((item, i, arr) => (
          <a key={i} href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 0",
            borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
            textDecoration: "none", color: "#fff",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <span style={{ fontSize: "18px" }}>{item.icon}</span>
              <span style={{ fontSize: "14px" }}>{item.label}</span>
            </div>
            <span style={{ color: "#333", fontSize: "16px" }}>›</span>
          </a>
        ))}
      </div>
    </div>
  );
}
