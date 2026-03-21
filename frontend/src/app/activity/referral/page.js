"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "https://la1-backend-production.up.railway.app";

export default function ReferralPage() {
  const router = useRouter();
  const [referral, setReferral] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      let token = localStorage.getItem("la1_token");
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
            token = data.token;
          }
        } catch (e) {}
      }
      if (token) {
        fetch(`${API}/promo/referral-info`, { headers: { Authorization: `Bearer ${token}` } })
          .then((r) => r.json())
          .then((d) => { setReferral(d); setLoading(false); })
          .catch(() => setLoading(false));
      } else {
        setLoading(false);
      }
    };
    init();
  }, []);

  /**
   * Copy text to clipboard with a fallback for mobile browsers that
   * do not support navigator.clipboard (requires HTTPS secure context).
   * Falls back to document.execCommand('copy') via a temporary textarea.
   */
  function copyText(text) {
    const showToast = (ok) => {
      setMsg(ok ? "✅ 已複製！" : "❌ 複製失敗，請手動複製");
      setTimeout(() => setMsg(""), 2500);
    };

    // Primary: modern Clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => showToast(true),
        () => fallbackCopy(text, showToast)
      );
    } else {
      fallbackCopy(text, showToast);
    }
  }

  /**
   * Fallback copy using execCommand for older / mobile browsers.
   */
  function fallbackCopy(text, showToast) {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      // Prevent scrolling to bottom of page in MS Edge
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.width = "2em";
      ta.style.height = "2em";
      ta.style.padding = "0";
      ta.style.border = "none";
      ta.style.outline = "none";
      ta.style.boxShadow = "none";
      ta.style.background = "transparent";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      showToast(ok);
    } catch (err) {
      showToast(false);
    }
  }

  const cardStyle = {
    background: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,215,0,0.2)",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 0 15px rgba(0,191,255,0.06)",
  };

  const totalCommission = referral?.total_commission || 0;
  const pendingCommission = referral?.pending_commission || 0;
  const inviteCount = referral?.invite_count || 0;
  const lockedCommissions = referral?.locked_commissions || [];
  const commissionHistory = referral?.commission_history || [];

  // Build the full referral link from the invite_code so we always have it
  const SITE_URL = "https://la1-website-production.up.railway.app";
  const inviteLink =
    referral?.invite_link ||
    (referral?.invite_code ? `${SITE_URL}?ref=${referral.invite_code}` : "");

  return (
    <div
      className="fade-in"
      style={{ padding: "16px", paddingBottom: "100px", maxWidth: "480px", margin: "0 auto" }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            padding: "8px 14px",
            color: "#fff",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          ← 返回
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#FFD700" }}>
          🤝 邀請返傭
        </h1>
      </div>

      {/* Toast */}
      {msg && (
        <div
          style={{
            position: "fixed",
            top: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(0,0,0,0.95)",
            border: "1px solid #FFD700",
            padding: "12px 24px",
            borderRadius: "12px",
            zIndex: 9999,
            color: "#FFD700",
            fontWeight: "bold",
            fontSize: "14px",
            whiteSpace: "nowrap",
          }}
        >
          {msg}
        </div>
      )}

      {/* Commission Rate Banner */}
      <div
        style={{
          ...cardStyle,
          background: "linear-gradient(135deg, rgba(0,191,255,0.1), rgba(255,215,0,0.05))",
          borderColor: "rgba(0,191,255,0.3)",
        }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            color: "#FFD700",
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          永久分潤，無上限邀請
        </h2>
        <p style={{ fontSize: "12px", color: "#888", textAlign: "center", marginBottom: "16px" }}>
          好友每次儲值，次日自動發放分潤獎勵
        </p>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            style={{
              textAlign: "center",
              background: "rgba(255,215,0,0.1)",
              borderRadius: "16px",
              padding: "20px 40px",
              border: "1px solid rgba(255,215,0,0.3)",
            }}
          >
            <div style={{ fontSize: "48px", fontWeight: "900", color: "#FFD700" }}>10%</div>
            <div style={{ fontSize: "14px", color: "#FFD700", fontWeight: "bold", marginBottom: "4px" }}>
              分潤獎勵比例
            </div>
            <div style={{ fontSize: "11px", color: "#888" }}>好友消費點數的 10%</div>
          </div>
        </div>
        <div
          style={{
            marginTop: "14px",
            background: "rgba(255,165,0,0.08)",
            borderRadius: "10px",
            padding: "10px 14px",
            border: "1px solid rgba(255,165,0,0.2)",
            fontSize: "12px",
            color: "#FFA500",
            textAlign: "center",
          }}
        >
          🔒 分潤獎勵帶 5 倍流水要求 · 次日 01:00 自動發放
        </div>
      </div>

      {/* Stats Cards */}
      {referral ? (
        <>
          {/* Stats Row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "16px" }}>
            {[
              { label: "已邀請人數", value: inviteCount, unit: "人", color: "#FFD700" },
              { label: "累計分潤", value: totalCommission.toFixed(2), unit: "U", color: "#00FF88" },
              { label: "待發放", value: pendingCommission.toFixed(2), unit: "U", color: "#FFA500" },
            ].map((stat, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(0,0,0,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "12px",
                  padding: "14px 10px",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "20px", fontWeight: "bold", color: stat.color }}>
                  {stat.value}
                  <span style={{ fontSize: "11px", marginLeft: "2px" }}>{stat.unit}</span>
                </div>
                <div style={{ fontSize: "10px", color: "#888", marginTop: "4px" }}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Invite Code Card */}
          <div style={cardStyle}>
            <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700", marginBottom: "12px" }}>
              🔗 您的專屬邀請碼
            </h3>

            {/* Invite Code Row */}
            <div
              style={{
                background: "rgba(255,215,0,0.08)",
                borderRadius: "12px",
                padding: "16px",
                marginBottom: "12px",
                border: "1px solid rgba(255,215,0,0.2)",
              }}
            >
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "6px" }}>邀請碼</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "22px",
                    fontWeight: "bold",
                    color: "#FFD700",
                    letterSpacing: "3px",
                    flex: 1,
                    wordBreak: "break-all",
                  }}
                >
                  {referral.invite_code}
                </span>
                {/* 複製邀請碼 button */}
                <button
                  onClick={() => copyText(referral.invite_code)}
                  style={{
                    background: "rgba(255,215,0,0.2)",
                    border: "1px solid rgba(255,215,0,0.4)",
                    borderRadius: "8px",
                    padding: "6px 12px",
                    color: "#FFD700",
                    fontSize: "12px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    whiteSpace: "nowrap",
                    flexShrink: 0,
                  }}
                >
                  複製邀請碼
                </button>
              </div>
            </div>

            {/* Invite Link */}
            <div
              style={{
                background: "rgba(0,191,255,0.06)",
                borderRadius: "12px",
                padding: "12px",
                marginBottom: "10px",
                border: "1px solid rgba(0,191,255,0.2)",
              }}
            >
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "6px" }}>邀請連結</div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#00BFFF",
                  wordBreak: "break-all",
                  marginBottom: "8px",
                }}
              >
                {inviteLink}
              </div>
              {/* 複製連結 button */}
              <button
                onClick={() => copyText(inviteLink)}
                style={{
                  background: "rgba(0,191,255,0.15)",
                  border: "1px solid rgba(0,191,255,0.3)",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  color: "#00BFFF",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  width: "100%",
                }}
              >
                複製連結
              </button>
            </div>

            {/* TG Link */}
            <div
              style={{
                background: "rgba(0,191,255,0.04)",
                borderRadius: "12px",
                padding: "12px",
                border: "1px solid rgba(0,191,255,0.15)",
              }}
            >
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "6px" }}>TG 邀請連結</div>
              <div
                style={{
                  fontSize: "11px",
                  color: "#00BFFF",
                  wordBreak: "break-all",
                  marginBottom: "8px",
                }}
              >
                {referral.tg_link}
              </div>
              <button
                onClick={() => copyText(referral.tg_link)}
                style={{
                  background: "rgba(0,191,255,0.12)",
                  border: "1px solid rgba(0,191,255,0.25)",
                  borderRadius: "8px",
                  padding: "6px 14px",
                  color: "#00BFFF",
                  fontSize: "12px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  width: "100%",
                }}
              >
                複製 TG 連結
              </button>
            </div>
          </div>

          {/* Locked Commissions */}
          {lockedCommissions.length > 0 && (
            <div style={cardStyle}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#FFD700",
                  marginBottom: "12px",
                }}
              >
                🔒 鎖定中的分潤獎勵
              </h3>
              <p style={{ fontSize: "11px", color: "#888", marginBottom: "12px" }}>
                需完成 5 倍流水後方可提款
              </p>
              {lockedCommissions.map((c, i) => {
                const progress =
                  c.wagering_required > 0
                    ? Math.min(100, (c.wagering_completed / c.wagering_required) * 100)
                    : 0;
                const remaining = Math.max(0, c.wagering_required - c.wagering_completed);
                return (
                  <div
                    key={i}
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      borderRadius: "12px",
                      padding: "14px",
                      marginBottom: "10px",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: "8px",
                      }}
                    >
                      <span style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                        分潤獎勵 +{c.commission_amount.toFixed(2)} U
                      </span>
                      <span style={{ fontSize: "11px", color: "#888" }}>{c.deposit_date}</span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "11px",
                        color: "#888",
                        marginBottom: "8px",
                      }}
                    >
                      <span>流水進度</span>
                      <span>
                        {c.wagering_completed.toFixed(2)} / {c.wagering_required.toFixed(2)} U
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        borderRadius: "6px",
                        height: "8px",
                        overflow: "hidden",
                        marginBottom: "6px",
                      }}
                    >
                      <div
                        style={{
                          width: `${progress}%`,
                          height: "100%",
                          background:
                            progress >= 100
                              ? "linear-gradient(90deg, #00FF88, #00CC66)"
                              : "linear-gradient(90deg, #FFD700, #FFA500)",
                          borderRadius: "6px",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "10px",
                      }}
                    >
                      <span style={{ color: progress >= 100 ? "#00FF88" : "#FFA500" }}>
                        {progress >= 100 ? "✅ 已解鎖" : `${progress.toFixed(1)}% 完成`}
                      </span>
                      {remaining > 0 && (
                        <span style={{ color: "#888" }}>還需 {remaining.toFixed(2)} U 流水</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Commission History */}
          {commissionHistory.length > 0 && (
            <div style={cardStyle}>
              <h3
                style={{
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#FFD700",
                  marginBottom: "12px",
                }}
              >
                📋 分潤記錄
              </h3>
              {commissionHistory.map((c, i) => {
                const friendName =
                  c.tg_first_name || c.tg_username || c.referred_username || `用戶 #${c.referred_id}`;
                const isPaid = c.status === "paid";
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "10px 0",
                      borderBottom:
                        i < commissionHistory.length - 1
                          ? "1px solid rgba(255,255,255,0.05)"
                          : "none",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "13px", color: "#fff", fontWeight: "500" }}>
                        {friendName}
                      </div>
                      <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>
                        消費點數 {c.deposit_amount.toFixed(2)} U · {c.deposit_date}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          fontSize: "14px",
                          fontWeight: "bold",
                          color: isPaid ? "#00FF88" : "#FFA500",
                        }}
                      >
                        +{c.commission_amount.toFixed(2)} U
                      </div>
                      <div
                        style={{
                          fontSize: "10px",
                          color: isPaid ? "#00FF88" : "#FFA500",
                          marginTop: "2px",
                        }}
                      >
                        {isPaid ? "✅ 已發放" : "⏳ 待發放"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : loading ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "40px" }}>
          <div style={{ color: "#888", fontSize: "14px" }}>載入中...</div>
        </div>
      ) : (
        <div style={{ ...cardStyle, textAlign: "center" }}>
          <p style={{ color: "#888" }}>登入後查看您的邀請碼</p>
          <a
            href="/login"
            style={{
              display: "inline-block",
              marginTop: "12px",
              padding: "10px 24px",
              background: "linear-gradient(135deg, #FFD700, #FFA500)",
              borderRadius: "10px",
              color: "#000",
              fontWeight: "bold",
              textDecoration: "none",
            }}
          >
            立即登入
          </a>
        </div>
      )}

      {/* How it works */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700", marginBottom: "12px" }}>
          📋 如何賺取分潤獎勵
        </h3>
        {[
          {
            step: "1",
            title: "複製您的專屬邀請碼",
            desc: "每位會員均有唯一邀請碼，自動生成無需申請",
          },
          {
            step: "2",
            title: "分享給好友",
            desc: "將邀請連結或 TG 連結發送給朋友",
          },
          {
            step: "3",
            title: "好友完成儲值",
            desc: "好友通過您的邀請碼註冊並儲值（消費點數）",
          },
          {
            step: "4",
            title: "次日自動發放分潤獎勵",
            desc: "系統每日 01:00 自動計算並發放 10% 分潤獎勵，無需申請",
          },
        ].map((item) => (
          <div
            key={item.step}
            style={{
              display: "flex",
              gap: "12px",
              marginBottom: "12px",
              alignItems: "flex-start",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #FFD700, #FFA500)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "13px",
                fontWeight: "bold",
                color: "#000",
              }}
            >
              {item.step}
            </div>
            <div>
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: "#fff",
                  marginBottom: "2px",
                }}
              >
                {item.title}
              </div>
              <div style={{ fontSize: "12px", color: "#888" }}>{item.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Rules */}
      <div style={cardStyle}>
        <h3 style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700", marginBottom: "12px" }}>
          📜 邀請規則
        </h3>
        {[
          "每位會員自動獲得唯一邀請碼，無需申請",
          "好友每次儲值（消費點數），邀請人獲得 10% 分潤獎勵",
          "分潤獎勵於次日 01:00 由系統自動發放，無需手動申請",
          "分潤獎勵帶 5 倍流水要求（例：獲得 10U → 需完成 50U 流水後方可提款）",
          "邀請人數無上限，長期有效",
          "禁止自我邀請、多帳號套利等違規行為",
          "違規帳號將被封禁並取消所有分潤獎勵",
          "LA1 保留本活動最終解釋權",
        ].map((rule, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: "8px",
              marginBottom: "8px",
              fontSize: "13px",
              color: "#aaa",
              lineHeight: "1.5",
            }}
          >
            <span style={{ color: "#FFD700", flexShrink: 0 }}>•</span>
            <span>{rule}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
