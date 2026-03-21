"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API = "https://la1-backend-production.up.railway.app";
import { useLanguage } from "../../../i18n/LanguageContext";

export default function FirstDepositPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [claimed, setClaimed] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("la1_token");
    setToken(t);
  }, []);

  async function claimBonus(tier) {
    if (!token) { router.push("/login"); return; }
    const res = await fetch(`${API}/promo/first-deposit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    const data = await res.json();
    if (data.ok) { setMsg(t("firstDeposit.success").replace("{bonus}", data.bonus)); setClaimed(true); }
    else setMsg(data.error || t("firstDeposit.fail"));
    setTimeout(() => setMsg(""), 4000);
  }

  const cardStyle = {
    background: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,215,0,0.25)",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 0 20px rgba(0,191,255,0.08)",
  };

  return (
    <div className="fade-in" style={{ padding: "16px", paddingBottom: "100px", maxWidth: "480px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <button onClick={() => router.back()} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "10px", padding: "8px 14px", color: "#fff", cursor: "pointer", fontSize: "14px" }}>{t("activity.back")}</button>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#FFD700" }}>{t("firstDeposit.title")}</h1>
      </div>

      {msg && (
        <div style={{ position: "fixed", top: "20px", left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.95)", border: "1px solid #FFD700", padding: "12px 24px", borderRadius: "12px", zIndex: 9999, color: "#FFD700", fontWeight: "bold", fontSize: "14px" }}>{msg}</div>
      )}

      {/* Banner */}
      <div style={{ ...cardStyle, background: "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(0,191,255,0.08))", borderColor: "rgba(255,215,0,0.4)", textAlign: "center", padding: "28px 20px" }}>
        <div style={{ fontSize: "48px", marginBottom: "8px" }}>💰</div>
        <h2 style={{ fontSize: "22px", fontWeight: "bold", color: "#FFD700", marginBottom: "4px" }}>{t("firstDeposit.title")}</h2>
        <p style={{ color: "#aaa", fontSize: "13px" }}>{t("firstDeposit.bannerDesc")}</p>
      </div>

      {/* Tier 1 */}
      <div style={{ ...cardStyle, borderColor: "rgba(255,215,0,0.4)" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: "linear-gradient(90deg, #FFD700, #FFA500)", borderRadius: "16px 16px 0 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div>
            <div style={{ fontSize: "28px", fontWeight: "900", color: "#FFD700" }}>{t("firstDeposit.tier1")}</div>
            <div style={{ fontSize: "13px", color: "#aaa" }}>{t("firstDeposit.tier1Bonus")}</div>
          </div>
          <div style={{ textAlign: "center", background: "rgba(255,215,0,0.1)", borderRadius: "12px", padding: "10px 16px", border: "1px solid rgba(255,215,0,0.3)" }}>
            <div style={{ fontSize: "22px", fontWeight: "bold", color: "#FFD700" }}>33%</div>
            <div style={{ fontSize: "11px", color: "#888" }}>{t("weekend.bonusRate")}</div>
          </div>
        </div>
        <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: "10px", padding: "12px", marginBottom: "12px" }}>
          <div style={{ fontSize: "12px", color: "#888", marginBottom: "6px" }}>{t("firstDeposit.tiers")}</div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
            <span style={{ color: "#aaa" }}>{t("deposit.minDeposit")}</span><span style={{ color: "#fff" }}>500 USDT</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "4px" }}>
            <span style={{ color: "#aaa" }}>{t("firstDeposit.bonus")}</span><span style={{ color: "#FFD700", fontWeight: "bold" }}>165 USDT</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
            <span style={{ color: "#aaa" }}>{t("firstDeposit.wagerReq")}</span><span style={{ color: "#FF6347", fontWeight: "bold" }}>10x (6,650 USDT)</span>
          </div>
        </div>
        <button onClick={() => claimBonus("500")} disabled={claimed} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: "none", fontWeight: "bold", fontSize: "15px", cursor: claimed ? "default" : "pointer", background: claimed ? "rgba(255,255,255,0.05)" : "linear-gradient(135deg, #FFD700, #FFA500)", color: claimed ? "#555" : "#000" }}>
          {claimed ? t("firstDeposit.claimed") : t("firstDeposit.claim") + " 165 USDT"}
        </button>
      </div>

      {/* Rules */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700", marginBottom: "12px" }}>{t("firstDeposit.rules")}</h3>
        {[
          t("firstDeposit.rule1"),
          t("firstDeposit.rule2"),
          t("firstDeposit.rule4"),
          t("firstDeposit.rule5"),
          t("firstDeposit.rule6"),
          t("firstDeposit.rule7"),
          t("firstDeposit.rule8"),
          t("firstDeposit.rule9"),
          t("firstDeposit.rule10"),
          t("firstDeposit.rule11"),
          t("firstDeposit.rule12"),
          t("activity.disclaimer3"),
        ].map((rule, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", marginBottom: "8px", fontSize: "13px", color: "#aaa", lineHeight: "1.5" }}>
            <span style={{ color: "#FFD700", flexShrink: 0 }}>{i + 1}.</span>
            <span>{rule}</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <a href="/deposit" style={{ display: "block", width: "100%", padding: "14px", background: "linear-gradient(135deg, #FFD700, #FFA500)", borderRadius: "12px", color: "#000", fontWeight: "bold", textAlign: "center", textDecoration: "none", fontSize: "16px", boxSizing: "border-box" }}>
        {t("deposit.submitDeposit")} →
      </a>
    </div>
  );
}
