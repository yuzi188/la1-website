"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../i18n/LanguageContext";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "https://la1-backend-production.up.railway.app";
const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS || "TJExample1234567890TestAddress";

function openTG(url) {
  const tgApp = typeof window !== "undefined" && window.Telegram?.WebApp;
  if (tgApp && typeof tgApp.openTelegramLink === "function") {
    tgApp.openTelegramLink(url);
  } else if (tgApp && typeof tgApp.openLink === "function") {
    tgApp.openLink(url);
  } else {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

export default function DepositPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("usdt");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
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
            setUser(data.user);
            return;
          }
        } catch (e) {}
      }
      const stored = localStorage.getItem("la1_user");
      if (!stored) { router.push("/login"); return; }
      setUser(JSON.parse(stored));
    };
    init();
  }, [router]);

  const presets = [100, 300, 500, 1000, 3000, 5000];

  const methods = [
    { id: "usdt", icon: "💎", label: "USDT", sub: "TRC20 · 推薦", badge: "⭐ 最快" },
    { id: "bank", icon: "🏦", label: t("deposit.depositTab"), sub: t("deposit.notice3"), badge: "" },
    { id: "crypto", icon: "₿", label: "BTC / ETH", sub: "Crypto", badge: "" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!numAmt || numAmt < 30) {
      setErrorMsg("最低儲值金額為 30 USDT");
      return;
    }
    setErrorMsg("");
    setSubmitting(true);
    try {
      const token = localStorage.getItem("la1_token");
      const res = await fetch(`${API}/api/deposit-request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: numAmt }),
      });
      const data = await res.json();
      if (data.ok) {
        setOrderId(data.id);
        setSubmitted(true);
      } else {
        setErrorMsg(data.error || "提交失敗，請重試");
      }
    } catch (e) {
      setErrorMsg("網路錯誤，請重試");
    }
    setSubmitting(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(USDT_ADDRESS).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // fallback
      const el = document.createElement("textarea");
      el.value = USDT_ADDRESS;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#FFD700" }}>{t("common.loading")}</div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #050510 0%, #0a0a0a 100%)",
      fontFamily: "'Segoe UI', sans-serif",
      color: "#fff",
      maxWidth: 480,
      margin: "0 auto",
      paddingBottom: 100,
    }}>
      {/* Top Bar */}
      <div style={{
        background: "rgba(0,0,0,0.95)",
        borderBottom: "1px solid rgba(255,215,0,0.15)",
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <a href="/dashboard" style={{ color: "#FFD700", textDecoration: "none", fontSize: 20, lineHeight: 1 }}>‹</a>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{t("deposit.title")}</span>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#555" }}>
          {t("profile.balance")}：<span style={{ color: "#FFD700", fontWeight: 700 }}>$ {(user.balance || 0).toFixed(2)}</span>
        </div>
      </div>

      {submitted ? (
        /* ── ORDER CONFIRMED PAGE ── */
        <div style={{ padding: "24px 20px" }}>
          {/* Success header */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "linear-gradient(135deg, rgba(0,255,136,0.2), rgba(255,215,0,0.1))",
              border: "2px solid rgba(0,255,136,0.4)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 32, margin: "0 auto 14px",
              boxShadow: "0 0 30px rgba(0,255,136,0.15)",
            }}>✅</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#00FF88", marginBottom: 6 }}>儲值訂單已建立！</div>
            <div style={{ color: "#666", fontSize: 13 }}>
              訂單編號：<span style={{ color: "#FFD700", fontWeight: 700 }}>#{orderId}</span>
              &nbsp;·&nbsp;金額：<span style={{ color: "#fff", fontWeight: 700 }}>$ {Number(amount).toLocaleString()} USDT</span>
            </div>
          </div>

          {/* Step guide */}
          <div style={{
            background: "rgba(255,215,0,0.05)",
            border: "1px solid rgba(255,215,0,0.2)",
            borderRadius: 14,
            padding: "18px 16px",
            marginBottom: 20,
          }}>
            <div style={{ color: "#FFD700", fontWeight: 700, fontSize: 14, marginBottom: 14 }}>📋 完成儲值步驟</div>
            {[
              { step: "1", text: "複製下方 USDT TRC20 收款地址", color: "#FFD700" },
              { step: "2", text: `從您的錢包轉帳 ${Number(amount).toLocaleString()} USDT 到該地址`, color: "#00BFFF" },
              { step: "3", text: "轉帳後截圖或複製 TxID，點下方按鈕聯繫客服確認", color: "#00FF88" },
              { step: "4", text: "工作人員 5-15 分鐘內確認並上分，TG 通知到帳", color: "#FF9500" },
            ].map(({ step, text, color }) => (
              <div key={step} style={{ display: "flex", gap: 12, marginBottom: 10, alignItems: "flex-start" }}>
                <div style={{
                  minWidth: 24, height: 24, borderRadius: "50%",
                  background: color + "22", border: `1px solid ${color}55`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 11, fontWeight: 700, color,
                }}>{step}</div>
                <div style={{ color: "#bbb", fontSize: 13, lineHeight: 1.5, paddingTop: 3 }}>{text}</div>
              </div>
            ))}
          </div>

          {/* USDT Address */}
          <div style={{
            background: "rgba(0,191,255,0.05)",
            border: "1px solid rgba(0,191,255,0.2)",
            borderRadius: 14,
            padding: "16px",
            marginBottom: 20,
          }}>
            <div style={{ color: "#00BFFF", fontSize: 12, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>
              💎 USDT TRC20 收款地址
            </div>
            <div style={{
              background: "rgba(0,0,0,0.4)",
              borderRadius: 8,
              padding: "12px 14px",
              fontFamily: "monospace",
              fontSize: 12,
              color: "#fff",
              wordBreak: "break-all",
              letterSpacing: 0.5,
              marginBottom: 10,
              lineHeight: 1.6,
            }}>{USDT_ADDRESS}</div>
            <button onClick={copyAddress} style={{
              width: "100%",
              padding: "11px",
              background: copied ? "linear-gradient(135deg,#00FF88,#00AA55)" : "linear-gradient(135deg,#00BFFF,#0066AA)",
              border: "none",
              borderRadius: 8,
              color: "#000",
              fontWeight: 700,
              fontSize: 14,
              cursor: "pointer",
              transition: "all 0.2s",
            }}>
              {copied ? "✅ 已複製！" : "📋 複製地址"}
            </button>
            <div style={{ color: "#555", fontSize: 11, marginTop: 8, textAlign: "center" }}>
              ⚠️ 請確認使用 TRC20 網路轉帳，錯誤網路將導致資金損失
            </div>
          </div>

          {/* Contact CS button */}
          <button onClick={() => openTG("https://t.me/LA1111_bot")} style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            padding: "16px 24px",
            background: "linear-gradient(135deg, #FFD700, #1E90FF)",
            borderRadius: 14, color: "#000", fontWeight: 900, fontSize: 16,
            border: "none", cursor: "pointer", marginBottom: 12, width: "100%",
            boxShadow: "0 0 30px rgba(255,215,0,0.3)",
          }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
              <path d="M21 4L3 11.3l5.8 2.1L18 7.6l-6.9 6.1.1 5L14 15.8l3.1 2.3L21 4Z" fill="#000"/>
            </svg>
            轉帳後聯繫客服確認 @LA1111_bot
          </button>

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => router.push("/profile/transactions")} style={{
              flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, color: "#888", padding: "12px",
              cursor: "pointer", fontSize: 13,
            }}>📋 查看訂單記錄</button>
            <button onClick={() => { setSubmitted(false); setAmount(""); setOrderId(null); }} style={{
              flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10, color: "#888", padding: "12px",
              cursor: "pointer", fontSize: 13,
            }}>再次儲值</button>
          </div>
        </div>
      ) : (
        /* ── DEPOSIT FORM ── */
        <form onSubmit={handleSubmit} style={{ padding: "16px" }}>

          {/* Method Select */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 10, letterSpacing: 1 }}>{t("deposit.network")}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {methods.map((m) => (
                <button key={m.id} type="button" onClick={() => setMethod(m.id)} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 16px",
                  background: method === m.id
                    ? "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(30,144,255,0.06))"
                    : "rgba(255,255,255,0.03)",
                  border: method === m.id
                    ? "1px solid rgba(255,215,0,0.45)"
                    : "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 12, cursor: "pointer", textAlign: "left",
                }}>
                  <span style={{ fontSize: 26 }}>{m.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: method === m.id ? "#FFD700" : "#fff", fontWeight: 700, fontSize: 15 }}>{m.label}</span>
                      {m.badge && (
                        <span style={{
                          fontSize: 10, padding: "2px 7px",
                          background: "rgba(255,215,0,0.2)", borderRadius: 10, color: "#FFD700",
                        }}>{m.badge}</span>
                      )}
                    </div>
                    <div style={{ color: "#555", fontSize: 12, marginTop: 2 }}>{m.sub}</div>
                  </div>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    border: method === m.id ? "5px solid #FFD700" : "2px solid #333",
                    transition: "all 0.2s",
                  }} />
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, color: "#888", marginBottom: 10, letterSpacing: 1 }}>{t("deposit.amount")} (最低 $30)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 12 }}>
              {presets.map((p) => (
                <button key={p} type="button" onClick={() => setAmount(String(p))} style={{
                  padding: "10px 4px",
                  background: amount === String(p)
                    ? "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(30,144,255,0.1))"
                    : "rgba(255,255,255,0.04)",
                  border: amount === String(p)
                    ? "1px solid rgba(255,215,0,0.5)"
                    : "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10, cursor: "pointer",
                  color: amount === String(p) ? "#FFD700" : "#aaa",
                  fontWeight: 700, fontSize: 14,
                }}>$ {p.toLocaleString()}</button>
              ))}
            </div>
            <div style={{ position: "relative" }}>
              <span style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                color: "#FFD700", fontWeight: 700, fontSize: 18,
              }}>$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setErrorMsg(""); }}
                placeholder="輸入儲值金額"
                min="30"
                style={{
                  width: "100%",
                  padding: "14px 16px 14px 36px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,215,0,0.25)",
                  borderRadius: 10,
                  color: "#fff",
                  fontSize: 16,
                  fontWeight: 700,
                  outline: "none",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          {/* First deposit hint */}
          {Number(amount) >= 500 && (
            <div style={{
              background: "rgba(0,255,136,0.05)",
              border: "1px solid rgba(0,255,136,0.2)",
              borderRadius: 10,
              padding: "10px 14px",
              marginBottom: 16,
              fontSize: 12,
              color: "#00FF88",
            }}>
              🎁 首次儲值 ≥ 500 USDT 可獲得 <strong>33% 首充獎勵</strong>（+{Math.floor(Number(amount) * 0.33)} USDT）
            </div>
          )}

          {/* Info Card */}
          <div style={{
            background: "rgba(0,191,255,0.05)",
            border: "1px solid rgba(0,191,255,0.15)",
            borderRadius: 12,
            padding: "14px 16px",
            marginBottom: 20,
          }}>
            {[
              ["處理時間", "5-15 分鐘"],
              ["最低儲值", "$ 30 USDT"],
              ["支援網路", "TRC20"],
              ["確認方式", "人工審核"],
            ].map(([k, v]) => (
              <div key={k} style={{
                display: "flex", justifyContent: "space-between",
                padding: "6px 0",
                borderBottom: "1px solid rgba(255,255,255,0.04)",
              }}>
                <span style={{ color: "#666", fontSize: 13 }}>{k}</span>
                <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Error */}
          {errorMsg && (
            <div style={{
              background: "rgba(255,68,68,0.1)",
              border: "1px solid rgba(255,68,68,0.3)",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#FF4444",
              fontSize: 13,
              marginBottom: 14,
            }}>❌ {errorMsg}</div>
          )}

          {/* Submit */}
          <button type="submit" disabled={!amount || Number(amount) < 30 || submitting} style={{
            width: "100%",
            padding: "17px",
            background: (!amount || Number(amount) < 30)
              ? "rgba(255,215,0,0.2)"
              : "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #1E90FF 100%)",
            border: "none",
            borderRadius: 14,
            color: (!amount || Number(amount) < 30) ? "#666" : "#000",
            fontWeight: 900,
            fontSize: 17,
            cursor: (!amount || Number(amount) < 30 || submitting) ? "not-allowed" : "pointer",
            letterSpacing: 2,
            boxShadow: (!amount || Number(amount) < 30)
              ? "none"
              : "0 8px 30px rgba(255,215,0,0.25)",
            transition: "all 0.2s",
            boxSizing: "border-box",
          }}>
            {submitting ? "提交中..." : `確認儲值 ${amount && Number(amount) >= 30 ? `$ ${Number(amount).toLocaleString()}` : ""}`}
          </button>

          <div style={{ marginTop: 16, textAlign: "center" }}>
            <button type="button" onClick={() => openTG("https://t.me/LA1111_bot")}
              style={{ background: "none", border: "none", color: "#00BFFF", fontSize: 13, cursor: "pointer", padding: 0, textDecoration: "underline" }}>
              {t("deposit.contactTg")} @LA1111_bot
            </button>
          </div>
        </form>
      )}

      {/* Bottom Nav */}
      <div style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: 480,
        background: "rgba(5,5,16,0.97)",
        borderTop: "1px solid rgba(255,215,0,0.15)",
        display: "flex",
        zIndex: 200,
      }}>
        {[
          { icon: "🏠", label: t("bottomNav.home"), href: "/" },
          { icon: "🎮", label: t("nav.games"), href: "/#games" },
          { icon: "💰", label: t("bottomNav.deposit"), href: "/deposit", active: true },
          { icon: "👤", label: t("bottomNav.profile"), href: "/dashboard" },
          { icon: "💬", label: t("bottomNav.service"), href: "https://t.me/LA1111_bot", external: true },
        ].map((item) => (
          <a key={item.label}
            href={item.href}
            onClick={item.external ? (e) => {
              e.preventDefault();
              openTG(item.href);
            } : undefined}
            target={item.external ? "_blank" : "_self"}
            rel={item.external ? "noopener noreferrer" : undefined}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", padding: "10px 4px 12px",
              textDecoration: "none", gap: 3,
            }}>
            <span style={{ fontSize: item.active ? 22 : 18 }}>{item.icon}</span>
            <span style={{ fontSize: 10, color: item.active ? "#FFD700" : "#555", fontWeight: item.active ? 700 : 400 }}>{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
