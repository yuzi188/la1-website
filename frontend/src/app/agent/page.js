"use client";
import { useState, useEffect, useRef } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://la1-backend-production.up.railway.app";

/* ═══════════════════════════════════════════════════════════════════════════
   REUSABLE UI COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function StatCard({ title, value, sub, color = "#FFD700", icon }) {
  return (
    <div style={{
      background: "linear-gradient(135deg, #0d0d0d, #1a1a1a)",
      border: `1px solid ${color}44`,
      borderRadius: 12,
      padding: "16px 18px",
      minWidth: 130,
      flex: 1,
    }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ color: "#888", fontSize: 11, marginBottom: 6 }}>{title}</div>
      <div style={{ color, fontSize: 22, fontWeight: 700, fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ color: "#555", fontSize: 11, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function StatusBadge({ text }) {
  const map = {
    "已發放": "#00FF88",
    "審核中": "#FFD700",
    "已拒絕": "#FF4444",
    "有效": "#00FF88",
    "待驗證": "#FF8800",
    "已結算": "#00FF88",
    "進行中": "#FF8800",
  };
  const c = map[text] || "#888";
  return (
    <span style={{
      background: c + "22",
      color: c,
      border: `1px solid ${c}55`,
      borderRadius: 4,
      padding: "2px 9px",
      fontSize: 11,
      fontWeight: 600,
      whiteSpace: "nowrap",
    }}>{text}</span>
  );
}

function DataTable({ cols, rows, emptyText = "暫無數據" }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #FFD70033" }}>
            {cols.map(c => (
              <th key={c.key} style={{
                padding: "10px 10px",
                color: "#FFD700",
                fontWeight: 600,
                textAlign: "left",
                whiteSpace: "nowrap",
                fontSize: 11,
              }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={cols.length} style={{ textAlign: "center", color: "#555", padding: 30 }}>{emptyText}</td></tr>
            : rows.map((row, ri) => (
              <tr key={ri} style={{
                borderBottom: "1px solid #ffffff06",
                background: ri % 2 === 0 ? "transparent" : "#ffffff03",
              }}>
                {cols.map(c => (
                  <td key={c.key} style={{ padding: "8px 10px", color: "#ccc", whiteSpace: "nowrap" }}>
                    {c.render ? c.render(row) : (row[c.key] ?? "—")}
                  </td>
                ))}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

function SectionCard({ title, children, accent = "#FFD700" }) {
  return (
    <div style={{
      background: "#0d0d0d",
      border: `1px solid ${accent}22`,
      borderRadius: 12,
      padding: 16,
      marginBottom: 14,
    }}>
      <div style={{ color: accent, fontWeight: 600, marginBottom: 12, fontSize: 13 }}>{title}</div>
      {children}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function AgentPage() {
  const [authed, setAuthed] = useState(false);
  const [token, setToken] = useState("");
  const [agentInfo, setAgentInfo] = useState(null);

  // Login state
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  // Tab
  const [tab, setTab] = useState("overview");

  // Data state
  const [dashboard, setDashboard] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Copy toast
  const [copyMsg, setCopyMsg] = useState("");

  // ── Restore session ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem("la1_agent_token");
      const savedInfo = localStorage.getItem("la1_agent_info");
      if (saved && savedInfo) {
        setToken(saved);
        setAgentInfo(JSON.parse(savedInfo));
        setAuthed(true);
      }
    } catch {}
  }, []);

  // ── Fetch data after login ──
  useEffect(() => {
    if (!authed || !token) return;
    fetchAll();
  }, [authed, token]);

  const fetchAll = async () => {
    setDataLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [dashRes, refRes, comRes] = await Promise.all([
        fetch(`${BACKEND}/agent/dashboard`, { headers }),
        fetch(`${BACKEND}/agent/referrals`, { headers }),
        fetch(`${BACKEND}/agent/commissions`, { headers }),
      ]);
      const dashData = await dashRes.json().catch(() => ({}));
      const refData = await refRes.json().catch(() => []);
      const comData = await comRes.json().catch(() => []);

      if (dashData && !dashData.error) setDashboard(dashData);
      if (Array.isArray(refData)) setReferrals(refData);
      if (Array.isArray(comData)) setCommissions(comData);
    } catch {}
    setDataLoading(false);
  };

  // ── Login ──
  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setLoginErr("請輸入帳號和密碼");
      return;
    }
    setLoginErr("");
    setLoginLoading(true);
    try {
      const r = await fetch(`${BACKEND}/agent/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const d = await r.json();
      if (d.token) {
        setToken(d.token);
        const info = d.agent || d.user || { username: username.trim() };
        setAgentInfo(info);
        try {
          localStorage.setItem("la1_agent_token", d.token);
          localStorage.setItem("la1_agent_info", JSON.stringify(info));
        } catch {}
        setAuthed(true);
        setLoginLoading(false);
        return;
      }
      setLoginErr(d.error || d.message || "帳號或密碼錯誤");
    } catch {
      setLoginErr("登入失敗，請檢查網絡連接");
    }
    setLoginLoading(false);
  };

  // ── Logout ──
  const handleLogout = () => {
    try {
      localStorage.removeItem("la1_agent_token");
      localStorage.removeItem("la1_agent_info");
    } catch {}
    setAuthed(false);
    setToken("");
    setAgentInfo(null);
    setDashboard(null);
    setReferrals([]);
    setCommissions([]);
    setTab("overview");
  };

  // ── Copy helper ──
  const copyText = (text) => {
    try {
      navigator.clipboard.writeText(text).then(() => {
        setCopyMsg("已複製！");
        setTimeout(() => setCopyMsg(""), 2000);
      });
    } catch {
      setCopyMsg("複製失敗");
      setTimeout(() => setCopyMsg(""), 2000);
    }
  };

  // ── Derived values ──
  const inviteCode = agentInfo?.invite_code || agentInfo?.inviteCode || agentInfo?.code || agentInfo?.username || "—";
  const inviteLink = inviteCode !== "—"
    ? `https://t.me/LA1111_bot?start=${inviteCode}`
    : "—";

  const totalCommission = dashboard?.total_commission ?? dashboard?.totalCommission ?? 0;
  const monthCommission = dashboard?.month_commission ?? dashboard?.monthCommission ?? 0;
  const commissionRate = dashboard?.commission_rate ?? dashboard?.commissionRate ?? dashboard?.rate ?? "—";
  const activeReferrals = dashboard?.active_referrals ?? dashboard?.activeReferrals ?? referrals.filter(r => r.status === "有效" || r.status === "active").length;

  /* ─────────────────────────────────────────────────────────────────────────
     LOGIN SCREEN
     ───────────────────────────────────────────────────────────────────────── */
  if (!authed) return (
    <div style={{
      minHeight: "100vh",
      background: "#000",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "sans-serif",
      padding: 16,
    }}>
      <div style={{
        background: "linear-gradient(135deg, #0d0d0d, #1a1a1a)",
        border: "1px solid #FFD70066",
        borderRadius: 16,
        padding: "36px 32px",
        width: "100%",
        maxWidth: 360,
        textAlign: "center",
        boxShadow: "0 0 40px rgba(255,215,0,0.08)",
      }}>
        {/* Logo */}
        <div style={{ fontSize: 52, marginBottom: 8 }}>🐼</div>
        <div style={{ color: "#FFD700", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>
          LA1 合作夥伴中心
        </div>
        <div style={{ color: "#555", fontSize: 12, marginBottom: 28 }}>
          Partner Center v1.0
        </div>

        {/* Fields */}
        <input
          type="text"
          placeholder="代理帳號"
          value={username}
          onChange={e => setUsername(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "#111",
            border: "1px solid #FFD70044",
            borderRadius: 8,
            color: "#fff",
            fontSize: 15,
            marginBottom: 12,
            boxSizing: "border-box",
            outline: "none",
          }}
        />
        <input
          type="password"
          placeholder="代理密碼"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{
            width: "100%",
            padding: "12px 16px",
            background: "#111",
            border: "1px solid #FFD70044",
            borderRadius: 8,
            color: "#fff",
            fontSize: 15,
            marginBottom: 14,
            boxSizing: "border-box",
            outline: "none",
          }}
        />

        {loginErr && (
          <div style={{
            background: "#FF444411",
            border: "1px solid #FF444444",
            borderRadius: 8,
            color: "#FF4444",
            fontSize: 13,
            padding: "8px 12px",
            marginBottom: 14,
          }}>{loginErr}</div>
        )}

        <button
          onClick={handleLogin}
          disabled={loginLoading}
          style={{
            width: "100%",
            padding: 13,
            background: loginLoading
              ? "#555"
              : "linear-gradient(135deg, #FFD700, #B8860B)",
            border: "none",
            borderRadius: 8,
            color: "#000",
            fontWeight: 700,
            fontSize: 16,
            cursor: loginLoading ? "not-allowed" : "pointer",
            transition: "opacity 0.2s",
          }}
        >
          {loginLoading ? "登入中..." : "登入合作夥伴中心"}
        </button>

        <div style={{ color: "#333", fontSize: 11, marginTop: 20 }}>
          LA1 AI Entertainment © 2026
        </div>
      </div>
    </div>
  );

  /* ─────────────────────────────────────────────────────────────────────────
     DASHBOARD
     ───────────────────────────────────────────────────────────────────────── */
  const TABS = [
    { id: "overview",    label: "📊 數據總覽" },
    { id: "referrals",   label: "👥 下線列表" },
    { id: "commissions", label: "💰 分潤明細" },
    { id: "invite",      label: "🔗 推薦連結" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "sans-serif" }}>

      {/* ── Header ── */}
      <div style={{
        background: "#0a0a0a",
        borderBottom: "1px solid #FFD70033",
        padding: "12px 20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 8,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 26 }}>🐼</span>
          <div>
            <div style={{ color: "#FFD700", fontWeight: 700, fontSize: 15 }}>LA1 合作夥伴中心</div>
            <div style={{ color: "#555", fontSize: 10 }}>Partner Center v1.0</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{
            background: "#FFD70011",
            border: "1px solid #FFD70033",
            borderRadius: 6,
            padding: "3px 10px",
            color: "#FFD700",
            fontSize: 11,
          }}>
            👤 {agentInfo?.username || agentInfo?.name || "合作夥伴"}
          </span>
          <span style={{
            background: "#00FF8822",
            border: "1px solid #00FF8855",
            borderRadius: 6,
            padding: "3px 10px",
            color: "#00FF88",
            fontSize: 11,
          }}>● 已連線</span>
          <button
            onClick={() => { fetchAll(); }}
            style={{
              background: "transparent",
              border: "1px solid #FFD70044",
              borderRadius: 6,
              color: "#FFD700",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: 11,
            }}
          >🔄 刷新</button>
          <button
            onClick={handleLogout}
            style={{
              background: "transparent",
              border: "1px solid #FF444455",
              borderRadius: 6,
              color: "#FF4444",
              padding: "4px 10px",
              cursor: "pointer",
              fontSize: 11,
            }}
          >登出</button>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div style={{
        background: "#050505",
        borderBottom: "1px solid #FFD70022",
        padding: "0 16px",
        display: "flex",
        overflowX: "auto",
        gap: 0,
      }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              background: tab === t.id ? "#FFD70011" : "transparent",
              border: "none",
              borderBottom: tab === t.id ? "2px solid #FFD700" : "2px solid transparent",
              color: tab === t.id ? "#FFD700" : "#555",
              padding: "13px 16px",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: tab === t.id ? 700 : 400,
              whiteSpace: "nowrap",
            }}
          >{t.label}</button>
        ))}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>

        {dataLoading && (
          <div style={{
            textAlign: "center",
            color: "#FFD700",
            padding: 20,
            fontSize: 13,
          }}>⏳ 載入數據中...</div>
        )}

        {/* ════════════════════════════════════════
            TAB 1: 數據總覽 (Overview)
            ════════════════════════════════════════ */}
        {tab === "overview" && (
          <>
            <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
              📊 數據總覽
            </div>

            {/* Stat Cards */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
              gap: 10,
              marginBottom: 16,
            }}>
              <StatCard
                title="總分潤獎勵"
                value={`$${Number(totalCommission).toLocaleString()}`}
                sub="累計至今"
                icon="💎"
                color="#FFD700"
              />
              <StatCard
                title="本月分潤"
                value={`$${Number(monthCommission).toLocaleString()}`}
                sub="本月累計"
                icon="📅"
                color="#00FF88"
              />
              <StatCard
                title="當前分潤比例"
                value={commissionRate !== "—" ? `${commissionRate}%` : "—"}
                sub="消費點數分潤"
                icon="📈"
                color="#00BFFF"
              />
              <StatCard
                title="有效下線人數"
                value={Number(activeReferrals).toLocaleString()}
                sub="已驗證會員"
                icon="👥"
                color="#FF8800"
              />
            </div>

            {/* Summary panel */}
            <SectionCard title="📋 帳戶摘要">
              {[
                ["合作夥伴帳號", agentInfo?.username || "—"],
                ["推薦碼", inviteCode],
                ["帳戶等級", agentInfo?.level || agentInfo?.tier || "標準合作夥伴"],
                ["下線總人數", referrals.length || (dashboard?.total_referrals ?? dashboard?.totalReferrals ?? 0)],
                ["待審核分潤", `$${Number(dashboard?.pending_commission ?? dashboard?.pendingCommission ?? 0).toLocaleString()}`],
                ["最後更新", new Date().toLocaleString("zh-TW")],
              ].map(([label, val]) => (
                <div key={label} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid #ffffff06",
                }}>
                  <span style={{ color: "#777", fontSize: 13 }}>{label}</span>
                  <span style={{ color: "#FFD700", fontWeight: 600, fontSize: 13, fontFamily: "monospace" }}>{val}</span>
                </div>
              ))}
            </SectionCard>

            {/* How commission works */}
            <SectionCard title="💡 分潤說明">
              <div style={{ color: "#888", fontSize: 12, lineHeight: 1.8 }}>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: "#FFD700", fontWeight: 600 }}>分潤計算方式：</span>
                  您的下線會員每次消費點數，系統自動依照您的分潤比例計算獎勵。
                </div>
                <div style={{ marginBottom: 8 }}>
                  <span style={{ color: "#00FF88", fontWeight: 600 }}>發放時間：</span>
                  每月結算一次，審核通過後自動發放至您的帳戶。
                </div>
                <div>
                  <span style={{ color: "#00BFFF", fontWeight: 600 }}>注意事項：</span>
                  禁止對打、刷分等異常行為，違規將取消分潤資格。
                </div>
              </div>
            </SectionCard>
          </>
        )}

        {/* ════════════════════════════════════════
            TAB 2: 下線列表 (Referrals)
            ════════════════════════════════════════ */}
        {tab === "referrals" && (
          <>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 8,
            }}>
              <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700 }}>
                👥 下線列表
              </div>
              <span style={{
                background: "#FFD70011",
                border: "1px solid #FFD70033",
                borderRadius: 8,
                padding: "6px 12px",
                color: "#FFD700",
                fontSize: 12,
              }}>
                共 {referrals.length} 位推薦會員
              </span>
            </div>

            <SectionCard title="📋 推薦會員列表">
              <DataTable
                cols={[
                  { key: "id", label: "用戶ID", render: r => r.id || r.user_id || r.userId || "—" },
                  { key: "username", label: "用戶名稱", render: r => r.username || r.name || r.tgName || "—" },
                  { key: "created_at", label: "註冊時間", render: r => (r.created_at || r.regDate || r.joinDate || "").slice(0, 10) || "—" },
                  { key: "total_bet", label: "消費點數", render: r => {
                    const v = r.total_bet ?? r.totalBet ?? r.bet ?? r.consumption ?? 0;
                    return <span style={{ color: "#FFD700", fontFamily: "monospace" }}>${Number(v).toLocaleString()}</span>;
                  }},
                  { key: "status", label: "狀態", render: r => {
                    const s = r.status === "active" ? "有效"
                            : r.status === "pending" ? "待驗證"
                            : r.status || "有效";
                    return <StatusBadge text={s} />;
                  }},
                ]}
                rows={referrals}
                emptyText="暫無下線會員，分享您的推薦連結開始邀請！"
              />
            </SectionCard>

            {referrals.length === 0 && !dataLoading && (
              <div style={{
                textAlign: "center",
                padding: "30px 20px",
                color: "#555",
                fontSize: 13,
              }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🤝</div>
                <div style={{ color: "#888", marginBottom: 8 }}>您目前還沒有下線會員</div>
                <div style={{ color: "#555", fontSize: 12 }}>前往「推薦連結」分頁，複製您的專屬連結並分享給好友</div>
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════
            TAB 3: 分潤明細 (Commission History)
            ════════════════════════════════════════ */}
        {tab === "commissions" && (
          <>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 14,
              flexWrap: "wrap",
              gap: 8,
            }}>
              <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700 }}>
                💰 分潤明細
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <span style={{
                  background: "#00FF8811",
                  border: "1px solid #00FF8833",
                  borderRadius: 8,
                  padding: "5px 10px",
                  color: "#00FF88",
                  fontSize: 11,
                }}>已發放 ${Number(
                  commissions.filter(c => c.status === "已發放" || c.status === "paid")
                    .reduce((s, c) => s + Number(c.commission_amount ?? c.commissionAmount ?? c.amount ?? 0), 0)
                ).toLocaleString()}</span>
                <span style={{
                  background: "#FFD70011",
                  border: "1px solid #FFD70033",
                  borderRadius: 8,
                  padding: "5px 10px",
                  color: "#FFD700",
                  fontSize: 11,
                }}>審核中 ${Number(
                  commissions.filter(c => c.status === "審核中" || c.status === "pending")
                    .reduce((s, c) => s + Number(c.commission_amount ?? c.commissionAmount ?? c.amount ?? 0), 0)
                ).toLocaleString()}</span>
              </div>
            </div>

            <SectionCard title="📋 分潤發放記錄">
              <DataTable
                cols={[
                  { key: "date", label: "日期", render: r => (r.date || r.period || r.created_at || "").slice(0, 10) || "—" },
                  { key: "total_bet", label: "消費點數總額", render: r => {
                    const v = r.total_bet ?? r.totalBet ?? r.bet_amount ?? r.betAmount ?? 0;
                    return <span style={{ fontFamily: "monospace" }}>${Number(v).toLocaleString()}</span>;
                  }},
                  { key: "rate", label: "分潤比例", render: r => {
                    const v = r.rate ?? r.commission_rate ?? r.commissionRate ?? "—";
                    return <span style={{ color: "#00BFFF" }}>{v !== "—" ? `${v}%` : "—"}</span>;
                  }},
                  { key: "commission_amount", label: "分潤獎勵", render: r => {
                    const v = r.commission_amount ?? r.commissionAmount ?? r.amount ?? 0;
                    return <span style={{ color: "#00FF88", fontWeight: 700, fontFamily: "monospace" }}>+${Number(v).toLocaleString()}</span>;
                  }},
                  { key: "status", label: "狀態", render: r => {
                    const s = r.status === "paid" ? "已發放"
                            : r.status === "pending" ? "審核中"
                            : r.status === "rejected" ? "已拒絕"
                            : r.status || "審核中";
                    return <StatusBadge text={s} />;
                  }},
                ]}
                rows={commissions}
                emptyText="暫無分潤記錄"
              />
            </SectionCard>

            {commissions.length === 0 && !dataLoading && (
              <div style={{
                textAlign: "center",
                padding: "20px",
                color: "#555",
                fontSize: 12,
              }}>
                當您的下線會員開始消費點數後，分潤記錄將顯示於此
              </div>
            )}
          </>
        )}

        {/* ════════════════════════════════════════
            TAB 4: 推薦連結 (Invite Link)
            ════════════════════════════════════════ */}
        {tab === "invite" && (
          <>
            <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
              🔗 推薦連結
            </div>

            {/* Copy toast */}
            {copyMsg && (
              <div style={{
                position: "fixed",
                top: 80,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#00FF8822",
                border: "1px solid #00FF8866",
                borderRadius: 8,
                color: "#00FF88",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 600,
                zIndex: 9999,
                pointerEvents: "none",
              }}>{copyMsg}</div>
            )}

            {/* Invite Code Card */}
            <SectionCard title="🎟️ 您的專屬推薦碼">
              <div style={{
                background: "#111",
                border: "1px solid #FFD70044",
                borderRadius: 10,
                padding: "16px 18px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
                flexWrap: "wrap",
              }}>
                <div>
                  <div style={{ color: "#888", fontSize: 11, marginBottom: 4 }}>推薦碼</div>
                  <div style={{
                    color: "#FFD700",
                    fontSize: 26,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    letterSpacing: 2,
                  }}>{inviteCode}</div>
                </div>
                <button
                  onClick={() => copyText(inviteCode)}
                  style={{
                    background: "linear-gradient(135deg, #FFD700, #B8860B)",
                    border: "none",
                    borderRadius: 8,
                    color: "#000",
                    fontWeight: 700,
                    fontSize: 13,
                    padding: "10px 18px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >📋 複製推薦碼</button>
              </div>
            </SectionCard>

            {/* Invite Link Card */}
            <SectionCard title="🔗 推薦連結">
              <div style={{
                background: "#111",
                border: "1px solid #00BFFF44",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 12,
              }}>
                <div style={{ color: "#888", fontSize: 11, marginBottom: 6 }}>Telegram 推薦連結</div>
                <div style={{
                  color: "#00BFFF",
                  fontSize: 13,
                  fontFamily: "monospace",
                  wordBreak: "break-all",
                  marginBottom: 12,
                  lineHeight: 1.5,
                }}>{inviteLink}</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button
                    onClick={() => copyText(inviteLink)}
                    style={{
                      background: "linear-gradient(135deg, #00BFFF, #0080AA)",
                      border: "none",
                      borderRadius: 8,
                      color: "#fff",
                      fontWeight: 700,
                      fontSize: 13,
                      padding: "10px 18px",
                      cursor: "pointer",
                    }}
                  >📋 複製連結</button>
                  {inviteLink !== "—" && (
                    <a
                      href={inviteLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: "#0d0d0d",
                        border: "1px solid #00BFFF44",
                        borderRadius: 8,
                        color: "#00BFFF",
                        fontWeight: 600,
                        fontSize: 13,
                        padding: "10px 18px",
                        cursor: "pointer",
                        textDecoration: "none",
                        display: "inline-block",
                      }}
                    >🚀 前往 Telegram</a>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* Share message template */}
            <SectionCard title="💬 推薦話術範本">
              {[
                {
                  label: "簡短版",
                  text: `🎰 LA1 AI 娛樂平台，全球頂級遊戲！\n首充最高 100% 獎勵加成\n👉 ${inviteLink}`,
                },
                {
                  label: "完整版",
                  text: `🎰 推薦你加入 LA1 AI 娛樂平台！\n\n✅ 百家樂、老虎機、真人直播\n✅ 首充最高 100% 獎勵\n✅ 每日簽到送 USDT\n✅ 極速出金，最快 3 分鐘\n\n使用我的推薦碼：${inviteCode}\n或直接點擊：${inviteLink}`,
                },
              ].map(({ label, text }) => (
                <div key={label} style={{
                  background: "#111",
                  border: "1px solid #ffffff11",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 10,
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 8,
                  }}>
                    <span style={{ color: "#888", fontSize: 11 }}>{label}</span>
                    <button
                      onClick={() => copyText(text)}
                      style={{
                        background: "#FFD70022",
                        border: "1px solid #FFD70044",
                        borderRadius: 6,
                        color: "#FFD700",
                        fontSize: 11,
                        padding: "4px 10px",
                        cursor: "pointer",
                      }}
                    >複製</button>
                  </div>
                  <div style={{
                    color: "#aaa",
                    fontSize: 12,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}>{text}</div>
                </div>
              ))}
            </SectionCard>

            {/* How it works */}
            <SectionCard title="📖 如何賺取分潤獎勵">
              {[
                { step: "1", title: "複製推薦連結", desc: "複製您的專屬推薦碼或連結", color: "#FFD700" },
                { step: "2", title: "分享給好友", desc: "透過 Telegram、社群等管道分享給潛在會員", color: "#00BFFF" },
                { step: "3", title: "好友加入消費", desc: "好友透過您的連結加入並開始消費點數", color: "#00FF88" },
                { step: "4", title: "自動計算分潤", desc: "系統依照您的分潤比例自動計算獎勵，每月發放", color: "#FF8800" },
              ].map(item => (
                <div key={item.step} style={{
                  display: "flex",
                  gap: 12,
                  marginBottom: 14,
                  alignItems: "flex-start",
                }}>
                  <div style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${item.color}, ${item.color}88)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#000",
                  }}>{item.step}</div>
                  <div>
                    <div style={{ color: item.color, fontWeight: 600, fontSize: 13, marginBottom: 2 }}>{item.title}</div>
                    <div style={{ color: "#666", fontSize: 12 }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </SectionCard>
          </>
        )}

      </div>

      {/* Footer */}
      <div style={{
        textAlign: "center",
        padding: "16px 20px",
        borderTop: "1px solid #ffffff08",
        color: "#333",
        fontSize: 11,
        marginTop: 20,
      }}>
        LA1 AI Entertainment © 2026 · 合作夥伴中心
      </div>
    </div>
  );
}
