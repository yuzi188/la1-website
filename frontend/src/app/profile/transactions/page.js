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
  const [betPeriod, setBetPeriod] = useState("today"); // today | week | lastWeek

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

  // ── Bet records grouped by game + date ────────────────────────────────────
  function getDateRange(period) {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}-${String(now.getDate()).padStart(2,"0")}`;
    if (period === "today") return { start: todayStr, end: todayStr };
    const day = now.getDay() || 7; // Mon=1 ... Sun=7
    if (period === "week") {
      const mon = new Date(now); mon.setDate(now.getDate() - day + 1);
      const monStr = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,"0")}-${String(mon.getDate()).padStart(2,"0")}`;
      return { start: monStr, end: todayStr };
    }
    // lastWeek
    const lastMon = new Date(now); lastMon.setDate(now.getDate() - day - 6);
    const lastSun = new Date(now); lastSun.setDate(now.getDate() - day);
    const lmStr = `${lastMon.getFullYear()}-${String(lastMon.getMonth()+1).padStart(2,"0")}-${String(lastMon.getDate()).padStart(2,"0")}`;
    const lsStr = `${lastSun.getFullYear()}-${String(lastSun.getMonth()+1).padStart(2,"0")}-${String(lastSun.getDate()).padStart(2,"0")}`;
    return { start: lmStr, end: lsStr };
  }

  function extractGameCategory(reason) {
    if (!reason) return "其他";
    const known = ["21點","百家樂","老虎機","輪盤","捕魚","真人百家樂","骰寶","龍虎","德州撲克",
      "ATG電子","RSG電子","PG電子","JDB電子","CQ9","PP真人","EVO真人","SA真人","JILI捕魚",
      "熊貓體育","體育","電競","彩票","棋牌"];
    for (const g of known) { if (reason.includes(g)) return g; }
    // Try to extract first Chinese/English word before common suffixes
    const m = reason.match(/^([\u4e00-\u9fff\w]+?)(?:下注|bet|win|lose|中獎|未中獎|\s)/i);
    if (m) return m[1];
    return "其他";
  }

  function getBetGroupedData() {
    const { start, end } = getDateRange(betPeriod);
    const filtered = betLogs.filter(l => {
      if (!l.created_at) return false;
      const d = l.created_at.slice(0, 10);
      return d >= start && d <= end;
    });
    // Group by gameCategory + date
    const groups = {};
    filtered.forEach(l => {
      const cat = extractGameCategory(l.reason);
      const date = (l.created_at || "").slice(0, 10);
      const key = `${cat}||${date}`;
      if (!groups[key]) groups[key] = { category: cat, date, totalBet: 0, result: 0 };
      if (l.type === "bet") groups[key].totalBet += Math.abs(l.amount || 0);
      else groups[key].result += (l.amount || 0); // win adds, lose subtracts
    });
    // Sort by date desc, then category
    const rows = Object.values(groups).sort((a, b) => b.date.localeCompare(a.date) || a.category.localeCompare(b.category));
    const pageTotal = rows.reduce((s, r) => s + r.result, 0);
    return { rows, pageTotal };
  }

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
         BETS TAB (下注紀錄) — 按遊戲館+日期匯總表格
         ══════════════════════════════════════════════════════════════════════ */}
      {!error && tab === "bets" && (() => {
        const { rows: betRows, pageTotal } = getBetGroupedData();
        return (
          <>
            {/* Time period filter */}
            <div style={{ display: "flex", gap: "0", marginBottom: "16px", borderRadius: "10px", overflow: "hidden", border: "1px solid rgba(255,215,0,0.2)" }}>
              {[
                { key: "today", label: t("transactions.betToday", "今日") },
                { key: "week", label: t("transactions.betWeek", "本週") },
                { key: "lastWeek", label: t("transactions.betLastWeek", "上週") },
              ].map((p, idx) => (
                <button
                  key={p.key}
                  onClick={() => setBetPeriod(p.key)}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    border: "none",
                    borderRight: idx < 2 ? "1px solid rgba(255,215,0,0.15)" : "none",
                    cursor: "pointer",
                    fontSize: "13px",
                    fontWeight: betPeriod === p.key ? "700" : "400",
                    background: betPeriod === p.key ? "linear-gradient(135deg, #00BFFF, #0088CC)" : "rgba(0,0,0,0.4)",
                    color: betPeriod === p.key ? "#fff" : "#888",
                    transition: "all 0.2s",
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Table */}
            {logsLoading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#FFD700" }}>{t("common.loading", "載入中...")}</div>
            ) : betRows.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: "center", padding: "60px 20px", color: "#555" }}>
                <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
                <div style={{ fontSize: "14px" }}>{t("transactions.emptyBets", "暫無下注紀錄")}</div>
              </div>
            ) : (
              <div style={{ ...cardStyle, padding: "0", overflow: "hidden" }}>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ background: "linear-gradient(135deg, #1a3a5c, #0d2240)" }}>
                        <th style={{ padding: "12px 10px", color: "#00BFFF", fontWeight: "600", textAlign: "left", whiteSpace: "nowrap", fontSize: "12px" }}>{t("transactions.betGameCat", "遊戲分類")}</th>
                        <th style={{ padding: "12px 10px", color: "#00BFFF", fontWeight: "600", textAlign: "center", whiteSpace: "nowrap", fontSize: "12px" }}>{t("transactions.betDate", "日期")}</th>
                        <th style={{ padding: "12px 10px", color: "#00BFFF", fontWeight: "600", textAlign: "right", whiteSpace: "nowrap", fontSize: "12px" }}>{t("transactions.betValidBet", "有效下注")}</th>
                        <th style={{ padding: "12px 10px", color: "#00BFFF", fontWeight: "600", textAlign: "right", whiteSpace: "nowrap", fontSize: "12px" }}>{t("transactions.betResult", "結果")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {betRows.map((row, i) => (
                        <tr key={`${row.category}-${row.date}`} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)", background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
                          <td style={{ padding: "11px 10px", color: "#ddd", whiteSpace: "nowrap" }}>{row.category}</td>
                          <td style={{ padding: "11px 10px", color: "#aaa", textAlign: "center", whiteSpace: "nowrap" }}>{row.date}</td>
                          <td style={{ padding: "11px 10px", color: "#FFD700", textAlign: "right", whiteSpace: "nowrap", fontWeight: "500" }}>{row.totalBet.toFixed(2)}</td>
                          <td style={{ padding: "11px 10px", textAlign: "right", whiteSpace: "nowrap", fontWeight: "700", color: row.result > 0 ? "#00FF88" : row.result < 0 ? "#FF4444" : "#888" }}>
                            {row.result > 0 ? "+" : ""}{row.result.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {/* Page Total */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 14px", borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.3)" }}>
                  <span style={{ color: "#aaa", fontSize: "13px", fontWeight: "600" }}>{t("transactions.betPageTotal", "本頁總計")}</span>
                  <span style={{ fontSize: "15px", fontWeight: "700", color: pageTotal > 0 ? "#00FF88" : pageTotal < 0 ? "#FF4444" : "#888" }}>
                    {pageTotal > 0 ? "+" : ""}{pageTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </>
        );
      })()}

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
