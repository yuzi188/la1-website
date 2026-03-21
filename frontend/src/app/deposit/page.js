"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

/* ═══════════════════════════════════════════════════════════════════════════
   DEPOSIT TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function DepositTab({ user, t }) {
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("usdt");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);

  const presets = [100, 300, 500, 1000, 3000, 5000];
  const methods = [
    { id: "usdt", icon: "💎", label: "USDT", sub: "TRC20 · 推薦", badge: "⭐ 最快" },
    { id: "bank", icon: "🏦", label: t("deposit.depositTab"), sub: t("deposit.notice3"), badge: "" },
    { id: "crypto", icon: "₿", label: "BTC / ETH", sub: "Crypto", badge: "" },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const numAmt = Number(amount);
    if (!numAmt || numAmt < 30) { setErrorMsg("最低儲值金額為 30 USDT"); return; }
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
      if (data.ok) { setOrderId(data.id); setSubmitted(true); }
      else { setErrorMsg(data.error || "提交失敗，請重試"); }
    } catch (e) { setErrorMsg("網路錯誤，請重試"); }
    setSubmitting(false);
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(USDT_ADDRESS).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      const el = document.createElement("textarea");
      el.value = USDT_ADDRESS;
      document.body.appendChild(el); el.select(); document.execCommand("copy"); document.body.removeChild(el);
      setCopied(true); setTimeout(() => setCopied(false), 2500);
    });
  };

  if (submitted) return (
    <div style={{ padding: "24px 20px" }}>
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

      <div style={{
        background: "rgba(255,215,0,0.05)", border: "1px solid rgba(255,215,0,0.2)",
        borderRadius: 14, padding: "18px 16px", marginBottom: 20,
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

      <div style={{
        background: "rgba(0,191,255,0.05)", border: "1px solid rgba(0,191,255,0.2)",
        borderRadius: 14, padding: "16px", marginBottom: 20,
      }}>
        <div style={{ color: "#00BFFF", fontSize: 12, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>
          💎 USDT TRC20 收款地址
        </div>
        <div style={{
          background: "rgba(0,0,0,0.4)", borderRadius: 8, padding: "12px 14px",
          fontFamily: "monospace", fontSize: 12, color: "#fff",
          wordBreak: "break-all", letterSpacing: 0.5, marginBottom: 10, lineHeight: 1.6,
        }}>{USDT_ADDRESS}</div>
        <button onClick={copyAddress} style={{
          width: "100%", padding: "11px",
          background: copied ? "linear-gradient(135deg,#00FF88,#00AA55)" : "linear-gradient(135deg,#00BFFF,#0066AA)",
          border: "none", borderRadius: 8, color: "#000", fontWeight: 700, fontSize: 14,
          cursor: "pointer", transition: "all 0.2s",
        }}>
          {copied ? "✅ 已複製！" : "📋 複製地址"}
        </button>
        <div style={{ color: "#555", fontSize: 11, marginTop: 8, textAlign: "center" }}>
          ⚠️ 請確認使用 TRC20 網路轉帳，錯誤網路將導致資金損失
        </div>
      </div>

      <button onClick={() => openTG("https://t.me/LA1111_bot")} style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        padding: "16px 24px",
        background: "linear-gradient(135deg, #FFD700, #1E90FF)",
        borderRadius: 14, color: "#000", fontWeight: 900, fontSize: 16,
        border: "none", cursor: "pointer", marginBottom: 12, width: "100%",
        boxShadow: "0 0 30px rgba(255,215,0,0.3)",
      }}>
        轉帳後聯繫客服確認 @LA1111_bot
      </button>

      <div style={{ display: "flex", gap: 10 }}>
        <button onClick={() => router.push("/profile/transactions")} style={{
          flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, color: "#888", padding: "12px", cursor: "pointer", fontSize: 13,
        }}>📋 查看訂單記錄</button>
        <button onClick={() => { setSubmitted(false); setAmount(""); setErrorMsg(""); }} style={{
          flex: 1, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 10, color: "#888", padding: "12px", cursor: "pointer", fontSize: 13,
        }}>再次儲值</button>
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ padding: "16px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 13, color: "#888", marginBottom: 10, letterSpacing: 1 }}>{t("deposit.network")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {methods.map((m) => (
            <button key={m.id} type="button" onClick={() => setMethod(m.id)} style={{
              display: "flex", alignItems: "center", gap: 14, padding: "14px 16px",
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
            type="number" value={amount}
            onChange={(e) => { setAmount(e.target.value); setErrorMsg(""); }}
            placeholder="輸入儲值金額" min="30"
            style={{
              width: "100%", padding: "14px 16px 14px 36px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,215,0,0.25)", borderRadius: 10,
              color: "#fff", fontSize: 16, fontWeight: 700, outline: "none",
              boxSizing: "border-box", fontFamily: "inherit",
            }}
          />
        </div>
      </div>

      {Number(amount) >= 500 && (
        <div style={{
          background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.2)",
          borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#00FF88",
        }}>
          🎁 首次儲值 ≥ 500 USDT 可獲得 <strong>33% 首充獎勵</strong>（+{Math.floor(Number(amount) * 0.33)} USDT）
        </div>
      )}

      <div style={{
        background: "rgba(0,191,255,0.05)", border: "1px solid rgba(0,191,255,0.15)",
        borderRadius: 12, padding: "14px 16px", marginBottom: 20,
      }}>
        {[
          ["處理時間", "5-15 分鐘"], ["最低儲值", "$ 30 USDT"],
          ["支援網路", "TRC20"], ["確認方式", "人工審核"],
        ].map(([k, v]) => (
          <div key={k} style={{
            display: "flex", justifyContent: "space-between", padding: "6px 0",
            borderBottom: "1px solid rgba(255,255,255,0.04)",
          }}>
            <span style={{ color: "#666", fontSize: 13 }}>{k}</span>
            <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{v}</span>
          </div>
        ))}
      </div>

      {errorMsg && (
        <div style={{
          background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)",
          borderRadius: 8, padding: "10px 14px", color: "#FF4444", fontSize: 13, marginBottom: 14,
        }}>❌ {errorMsg}</div>
      )}

      <button type="submit" disabled={!amount || Number(amount) < 30 || submitting} style={{
        width: "100%", padding: "17px",
        background: (!amount || Number(amount) < 30)
          ? "rgba(255,215,0,0.2)"
          : "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #1E90FF 100%)",
        border: "none", borderRadius: 14,
        color: (!amount || Number(amount) < 30) ? "#666" : "#000",
        fontWeight: 900, fontSize: 17,
        cursor: (!amount || Number(amount) < 30 || submitting) ? "not-allowed" : "pointer",
        letterSpacing: 2,
        boxShadow: (!amount || Number(amount) < 30) ? "none" : "0 8px 30px rgba(255,215,0,0.25)",
        transition: "all 0.2s", boxSizing: "border-box",
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
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WITHDRAWAL TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function WithdrawalTab({ user }) {
  const [subTab, setSubTab] = useState("apply"); // apply | history | bind
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Bind wallet state
  const [bindNetwork, setBindNetwork] = useState("TRC20");
  const [bindAddress, setBindAddress] = useState("");
  const [bindError, setBindError] = useState("");
  const [bindLoading, setBindLoading] = useState(false);

  // Withdrawal apply state
  const [amount, setAmount] = useState("");
  const [network, setNetwork] = useState("TRC20");
  const [applyError, setApplyError] = useState("");
  const [applyLoading, setApplyLoading] = useState(false);

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("la1_token") : null;

  useEffect(() => {
    if (token) fetchInfo();
  }, [token]);

  useEffect(() => {
    if (token && subTab === "history") fetchHistory();
  }, [subTab, token]);

  const fetchInfo = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API}/api/withdrawal/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.ok) { setInfo(data); setError(""); }
      else { setError(data.error || "查詢失敗"); }
    } catch (e) { setError("網路錯誤"); }
    finally { setLoading(false); }
  };

  const fetchHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch(`${API}/withdraw/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (Array.isArray(data)) { setHistory(data); }
      else if (data.history) { setHistory(data.history); }
    } catch (e) { console.error("Failed to fetch history:", e); }
    finally { setHistoryLoading(false); }
  };

  const handleBindWallet = async (e) => {
    e.preventDefault();
    if (!bindAddress.trim()) { setBindError("請輸入USDT地址"); return; }
    try {
      setBindLoading(true); setBindError("");
      const res = await fetch(`${API}/api/withdrawal/bind-wallet`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ network: bindNetwork, usdt_address: bindAddress.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess(`${bindNetwork} 地址已永久綁定！`);
        setBindAddress("");
        setTimeout(() => { setSubTab("apply"); fetchInfo(); setSuccess(""); }, 1500);
      } else { setBindError(data.error || "綁定失敗"); }
    } catch (e) { setBindError("網路錯誤"); }
    finally { setBindLoading(false); }
  };

  const handleApplyWithdraw = async (e) => {
    e.preventDefault();
    if (!amount || parseFloat(amount) <= 0) { setApplyError("請輸入提款金額"); return; }
    try {
      setApplyLoading(true); setApplyError("");
      const res = await fetch(`${API}/api/withdrawal/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount: parseFloat(amount), network }),
      });
      const data = await res.json();
      if (data.ok) {
        setSuccess("提款申請已提交，請等待審核！");
        setAmount("");
        setTimeout(() => { fetchInfo(); setSuccess(""); }, 2000);
      } else {
        setApplyError(data.error || "申請失敗");
        if (data.error && data.error.includes("綁定")) setSubTab("bind");
      }
    } catch (e) { setApplyError("網路錯誤"); }
    finally { setApplyLoading(false); }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending:   { text: "待審核", bg: "rgba(255,215,0,0.15)", color: "#FFD700" },
      approved:  { text: "已批准", bg: "rgba(0,191,255,0.15)", color: "#00BFFF" },
      completed: { text: "已完成", bg: "rgba(0,255,136,0.15)", color: "#00FF88" },
      rejected:  { text: "已拒絕", bg: "rgba(255,68,68,0.15)", color: "#FF4444" },
    };
    const b = map[status] || map.pending;
    return (
      <span style={{
        fontSize: 11, padding: "3px 8px", borderRadius: 6,
        background: b.bg, color: b.color, fontWeight: 700,
      }}>{b.text}</span>
    );
  };

  if (!token) return (
    <div style={{ padding: 40, textAlign: "center", color: "#666" }}>請先登入後使用提款功能</div>
  );

  return (
    <div style={{ padding: "16px" }}>
      {/* Success / Error alerts */}
      {success && (
        <div style={{
          background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.3)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 16,
          color: "#00FF88", fontSize: 13, fontWeight: 700, textAlign: "center",
        }}>✅ {success}</div>
      )}
      {error && (
        <div style={{
          background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)",
          borderRadius: 10, padding: "12px 16px", marginBottom: 16,
          color: "#FF4444", fontSize: 13, fontWeight: 700, textAlign: "center",
        }}>❌ {error}</div>
      )}

      {/* Sub-tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {[
          { key: "apply", label: "📤 申請提款" },
          { key: "history", label: "📋 記錄" },
          { key: "bind", label: "🔗 綁定地址" },
        ].map((item) => (
          <button key={item.key} onClick={() => setSubTab(item.key)} style={{
            flex: 1, padding: "10px 4px", fontSize: 12, fontWeight: 700,
            background: subTab === item.key ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.03)",
            border: subTab === item.key ? "1px solid rgba(255,215,0,0.4)" : "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10, cursor: "pointer",
            color: subTab === item.key ? "#FFD700" : "#888",
          }}>{item.label}</button>
        ))}
      </div>

      {/* ── APPLY SUB-TAB ── */}
      {subTab === "apply" && (
        loading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#666" }}>載入中...</div>
        ) : info ? (
          <div>
            {/* Info cards */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              {[
                { label: "可用餘額", value: `$${(info.balance || 0).toFixed(2)}`, color: "#00FF88" },
                { label: "今日剩餘次數", value: `${info.daily_remaining_count}`, color: "#00BFFF" },
                { label: "今日剩餘額度", value: `$${(info.daily_remaining_amount || 0).toFixed(2)}`, color: "#9B59B6" },
                { label: "流水要求", value: (info.wager_requirement || 0) <= 0 ? "✅ 達標" : `差 $${(info.wager_requirement || 0).toFixed(2)}`, color: (info.wager_requirement || 0) <= 0 ? "#00FF88" : "#FFD700" },
              ].map((card, i) => (
                <div key={i} style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 12, padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>{card.label}</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>

            {/* Cooling warning */}
            {info.is_cooling && (
              <div style={{
                background: "rgba(255,165,0,0.1)", border: "1px solid rgba(255,165,0,0.3)",
                borderRadius: 10, padding: "12px 16px", marginBottom: 16, fontSize: 12,
              }}>
                <span style={{ color: "#FFA500", fontWeight: 700 }}>⏳ 新帳號冷卻期</span>
                <div style={{ color: "#999", marginTop: 4 }}>
                  您的帳號需在 {new Date(info.cooldown_end).toLocaleString()} 後才能提款
                </div>
              </div>
            )}

            {/* Bound wallet display */}
            {info.wallets && info.wallets.length > 0 && (
              <div style={{
                background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.2)",
                borderRadius: 10, padding: "12px 14px", marginBottom: 16,
              }}>
                <div style={{ fontSize: 12, color: "#00FF88", fontWeight: 700, marginBottom: 6 }}>💾 已綁定地址</div>
                {info.wallets.map((w) => (
                  <div key={w.network} style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>
                    <span style={{ color: "#00BFFF", fontWeight: 600 }}>{w.network}</span>：
                    <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{w.usdt_address}</span>
                  </div>
                ))}
              </div>
            )}

            {/* No wallet bound → prompt to bind */}
            {(!info.wallets || info.wallets.length === 0) && (
              <div style={{
                background: "rgba(255,165,0,0.08)", border: "1px solid rgba(255,165,0,0.25)",
                borderRadius: 10, padding: "14px 16px", marginBottom: 16, textAlign: "center",
              }}>
                <div style={{ fontSize: 13, color: "#FFA500", fontWeight: 700, marginBottom: 8 }}>⚠️ 尚未綁定提款地址</div>
                <button onClick={() => setSubTab("bind")} style={{
                  background: "linear-gradient(135deg, #FFA500, #FF8C00)",
                  border: "none", borderRadius: 10, padding: "10px 24px",
                  color: "#000", fontWeight: 800, fontSize: 13, cursor: "pointer",
                }}>前往綁定 →</button>
              </div>
            )}

            {/* Apply form */}
            {info.wallets && info.wallets.length > 0 && (
              <form onSubmit={handleApplyWithdraw}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>提款網路</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["TRC20", "ERC20"].map((n) => {
                      const hasBound = info.wallets.some((w) => w.network === n);
                      return (
                        <button key={n} type="button"
                          onClick={() => hasBound && setNetwork(n)}
                          disabled={!hasBound}
                          style={{
                            flex: 1, padding: "10px", fontSize: 13, fontWeight: 700,
                            background: network === n ? "rgba(255,215,0,0.12)" : "rgba(255,255,255,0.03)",
                            border: network === n ? "1px solid rgba(255,215,0,0.4)" : "1px solid rgba(255,255,255,0.08)",
                            borderRadius: 10, cursor: hasBound ? "pointer" : "not-allowed",
                            color: network === n ? "#FFD700" : hasBound ? "#aaa" : "#444",
                            opacity: hasBound ? 1 : 0.5,
                          }}>
                          {n} {!hasBound && "(未綁定)"}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>
                    提款金額 (USDT) · 範圍 ${info.limits?.min} - ${Math.min(info.limits?.max_single || 20000, info.daily_remaining_amount || 50000).toFixed(0)}
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 8 }}>
                    {[50, 100, 500, 1000].map((p) => (
                      <button key={p} type="button" onClick={() => setAmount(String(p))} style={{
                        padding: "8px 4px", fontSize: 12, fontWeight: 700,
                        background: amount === String(p) ? "rgba(0,191,255,0.15)" : "rgba(255,255,255,0.04)",
                        border: amount === String(p) ? "1px solid rgba(0,191,255,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 8, cursor: "pointer",
                        color: amount === String(p) ? "#00BFFF" : "#aaa",
                      }}>${p}</button>
                    ))}
                  </div>
                  <input
                    type="number" value={amount}
                    onChange={(e) => { setAmount(e.target.value); setApplyError(""); }}
                    placeholder={`最低 ${info.limits?.min || 10} USDT`}
                    min={info.limits?.min || 10}
                    max={Math.min(info.limits?.max_single || 20000, info.daily_remaining_amount || 50000)}
                    style={{
                      width: "100%", padding: "14px 16px",
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(0,191,255,0.25)", borderRadius: 10,
                      color: "#fff", fontSize: 16, fontWeight: 700, outline: "none",
                      boxSizing: "border-box", fontFamily: "inherit",
                    }}
                  />
                </div>

                {applyError && (
                  <div style={{
                    background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)",
                    borderRadius: 8, padding: "10px 14px", color: "#FF4444", fontSize: 13, marginBottom: 12,
                  }}>❌ {applyError}</div>
                )}

                <button type="submit" disabled={applyLoading || info.is_cooling || !amount} style={{
                  width: "100%", padding: "16px",
                  background: (applyLoading || info.is_cooling || !amount)
                    ? "rgba(0,191,255,0.2)"
                    : "linear-gradient(135deg, #00BFFF, #0088CC)",
                  border: "none", borderRadius: 14,
                  color: (applyLoading || info.is_cooling || !amount) ? "#666" : "#fff",
                  fontWeight: 900, fontSize: 16,
                  cursor: (applyLoading || info.is_cooling || !amount) ? "not-allowed" : "pointer",
                  boxSizing: "border-box",
                  boxShadow: (applyLoading || info.is_cooling || !amount) ? "none" : "0 8px 30px rgba(0,191,255,0.2)",
                }}>
                  {applyLoading ? "處理中..." : "提交提款申請"}
                </button>

                {/* SOP */}
                <div style={{
                  marginTop: 16, background: "rgba(255,255,255,0.02)",
                  border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "12px 14px",
                }}>
                  <div style={{ fontSize: 12, color: "#FFD700", fontWeight: 700, marginBottom: 8 }}>📋 提款須知</div>
                  {[
                    "最低提款 10 USDT，每日最多 3 次",
                    "需完成流水要求後方可提款",
                    "提款審核時間約 5-30 分鐘",
                    "USDT 地址綁定後無法更改",
                  ].map((rule, i) => (
                    <div key={i} style={{ fontSize: 11, color: "#666", marginBottom: 3, paddingLeft: 8 }}>· {rule}</div>
                  ))}
                </div>
              </form>
            )}
          </div>
        ) : null
      )}

      {/* ── HISTORY SUB-TAB ── */}
      {subTab === "history" && (
        historyLoading ? (
          <div style={{ textAlign: "center", padding: 40, color: "#666" }}>載入中...</div>
        ) : history.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {history.map((item) => (
              <div key={item.id} style={{
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 12, padding: "14px 16px",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>
                    ${(item.amount || 0).toFixed(2)} USDT
                  </span>
                  {getStatusBadge(item.status)}
                </div>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>
                  {item.network || "TRC20"} · {item.wallet_address ? item.wallet_address.slice(0, 10) + "..." + item.wallet_address.slice(-6) : ""}
                </div>
                <div style={{ fontSize: 10, color: "#555" }}>
                  {new Date(item.created_at).toLocaleString()}
                </div>
                {item.reject_reason && (
                  <div style={{ fontSize: 11, color: "#FF4444", marginTop: 4 }}>拒絕原因：{item.reject_reason}</div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: 40, color: "#666" }}>暫無提款記錄</div>
        )
      )}

      {/* ── BIND SUB-TAB ── */}
      {subTab === "bind" && (
        <div>
          {/* Warning */}
          <div style={{
            background: "rgba(255,68,68,0.08)", border: "1px solid rgba(255,68,68,0.25)",
            borderRadius: 10, padding: "14px 16px", marginBottom: 16,
          }}>
            <div style={{ fontSize: 13, color: "#FF4444", fontWeight: 700, marginBottom: 6 }}>⚠️ 重要提示</div>
            <div style={{ fontSize: 12, color: "#999", lineHeight: 1.6 }}>
              USDT 地址綁定後<strong style={{ color: "#FF4444" }}>無法更改或解綁</strong>，請務必確認地址正確無誤後再綁定。
              綁定錯誤地址將導致提款資金丟失，平台不承擔責任。
            </div>
          </div>

          {/* Already bound wallets */}
          {info?.wallets && info.wallets.length > 0 && (
            <div style={{
              background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.2)",
              borderRadius: 10, padding: "12px 14px", marginBottom: 16,
            }}>
              <div style={{ fontSize: 12, color: "#00FF88", fontWeight: 700, marginBottom: 6 }}>✅ 已綁定的地址</div>
              {info.wallets.map((w) => (
                <div key={w.network} style={{ fontSize: 11, color: "#999", marginBottom: 4 }}>
                  <span style={{ color: "#00BFFF", fontWeight: 600 }}>{w.network}</span>：
                  <span style={{ fontFamily: "monospace", wordBreak: "break-all" }}>{w.usdt_address}</span>
                </div>
              ))}
            </div>
          )}

          {/* Bind form */}
          <form onSubmit={handleBindWallet}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>選擇網路</div>
              <div style={{ display: "flex", gap: 8 }}>
                {["TRC20", "ERC20"].map((n) => {
                  const alreadyBound = info?.wallets?.some((w) => w.network === n);
                  return (
                    <button key={n} type="button"
                      onClick={() => !alreadyBound && setBindNetwork(n)}
                      disabled={alreadyBound}
                      style={{
                        flex: 1, padding: "10px", fontSize: 13, fontWeight: 700,
                        background: bindNetwork === n ? "rgba(255,165,0,0.12)" : "rgba(255,255,255,0.03)",
                        border: bindNetwork === n ? "1px solid rgba(255,165,0,0.4)" : "1px solid rgba(255,255,255,0.08)",
                        borderRadius: 10,
                        cursor: alreadyBound ? "not-allowed" : "pointer",
                        color: alreadyBound ? "#444" : bindNetwork === n ? "#FFA500" : "#aaa",
                        opacity: alreadyBound ? 0.5 : 1,
                      }}>
                      {n} {alreadyBound && "✅"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>USDT 錢包地址</div>
              <input
                type="text" value={bindAddress}
                onChange={(e) => { setBindAddress(e.target.value); setBindError(""); }}
                placeholder={bindNetwork === "TRC20" ? "T開頭，34位字元" : "0x開頭，42位字元"}
                style={{
                  width: "100%", padding: "14px 16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,165,0,0.25)", borderRadius: 10,
                  color: "#fff", fontSize: 14, outline: "none",
                  boxSizing: "border-box", fontFamily: "monospace",
                }}
              />
            </div>

            {bindError && (
              <div style={{
                background: "rgba(255,68,68,0.1)", border: "1px solid rgba(255,68,68,0.3)",
                borderRadius: 8, padding: "10px 14px", color: "#FF4444", fontSize: 13, marginBottom: 12,
              }}>❌ {bindError}</div>
            )}

            <button type="submit"
              disabled={bindLoading || info?.wallets?.some((w) => w.network === bindNetwork)}
              style={{
                width: "100%", padding: "16px",
                background: (bindLoading || info?.wallets?.some((w) => w.network === bindNetwork))
                  ? "rgba(255,165,0,0.2)"
                  : "linear-gradient(135deg, #FFA500, #FF8C00)",
                border: "none", borderRadius: 14,
                color: (bindLoading || info?.wallets?.some((w) => w.network === bindNetwork)) ? "#666" : "#000",
                fontWeight: 900, fontSize: 16,
                cursor: (bindLoading || info?.wallets?.some((w) => w.network === bindNetwork)) ? "not-allowed" : "pointer",
                boxSizing: "border-box",
              }}>
              {bindLoading ? "綁定中..." : "永久綁定此地址"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE (with Suspense wrapper for useSearchParams)
   ═══════════════════════════════════════════════════════════════════════════ */
function DepositPageContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "withdraw" ? "withdraw" : "deposit";
  const [mainTab, setMainTab] = useState(initialTab);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      const tg = typeof window !== "undefined" && window.Telegram?.WebApp;
      if (tg && tg.initData && tg.initData.length > 0) {
        tg.ready(); tg.expand();
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
        display: "flex", alignItems: "center", gap: 12,
        position: "sticky", top: 0, zIndex: 100,
      }}>
        <a href="/dashboard" style={{ color: "#FFD700", textDecoration: "none", fontSize: 20, lineHeight: 1 }}>‹</a>
        <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>
          {mainTab === "deposit" ? t("deposit.title") : "💸 提款"}
        </span>
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#555" }}>
          {t("profile.balance")}：<span style={{ color: "#FFD700", fontWeight: 700 }}>$ {(user.balance || 0).toFixed(2)}</span>
        </div>
      </div>

      {/* Main Tab Switcher: 儲值 / 提款 */}
      <div style={{
        display: "flex", margin: "16px 16px 0",
        background: "rgba(255,255,255,0.03)",
        borderRadius: 14, padding: 4,
        border: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button onClick={() => setMainTab("deposit")} style={{
          flex: 1, padding: "12px 0", fontSize: 15, fontWeight: 800,
          background: mainTab === "deposit"
            ? "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(255,165,0,0.1))"
            : "transparent",
          border: "none", borderRadius: 12, cursor: "pointer",
          color: mainTab === "deposit" ? "#FFD700" : "#666",
          transition: "all 0.2s",
        }}>
          💰 儲值
        </button>
        <button onClick={() => setMainTab("withdraw")} style={{
          flex: 1, padding: "12px 0", fontSize: 15, fontWeight: 800,
          background: mainTab === "withdraw"
            ? "linear-gradient(135deg, rgba(0,191,255,0.2), rgba(0,136,204,0.1))"
            : "transparent",
          border: "none", borderRadius: 12, cursor: "pointer",
          color: mainTab === "withdraw" ? "#00BFFF" : "#666",
          transition: "all 0.2s",
        }}>
          📤 提款
        </button>
      </div>

      {/* Tab Content */}
      {mainTab === "deposit" ? (
        <DepositTab user={user} t={t} />
      ) : (
        <WithdrawalTab user={user} />
      )}

      {/* Bottom Nav */}
      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        width: "100%", maxWidth: 480,
        background: "rgba(5,5,16,0.97)",
        borderTop: "1px solid rgba(255,215,0,0.15)",
        display: "flex", zIndex: 200,
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
            onClick={item.external ? (e) => { e.preventDefault(); openTG(item.href); } : undefined}
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

export default function DepositPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFD700" }}>
        載入中...
      </div>
    }>
      <DepositPageContent />
    </Suspense>
  );
}
