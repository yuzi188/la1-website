"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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
};

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
  const [tab, setTab] = useState("logs"); // logs | deposits | withdrawals
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

    // Fetch balance logs (full history)
    fetch(`${API}/api/user/balance-logs?limit=200`, {
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

  // Summary stats from balance_logs
  const totalIn = balanceLogs.filter(l => (l.amount || 0) > 0).reduce((s, l) => s + l.amount, 0);
  const totalOut = balanceLogs.filter(l => (l.amount || 0) < 0).reduce((s, l) => s + Math.abs(l.amount), 0);
  const depositTotal = transactions
    .filter((t) => t.type === "deposit" && (t.status === "done" || t.status === "approved"))
    .reduce((s, t) => s + (t.amount || 0), 0);
  const withdrawTotal = transactions
    .filter((t) => t.type === "withdrawal" && t.status === "approved")
    .reduce((s, t) => s + (t.amount || 0), 0);

  const TABS = [
    { key: "logs",        label: "💼 全部明細" },
    { key: "deposits",    label: "💰 充值記錄" },
    { key: "withdrawals", label: "📤 提款記錄" },
  ];

  const filteredTx = tab === "deposits"
    ? transactions.filter(t => t.type === "deposit")
    : transactions.filter(t => t.type === "withdrawal");

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
          📋 交易紀錄
        </h1>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" }}>
        <div style={{ background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>累計入帳</div>
          <div style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700" }}>+{totalIn.toFixed(2)} U</div>
        </div>
        <div style={{ background: "rgba(0,191,255,0.08)", border: "1px solid rgba(0,191,255,0.2)", borderRadius: "12px", padding: "12px", textAlign: "center" }}>
          <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>累計出帳</div>
          <div style={{ fontSize: "16px", fontWeight: "bold", color: "#00BFFF" }}>-{totalOut.toFixed(2)} U</div>
        </div>
      </div>

      {/* Tab Bar */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          marginBottom: "16px",
          background: "rgba(0,0,0,0.4)",
          borderRadius: "12px",
          padding: "4px",
          border: "1px solid rgba(255,215,0,0.1)",
        }}
      >
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              flex: 1,
              padding: "8px 4px",
              borderRadius: "10px",
              border: "none",
              cursor: "pointer",
              fontSize: "12px",
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
              前往登入
            </a>
          )}
        </div>
      )}

      {/* BALANCE LOGS TAB */}
      {!error && tab === "logs" && (
        logsLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#FFD700" }}>載入中...</div>
        ) : balanceLogs.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "60px 20px", color: "#555" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
            <div style={{ fontSize: "14px" }}>暫無交易明細</div>
          </div>
        ) : (
          <div style={cardStyle}>
            {balanceLogs.map((log, i) => {
              const typeInfo = getLogType(log.type);
              const amt = log.amount || 0;
              const absAmt = Math.abs(amt);
              const isPositive = amt >= 0;
              return (
                <div
                  key={log.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: i < balanceLogs.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
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
        )
      )}

      {/* DEPOSITS / WITHDRAWALS TAB */}
      {!error && (tab === "deposits" || tab === "withdrawals") && (
        loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#FFD700" }}>載入中...</div>
        ) : filteredTx.length === 0 ? (
          <div style={{ ...cardStyle, textAlign: "center", padding: "60px 20px", color: "#555" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>📭</div>
            <div style={{ fontSize: "14px" }}>暫無{tab === "deposits" ? "充值" : "提款"}紀錄</div>
          </div>
        ) : (
          <div style={cardStyle}>
            {/* Summary row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ background: "rgba(255,215,0,0.08)", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>充值總額</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#FFD700" }}>{depositTotal.toFixed(2)} U</div>
              </div>
              <div style={{ background: "rgba(0,191,255,0.08)", borderRadius: "10px", padding: "12px", textAlign: "center" }}>
                <div style={{ fontSize: "10px", color: "#888", marginBottom: "4px" }}>提款總額</div>
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
                        {isDeposit ? "充值" : "提款"}
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
    </div>
  );
}
