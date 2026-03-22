"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../../i18n/LanguageContext";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "https://la1-backend-production.up.railway.app";

const STATUS_MAP = {
  done: { label: "成功", color: "#4CAF50" },
  waiting: { label: "等待中", color: "#FFA500" },
  pending: { label: "審核中", color: "#FFA500" },
  approved: { label: "已批准", color: "#4CAF50" },
  rejected: { label: "已拒絕", color: "#FF4444" },
  failed: { label: "失敗", color: "#FF4444" },
};

// Balance log type → Chinese label + color + icon
const LOG_TYPE_MAP = {
  deposit:           { label: "儲值確認",   color: "#FFD700", icon: "💰", sign: "+" },
  withdrawal:        { label: "提款",       color: "#00BFFF", icon: "📤", sign: "-" },
  admin_add:         { label: "管理員上分", color: "#00FF88", icon: "⬆️", sign: "+" },
  admin_deduct:      { label: "管理員扣分", color: "#FF4444", icon: "⬇️", sign: "-" },
  checkin:           { label: "簽到獎勵",   color: "#FFD700", icon: "✅", sign: "+" },
  bonus:             { label: "活動獎勵",   color: "#FF8800", icon: "🎁", sign: "+" },
  referral:          { label: "推薦獎勵",   color: "#00BFFF", icon: "🤝", sign: "+" },
  agent_commission:  { label: "代理分潤",   color: "#00FF88", icon: "🏦", sign: "+" },
  rebate:            { label: "返水獎勵",   color: "#FF8800", icon: "💎", sign: "+" },
  first_deposit:     { label: "首充獎勵",   color: "#FFD700", icon: "🎉", sign: "+" },
  add:               { label: "管理員上分", color: "#00FF88", icon: "⬆️", sign: "+" },
  deduct:            { label: "管理員扣分", color: "#FF4444", icon: "⬇️", sign: "-" },
  bet:               { label: "下注",       color: "#FF6600", icon: "🎰", sign: "-" },
  win:               { label: "中獎",       color: "#00FF88", icon: "🏆", sign: "+" },
  lose:              { label: "未中獎",     color: "#FF4444", icon: "❌", sign: "-" },
  weekend_rebate:    { label: "週末返水",   color: "#FF8800", icon: "🎊", sign: "+" },
};

// ── Type grouping for new tabs ──────────────────────────────────────────────
const BET_TYPES = ["bet", "win", "lose"];
const PROMO_TYPES = ["bonus", "first_deposit", "checkin", "referral", "agent_commission"];
const REBATE_TYPES = ["rebate", "weekend_rebate"];

function getLogType(type) {
  return LOG_TYPE_MAP[type] || { label: type || "其他", color: "#888", icon: "📋", sign: "" };
}

function formatDate(str) {
  if (!str) return "—";
  const d = new Date(str);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function TransactionsPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [tab, setTab] = useState("logs"); // logs | deposits | withdrawals | bets | promos | rebates
  const [transactions, setTransactions] = useState([]);
  const [balanceLogs, setBalanceLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("la1_token") : null;
    if (!token) {
      setLoading(false);
      setLogsLoading(false);
      setError("請先登入");
      return;
    }

    // Fetch deposit/withdrawal transactions
    fetch(`${API}/api/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setTransactions(data);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });

    // Fetch balance logs (full history) — used for all tabs
    fetch(`${API}/api/user/balance-logs?limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && Array.isArray(data.data)) setBalanceLogs(data.data);
        setLogsLoading(false);
      })
      .catch(() => { setLogsLoading(false); });
  }, []);

  const cardStyle = {
    background: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,215,0,0.2)",
    borderRadius: "16px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 0 15px rgba(0,191,255,0.06)",
  };

  // ── Summary stats ─────────────────────────────────────────────────────────
  const totalIn = balanceLogs.filter(l => (l.amount || 0) > 0).reduce((s, l) => s + l.amount, 0);
  const totalOut = balanceLogs.filter(l => (l.amount || 0) < 0).reduce((s, l) => s + Math.abs(l.amount), 0);
  const depositTotal = transactions
    .filter((t) => t.type === "deposit" && (t.status === "done" || t.status === "approved"))
    .reduce((s, t) => s + (t.amount || 0), 0);
  const withdrawTotal = transactions
    .filter((t) => t.type === "withdrawal" && t.status === "approved")
    .reduce((s, t) => s + (t.amount || 0), 0);

  // ── Filtered data for new tabs ────────────────────────────────────────────
  const betLogs = balanceLogs.filter(l => BET_TYPES.includes(l.type));
  const promoLogs = balanceLogs.filter(l => PROMO_TYPES.includes(l.type));
  const rebateLogs = balanceLogs.filter(l => REBATE_TYPES.includes(l.type));

  // Bet summary
  const totalBetAmount = betLogs.filter(l => l.type === "bet").reduce((s, l) => s + Math.abs(l.amount || 0), 0);
  const totalWinAmount = betLogs.filter(l => l.type === "win").reduce((s, l) => s + (l.amount || 0), 0);
  const betPnl = totalWinAmount - totalBetAmount;

  // Promo summary
  const totalPromo = promoLogs.reduce((s, l) => s + (l.amount || 0), 0);
  const promoCount = promoLogs.length;

  // Rebate summary
  const totalRebate = rebateLogs.reduce((s, l) => s + (l.amount || 0), 0);
  const rebateCount = rebateLogs.length;

  // ── Tab definitions ───────────────────────────────────────────────────────
  const TABS = [
    { key: "logs",        label: t("transactions.allLogs", "💼 全部明細") },
    { key: "deposits",    label: t("transactions.deposits", "💰 充值記錄") },
    { key: "withdrawals", label: t("transactions.withdrawals", "📤 提款記錄") },
    { key: "bets",        label: t("transactions.bets", "🎰 下注紀錄") },
    { key: "promos",      label: t("transactions.promos", "🎁 優惠紀錄") },
    { key: "rebates",     label: t("transactions.rebates", "💎 返水") },
  ];

  const filteredTx = tab === "deposits"
    ? transactions.filter(t => t.type === "deposit")
    : transactions.filter(t => t.type === "withdrawal");

  // ── Render a balance-log list (shared by multiple tabs) ───────────────────
  function renderLogList(logs, emptyText) {
    if (logsLoading) {
      return <div style={{ textAlign: "center", padding: "60px 0", color: "#FFD700" }}>{t("common.loading", "載入中...")}</div>;
    }
    if (logs.length === 0) {
      return (
        <div style={{ ...cardStyle, textAlign: "center", padding: "60px 20px", color: "#555" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
          <div style={{ fontSize: "14px" }}>{emptyText}</div>
        </div>
      );
    }
    return (
      <div style={cardStyle}>
        {logs.map((log, i) => {
          const typeInfo = getLogType(log.type);
          const amt = log.amount || 0;
          const absAmt = Math.abs(amt);
          const isPositive = amt >= 0;
          return (
            <div
              key={log.id || i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "12px 0",
                borderBottom: i < logs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
              }}
            >
              {/* Left */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "18px",
                  background: isPositive ? "rgba(255,215,0,0.10)" : "rgba(255,68,68,0.10)",
                  border: `1px solid ${isPositive ? "rgba(255,215,0,0.25)" : "rgba(255,68,68,0.25)"}`,
                  flexShrink: 0,
                }}>
                  {typeInfo.icon}
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff", marginBottom: "2px" }}>
                    {typeInfo.label}
                  </div>
                  {log.reason && (
                    <div style={{ fontSize: "11px", color: "#888", marginBottom: "2px", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {log.reason}
                    </div>
                  )}
                  <div style={{ fontSize: "11px", color: "#555" }}>{formatDate(log.created_at)}</div>
                </div>
              </div>
              {/* Right */}
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "15px", fontWeight: "bold", color: isPositive ? "#FFD700" : "#FF4444" }}>
                  {isPositive ? "+" : "-"}{absAmt.toFixed(2)} U
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

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
          ← {t("common.back", "返回")}
        </button>
        <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#FFD700" }}>
          📋 {t("profile.transactionHistory", "交易紀錄")}
        </h1>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
        <div style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>{t("transactions.totalIn", "累計入帳")}</div>
          <div style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700" }}>+{totalIn.toFixed(2)} U</div>
        </div>
        <div style={{ background: "rgba(0,191,255,0.08)", border: "1px solid rgba(0,191,255,0.2)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>{t("transactions.totalOut", "累計出帳")}</div>
          <div style={{ fontSize: "16px", fontWeight: "bold", color: "#00BFFF" }}>-{totalOut.toFixed(2)} U</div>
        </div>
      </div>

      {/* Tab Bar — scrollable for 6 tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "16px",
          background: "rgba(0,0,0,0.4)",
          borderRadius: "12px",
          padding: "4px",
          border: "1px solid rgba(255,215,0,0.1)",
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: "0 0 auto",
              padding: "8px 10px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "bold",
              background: tab === t.key
                ? "linear-gradient(135deg, #FFD700, #D4AF37)"
                : "transparent",
              color: tab === t.key ? "#000" : "#888",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div style={{ ...cardStyle, textAlign: "center", padding: "40px 20px", color: "#FF6347" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>⚠️</div>
          <div>{error}</div>
          {error === "請先登入" && (
            <a href="/login" style={{ display: "inline-block", marginTop: "16px", padding: "10px 24px", background: "linear-gradient(135deg, #FFD700, #FFA500)", borderRadius: "10px", color: "#000", fontWeight: "bold", textDecoration: "none" }}>
              {t("login.loginBtn", "前往登入")}
            </a>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         BALANCE LOGS TAB (全部明細)
         ══════════════════════════════════════════════════════════════════════ */}
      {!error && tab === "logs" && renderLogList(balanceLogs, t("transactions.emptyLogs", "暫無交易明細"))}

      {/* ══════════════════════════════════════════════════════════════════════
         DEPOSITS / WITHDRAWALS TAB (充值/提款記錄)
         ══════════════════════════════════════════════════════════════════════ */}
      {!error && (tab === "deposits" || tab === "withdrawals") && (
        loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#FFD700" }}>{t("common.loading", "載入中...")}</div>
        ) : filteredTx.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "60px 20px", color: "#555" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
            <div style={{ fontSize: "14px" }}>
              {tab === "deposits" ? t("transactions.emptyDeposits", "暫無充值紀錄") : t("transactions.emptyWithdrawals", "暫無提款紀錄")}
            </div>
          </div>
        ) : (
          <div style={cardStyle}>
            {/* Summary row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ background: "rgba(255,215,0,0.08)", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>{t("transactions.depositTotal", "充值總額")}</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700" }}>{depositTotal.toFixed(2)} U</div>
              </div>
              <div style={{ background: "rgba(0,191,255,0.08)", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>{t("transactions.withdrawTotal", "提款總額")}</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#00BFFF" }}>{withdrawTotal.toFixed(2)} U</div>
              </div>
            </div>

            {filteredTx.map((tx, i) => {
              const isDeposit = tx.type === "deposit";
              const statusInfo = STATUS_MAP[tx.status] || { label: tx.status, color: "#888" };
              return (
                <div
                  key={`${tx.type}-${tx.id}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: i < filteredTx.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "50%",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "18px",
                      background: isDeposit ? "rgba(255,215,0,0.12)" : "rgba(0,191,255,0.12)",
                      border: isDeposit ? "1px solid rgba(255,215,0,0.25)" : "1px solid rgba(0,191,255,0.25)",
                      flexShrink: 0,
                    }}>
                      {isDeposit ? "💰" : "📤"}
                    </div>
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff", marginBottom: "2px" }}>
                        {isDeposit ? t("transactions.depositLabel", "充值") : t("transactions.withdrawLabel", "提款")}
                      </div>
                      <div style={{ fontSize: "11px", color: "#555" }}>{formatDate(tx.created_at)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: "15px", fontWeight: "bold", color: isDeposit ? "#FFD700" : "#00BFFF", marginBottom: "2px" }}>
                      {isDeposit ? "+" : "-"}{(tx.amount || 0).toFixed(2)} U
                    </div>
                    <div style={{ fontSize: "11px", color: statusInfo.color, fontWeight: "bold" }}>
                      {statusInfo.label}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         BETS TAB (下注紀錄)
         ══════════════════════════════════════════════════════════════════════ */}
      {!error && tab === "bets" && (
        <>
          {/* Bet Summary Cards */}
          {!logsLoading && betLogs.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
              <div style={{ background: "rgba(255,102,0,0.08)", border: "1px solid rgba(255,102,0,0.2)", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>{t("transactions.totalBet", "累計下注")}</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#FF6600" }}>{totalBetAmount.toFixed(2)} U</div>
              </div>
              <div style={{ background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>{t("transactions.totalWin", "累計中獎")}</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: "#00FF88" }}>{totalWinAmount.toFixed(2)} U</div>
              </div>
              <div style={{ background: betPnl >= 0 ? "rgba(0,255,136,0.08)" : "rgba(255,68,68,0.08)", border: `1px solid ${betPnl >= 0 ? "rgba(0,255,136,0.2)" : "rgba(255,68,68,0.2)"}`, borderRadius: "12px", padding: "10px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>{t("transactions.betPnl", "盈虧")}</div>
                <div style={{ fontSize: "14px", fontWeight: "bold", color: betPnl >= 0 ? "#00FF88" : "#FF4444" }}>
                  {betPnl >= 0 ? "+" : ""}{betPnl.toFixed(2)} U
                </div>
              </div>
            </div>
          )}
          {renderLogList(betLogs, t("transactions.emptyBets", "暫無下注紀錄"))}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         PROMOS TAB (優惠紀錄)
         ══════════════════════════════════════════════════════════════════════ */}
      {!error && tab === "promos" && (
        <>
          {/* Promo Summary Cards */}
          {!logsLoading && promoLogs.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: "rgba(255,136,0,0.08)", border: "1px solid rgba(255,136,0,0.2)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>{t("transactions.promoCount", "優惠次數")}</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#FF8800" }}>{promoCount} {t("transactions.times", "次")}</div>
              </div>
              <div style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>{t("transactions.promoTotal", "累計優惠")}</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700" }}>+{totalPromo.toFixed(2)} U</div>
              </div>
            </div>
          )}
          {renderLogList(promoLogs, t("transactions.emptyPromos", "暫無優惠紀錄"))}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
         REBATES TAB (返水)
         ══════════════════════════════════════════════════════════════════════ */}
      {!error && tab === "rebates" && (
        <>
          {/* Rebate Summary Cards */}
          {!logsLoading && rebateLogs.length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
              <div style={{ background: "rgba(255,136,0,0.08)", border: "1px solid rgba(255,136,0,0.2)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>{t("transactions.rebateCount", "返水次數")}</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#FF8800" }}>{rebateCount} {t("transactions.times", "次")}</div>
              </div>
              <div style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>{t("transactions.rebateTotal", "累計返水")}</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700" }}>+{totalRebate.toFixed(2)} U</div>
              </div>
            </div>
          )}
          {renderLogList(rebateLogs, t("transactions.emptyRebates", "暫無返水紀錄"))}
        </>
      )}

      {/* Hide scrollbar for tab bar */}
      <style jsx>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
