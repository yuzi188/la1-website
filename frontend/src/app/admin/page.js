"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://la1-backend-production.up.railway.app";
const ADMIN_PWD = "585858";

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA GENERATORS
   ═══════════════════════════════════════════════════════════════════════════ */
const TG_NAMES = [
  "賭神小明","歐皇附體","梭哈戰士","一夜暴富","幸運鯨魚","百家樂之王","輪盤殺手",
  "金幣獵人","不賭不行","佛系玩家","暴走老虎機","提款王者","反水達人","VIP大佬",
  "今晚吃雞","翻倍狂人","運氣爆棚","零元購神","逆風翻盤","穩如老狗","鑽石手","月光族",
  "暴富夢想家","幣圈韭菜","梭哈一把","躺贏玩家","歐洲狗","非洲酋長","水晶球大師","財神爺"
];
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const randF = (min, max) => +(Math.random() * (max - min) + min).toFixed(2);

function genMockUsers(n = 30) {
  return Array.from({ length: n }, (_, i) => {
    const dep = rand(0, 50000);
    const bet = rand(Math.floor(dep * 0.5), Math.floor(dep * 3));
    const pnl = randF(-dep * 0.6, dep * 0.3);
    const vip = dep > 20000 ? 5 : dep > 10000 ? 4 : dep > 5000 ? 3 : dep > 1000 ? 2 : dep > 100 ? 1 : 0;
    const inviter = i > 5 ? TG_NAMES[rand(0, 5)] : "—";
    return {
      id: 1000 + i, tgId: 700000000 + rand(0, 999999), name: TG_NAMES[i % TG_NAMES.length],
      deposit: dep, bet, pnl, vip, inviter,
      regDate: `2026-03-${String(rand(1, 21)).padStart(2, "0")}`,
      lastActive: `${rand(0, 23)}:${String(rand(0, 59)).padStart(2, "0")}`,
    };
  });
}

function genMockAgents() {
  return [
    { id: "AG001", name: "金牌代理A", members: 128, flow: 892340, commission: 13385, rate: "1.5%" },
    { id: "AG002", name: "銀牌代理B", members: 67, flow: 423100, commission: 6347, rate: "1.5%" },
    { id: "AG003", name: "鑽石代理C", members: 234, flow: 1567800, commission: 23517, rate: "1.5%" },
    { id: "AG004", name: "新手代理D", members: 12, flow: 34500, commission: 518, rate: "1.5%" },
    { id: "AG005", name: "VIP代理E", members: 89, flow: 678900, commission: 10184, rate: "1.5%" },
  ];
}

function genMockActivities() {
  const firstDeposit = Array.from({ length: 8 }, () => ({
    user: TG_NAMES[rand(0, TG_NAMES.length - 1)],
    type: rand(0, 1) ? "充100送38" : "充30送10",
    amount: rand(0, 1) ? 38 : 10,
    turnover: rand(0, 1) ? "10x" : "8x",
    status: rand(0, 3) > 0 ? "已完成" : "進行中",
    date: `03-${String(rand(15, 21)).padStart(2, "0")} ${rand(8, 23)}:${String(rand(0, 59)).padStart(2, "0")}`,
  }));
  const vipUpgrades = Array.from({ length: 6 }, () => ({
    user: TG_NAMES[rand(0, TG_NAMES.length - 1)],
    from: rand(0, 3), to: rand(1, 5),
    date: `03-${String(rand(15, 21)).padStart(2, "0")}`,
  }));
  const referralCommissions = Array.from({ length: 10 }, () => ({
    agent: TG_NAMES[rand(0, 5)],
    referred: TG_NAMES[rand(6, TG_NAMES.length - 1)],
    level: rand(0, 1) ? "直推15%" : "二級3%",
    amount: randF(5, 500),
    date: `03-${String(rand(15, 21)).padStart(2, "0")}`,
  }));
  const checkins = Array.from({ length: 12 }, () => ({
    user: TG_NAMES[rand(0, TG_NAMES.length - 1)],
    day: rand(1, 7),
    reward: [0.5, 0.5, 1, 1, 1.5, 1.5, 3][rand(0, 6)],
    date: `03-${String(rand(18, 21)).padStart(2, "0")}`,
  }));
  return { firstDeposit, vipUpgrades, referralCommissions, checkins };
}

function genMockRiskAlerts() {
  return [
    { id: "R001", type: "異常下注", user: "梭哈戰士", detail: "5分鐘內下注87次，金額$45,200", level: "高", time: "14:23" },
    { id: "R002", type: "多帳號IP", user: "歐皇附體", detail: "同IP 192.168.1.xx 登入3個帳號", level: "高", time: "15:01" },
    { id: "R003", type: "高頻下注", user: "暴走老虎機", detail: "連續2小時不間斷下注，疑似腳本", level: "中", time: "16:45" },
    { id: "R004", type: "對打嫌疑", user: "翻倍狂人", detail: "與「穩如老狗」百家樂對打，互買莊閒", level: "高", time: "17:12" },
    { id: "R005", type: "異常提款", user: "提款王者", detail: "充值$100後立即申請提款$98", level: "中", time: "18:30" },
    { id: "R006", type: "刷返水", user: "反水達人", detail: "低風險投注循環操作，疑似刷返水", level: "中", time: "19:05" },
  ];
}

function genHourlyData() {
  const hours = [];
  let cumProfit = 0;
  for (let h = 0; h < 24; h++) {
    const profit = randF(-3000, 5000);
    cumProfit += profit;
    hours.push({ hour: h, bets: rand(5000, 35000), profit, cumProfit: +cumProfit.toFixed(2) });
  }
  return hours;
}

/* ═══════════════════════════════════════════════════════════════════════════
   MINI CHART (Canvas)
   ═══════════════════════════════════════════════════════════════════════════ */
function MiniChart({ data, width = 600, height = 200 }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    const values = data.map(d => d.cumProfit);
    const minV = Math.min(...values, 0);
    const maxV = Math.max(...values, 1);
    const range = maxV - minV || 1;
    const padX = 45, padY = 20, chartW = width - padX * 2, chartH = height - padY * 2;
    // Grid
    ctx.strokeStyle = "rgba(255,215,0,0.1)"; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 4; i++) { const y = padY + (chartH / 4) * i; ctx.beginPath(); ctx.moveTo(padX, y); ctx.lineTo(width - padX, y); ctx.stroke(); }
    // Zero line
    const zeroY = padY + chartH - ((0 - minV) / range) * chartH;
    ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(padX, zeroY); ctx.lineTo(width - padX, zeroY); ctx.stroke(); ctx.setLineDash([]);
    // Fill
    const grad = ctx.createLinearGradient(0, padY, 0, height - padY);
    grad.addColorStop(0, "rgba(255,215,0,0.3)"); grad.addColorStop(0.5, "rgba(0,191,255,0.1)"); grad.addColorStop(1, "rgba(0,191,255,0.02)");
    ctx.beginPath(); ctx.moveTo(padX, height - padY);
    data.forEach((d, i) => { const x = padX + (i / (data.length - 1)) * chartW; const y = padY + chartH - ((d.cumProfit - minV) / range) * chartH; ctx.lineTo(x, y); });
    ctx.lineTo(padX + chartW, height - padY); ctx.closePath(); ctx.fillStyle = grad; ctx.fill();
    // Line
    const lineGrad = ctx.createLinearGradient(padX, 0, width - padX, 0);
    lineGrad.addColorStop(0, "#FFD700"); lineGrad.addColorStop(1, "#00BFFF");
    ctx.strokeStyle = lineGrad; ctx.lineWidth = 2.5; ctx.beginPath();
    data.forEach((d, i) => { const x = padX + (i / (data.length - 1)) * chartW; const y = padY + chartH - ((d.cumProfit - minV) / range) * chartH; if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); });
    ctx.stroke();
    // Dots
    data.forEach((d, i) => { if (i % 3 !== 0 && i !== data.length - 1) return; const x = padX + (i / (data.length - 1)) * chartW; const y = padY + chartH - ((d.cumProfit - minV) / range) * chartH; ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.fillStyle = d.cumProfit >= 0 ? "#FFD700" : "#ff4444"; ctx.fill(); });
    // X labels
    ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.font = "10px sans-serif"; ctx.textAlign = "center";
    data.forEach((d, i) => { if (i % 4 === 0) { const x = padX + (i / (data.length - 1)) * chartW; ctx.fillText(`${d.hour}:00`, x, height - 4); } });
    // Y labels
    ctx.textAlign = "right";
    for (let i = 0; i <= 4; i++) { const val = minV + (range / 4) * (4 - i); const y = padY + (chartH / 4) * i; ctx.fillStyle = val >= 0 ? "rgba(255,215,0,0.6)" : "rgba(255,68,68,0.6)"; ctx.fillText(`$${Math.round(val).toLocaleString()}`, padX - 4, y + 3); }
  }, [data, width, height]);
  return <canvas ref={canvasRef} style={{ width: "100%", height: height + "px", maxWidth: width + "px" }} />;
}

/* ═══════════════════════════════════════════════════════════════════════════
   FUNNEL CHART
   ═══════════════════════════════════════════════════════════════════════════ */
function FunnelChart({ data }) {
  const maxVal = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", padding: "16px 0" }}>
      {data.map((item, i) => {
        const pct = (item.value / maxVal) * 100;
        const convRate = i > 0 ? ((item.value / data[i - 1].value) * 100).toFixed(1) : "100";
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "70px", textAlign: "right", fontSize: "12px", color: "rgba(255,255,255,0.6)" }}>{item.label}</div>
            <div style={{ flex: 1, position: "relative", height: "32px" }}>
              <div style={{ width: `${pct}%`, height: "100%", borderRadius: "4px", background: `linear-gradient(90deg, ${item.color}, ${item.color2})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "bold", color: "#000", transition: "width 1s ease", minWidth: "60px" }}>
                {item.value.toLocaleString()}
              </div>
            </div>
            <div style={{ width: "50px", fontSize: "11px", color: i > 0 ? "#00BFFF" : "#FFD700" }}>{i > 0 ? `${convRate}%` : "—"}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED NUMBER
   ═══════════════════════════════════════════════════════════════════════════ */
function AnimNum({ value, prefix = "$", color }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const end = typeof value === "number" ? value : parseFloat(value) || 0;
    const duration = 1200; const startTime = Date.now();
    const tick = () => {
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(end * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    tick();
  }, [value]);
  const isNeg = display < 0;
  const c = color || (isNeg ? "#ff4444" : "#00ff88");
  const sign = display > 0 ? "+" : "";
  return <span style={{ color: c, fontWeight: "bold", fontFamily: "monospace" }}>{sign}{prefix}{Math.abs(display).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>;
}

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════════════════════ */
const S = {
  page: { minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  header: { background: "linear-gradient(135deg, rgba(255,215,0,0.12), rgba(0,191,255,0.06))", borderBottom: "2px solid rgba(255,215,0,0.3)", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" },
  logo: { fontSize: "20px", fontWeight: "900", background: "linear-gradient(135deg, #FFD700, #00BFFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  tabs: { display: "flex", gap: "4px", padding: "12px 16px", overflowX: "auto", background: "rgba(255,215,0,0.03)", borderBottom: "1px solid rgba(255,215,0,0.1)" },
  tab: (active) => ({ padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: active ? "700" : "500", cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.3s", background: active ? "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(0,191,255,0.15))" : "transparent", color: active ? "#FFD700" : "rgba(255,255,255,0.6)", border: active ? "1px solid rgba(255,215,0,0.4)" : "1px solid transparent" }),
  card: { background: "linear-gradient(135deg, rgba(255,215,0,0.05), rgba(0,191,255,0.03))", border: "1px solid rgba(255,215,0,0.15)", borderRadius: "12px", padding: "16px", marginBottom: "12px", boxShadow: "0 0 20px rgba(0,191,255,0.05)" },
  cardTitle: { fontSize: "14px", fontWeight: "700", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px", color: "#FFD700" },
  statGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "16px" },
  statBox: { background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,215,0,0.1)", borderRadius: "10px", padding: "14px", textAlign: "center" },
  statLabel: { fontSize: "11px", color: "rgba(255,255,255,0.5)", marginBottom: "4px" },
  statValue: { fontSize: "22px", fontWeight: "900", fontFamily: "monospace" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "12px" },
  th: { textAlign: "left", padding: "10px 8px", borderBottom: "1px solid rgba(255,215,0,0.2)", color: "#FFD700", fontSize: "11px", fontWeight: "700", whiteSpace: "nowrap" },
  td: { padding: "10px 8px", borderBottom: "1px solid rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.85)", whiteSpace: "nowrap" },
  badge: (color) => ({ display: "inline-block", padding: "2px 8px", borderRadius: "10px", fontSize: "10px", fontWeight: "700", background: `${color}22`, color, border: `1px solid ${color}44` }),
  btn: { padding: "6px 12px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", cursor: "pointer", border: "none", transition: "all 0.3s" },
  input: { width: "100%", padding: "12px 16px", borderRadius: "8px", fontSize: "14px", background: "rgba(0,0,0,0.6)", border: "1px solid rgba(255,215,0,0.3)", color: "#fff", outline: "none", marginBottom: "12px", boxSizing: "border-box" },
  loginBtn: { width: "100%", padding: "14px", borderRadius: "8px", fontSize: "16px", fontWeight: "700", background: "linear-gradient(135deg, #FFD700, #00BFFF)", color: "#000", border: "none", cursor: "pointer" },
  section: { padding: "16px" },
};

const VIP_COLORS = ["#666", "#cd7f32", "#c0c0c0", "#FFD700", "#00BFFF", "#ff44ff"];
function VipBadge({ level }) { return <span style={S.badge(VIP_COLORS[level] || "#666")}>VIP{level}</span>; }
function RiskBadge({ level }) { const c = level === "高" ? "#ff4444" : level === "中" ? "#ffaa00" : "#00ff88"; return <span style={S.badge(c)}>{level}風險</span>; }

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwdErr, setPwdErr] = useState("");
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState("");
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustAmt, setAdjustAmt] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const [mockUsers] = useState(() => genMockUsers(30));
  const [mockAgents] = useState(() => genMockAgents());
  const [mockActivities] = useState(() => genMockActivities());
  const [mockRisks] = useState(() => genMockRiskAlerts());
  const [hourlyData] = useState(() => genHourlyData());

  const todayBets = mockUsers.reduce((s, u) => s + u.bet, 0);
  const todayPnl = mockUsers.reduce((s, u) => s + u.pnl, 0);
  const rebateSpend = +(todayBets * 0.008).toFixed(2);
  const netProfit = +(todayPnl * -1 - rebateSpend).toFixed(2);
  const totalDeposit = mockUsers.reduce((s, u) => s + u.deposit, 0);

  const funnelData = [
    { label: "進站", value: 3842, color: "#FFD700", color2: "#FFD700" },
    { label: "註冊", value: 847, color: "#FFD700", color2: "#D4AF37" },
    { label: "充值", value: 312, color: "#D4AF37", color2: "#00BFFF" },
    { label: "下注", value: 278, color: "#00BFFF", color2: "#1E90FF" },
  ];

  const handleLogin = () => { if (pwd === ADMIN_PWD) { setAuthed(true); setPwdErr(""); } else { setPwdErr("密碼錯誤"); } };

  const handleAdjust = async (type) => {
    if (!adjustAmt || isNaN(adjustAmt)) return;
    try {
      await fetch(`${BACKEND}/admin/adjust-balance`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: adjustModal.tgId, amount: parseFloat(adjustAmt), type, reason: adjustReason || (type === "add" ? "手動上分" : "手動扣分"), adminPwd: ADMIN_PWD }),
      });
    } catch (e) { /* silent */ }
    setAdjustModal(null); setAdjustAmt(""); setAdjustReason("");
  };

  const filteredUsers = mockUsers.filter(u => u.name.includes(search) || String(u.tgId).includes(search) || search === "");

  const TABS = [
    { icon: "💰", label: "營收面板" },
    { icon: "👥", label: "用戶管理" },
    { icon: "🎁", label: "活動系統" },
    { icon: "🤝", label: "代理系統" },
    { icon: "🛡️", label: "風控系統" },
  ];

  /* ─── LOGIN ─── */
  if (!authed) {
    return (
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ background: "linear-gradient(135deg, rgba(255,215,0,0.08), rgba(0,191,255,0.04))", border: "1px solid rgba(255,215,0,0.3)", borderRadius: "16px", padding: "40px 32px", width: "320px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔐</div>
          <div style={{ fontSize: "20px", fontWeight: "900", marginBottom: "8px", background: "linear-gradient(135deg, #FFD700, #00BFFF)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LA1 管理後台</div>
          <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.4)", marginBottom: "24px" }}>營收管理系統 v3.0</div>
          <input style={S.input} type="password" placeholder="請輸入管理密碼" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()} />
          {pwdErr && <div style={{ color: "#ff4444", fontSize: "13px", marginBottom: "12px" }}>{pwdErr}</div>}
          <button style={S.loginBtn} onClick={handleLogin}>進入後台</button>
        </div>
      </div>
    );
  }

  /* ─── REVENUE ─── */
  const renderRevenue = () => (
    <div style={S.section}>
      <div style={S.statGrid}>
        <div style={S.statBox}><div style={S.statLabel}>今日下注</div><div style={S.statValue}><AnimNum value={todayBets} color="#FFD700" /></div></div>
        <div style={S.statBox}><div style={S.statLabel}>今日輸贏（平台）</div><div style={S.statValue}><AnimNum value={netProfit} /></div></div>
        <div style={S.statBox}><div style={S.statLabel}>返水支出</div><div style={S.statValue}><AnimNum value={rebateSpend} color="#ff8800" prefix="-$" /></div></div>
        <div style={S.statBox}><div style={S.statLabel}>淨利潤</div><div style={S.statValue}><AnimNum value={netProfit - rebateSpend} /></div></div>
      </div>
      <div style={{ ...S.statGrid, gridTemplateColumns: "1fr 1fr 1fr" }}>
        <div style={S.statBox}><div style={S.statLabel}>總充值</div><div style={{ ...S.statValue, fontSize: "16px" }}><AnimNum value={totalDeposit} color="#FFD700" /></div></div>
        <div style={S.statBox}><div style={S.statLabel}>活躍用戶</div><div style={{ ...S.statValue, fontSize: "16px", color: "#00BFFF" }}>{mockUsers.length}</div></div>
        <div style={S.statBox}><div style={S.statLabel}>代理佣金</div><div style={{ ...S.statValue, fontSize: "16px" }}><AnimNum value={mockAgents.reduce((s, a) => s + a.commission, 0)} color="#ff8800" prefix="-$" /></div></div>
      </div>
      <div style={S.card}><div style={S.cardTitle}>📈 今日盈利曲線（累計）</div><MiniChart data={hourlyData} width={600} height={200} /></div>
      <div style={S.card}><div style={S.cardTitle}>🔻 轉化漏斗</div><FunnelChart data={funnelData} /></div>
      <div style={S.card}>
        <div style={S.cardTitle}>📊 今日快報</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", fontSize: "12px" }}>
          {[
            { label: "新註冊", value: "47", color: "#00BFFF" }, { label: "首充人數", value: "18", color: "#FFD700" },
            { label: "VIP升級", value: "6", color: "#ff44ff" }, { label: "簽到人數", value: "89", color: "#00ff88" },
            { label: "邀請新增", value: "23", color: "#00BFFF" }, { label: "風控警告", value: String(mockRisks.length), color: "#ff4444" },
          ].map((item, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "rgba(0,0,0,0.3)", borderRadius: "6px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>{item.label}</span>
              <span style={{ color: item.color, fontWeight: "700", fontFamily: "monospace" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  /* ─── USERS ─── */
  const renderUsers = () => (
    <div style={S.section}>
      <div style={{ marginBottom: "12px" }}>
        <input style={{ ...S.input, marginBottom: 0 }} placeholder="🔍 搜尋 TG 名稱或 TG ID..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>TG名稱</th><th style={S.th}>充值</th><th style={S.th}>投注</th><th style={S.th}>盈虧</th><th style={S.th}>VIP</th><th style={S.th}>來源</th><th style={S.th}>操作</th>
          </tr></thead>
          <tbody>
            {filteredUsers.map((u, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,215,0,0.02)" }}>
                <td style={S.td}><div style={{ fontWeight: "600" }}>{u.name}</div><div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)" }}>ID: {u.tgId}</div></td>
                <td style={{ ...S.td, color: "#FFD700", fontFamily: "monospace" }}>${u.deposit.toLocaleString()}</td>
                <td style={{ ...S.td, fontFamily: "monospace" }}>${u.bet.toLocaleString()}</td>
                <td style={{ ...S.td, color: u.pnl >= 0 ? "#00ff88" : "#ff4444", fontFamily: "monospace", fontWeight: "700" }}>{u.pnl >= 0 ? "+" : ""}{u.pnl.toLocaleString()}</td>
                <td style={S.td}><VipBadge level={u.vip} /></td>
                <td style={{ ...S.td, fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{u.inviter}</td>
                <td style={S.td}>
                  <div style={{ display: "flex", gap: "4px" }}>
                    <button style={{ ...S.btn, background: "rgba(0,255,136,0.15)", color: "#00ff88" }} onClick={() => setAdjustModal({ ...u, adjustType: "add" })}>+上分</button>
                    <button style={{ ...S.btn, background: "rgba(255,68,68,0.15)", color: "#ff4444" }} onClick={() => setAdjustModal({ ...u, adjustType: "deduct" })}>-扣分</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ textAlign: "center", padding: "16px", fontSize: "12px", color: "rgba(255,255,255,0.4)" }}>共 {filteredUsers.length} 位用戶</div>
    </div>
  );

  /* ─── ACTIVITIES ─── */
  const renderActivities = () => (
    <div style={S.section}>
      <div style={S.card}>
        <div style={S.cardTitle}>🎁 首充領取記錄</div>
        <table style={S.table}><thead><tr><th style={S.th}>用戶</th><th style={S.th}>方案</th><th style={S.th}>獎金</th><th style={S.th}>流水</th><th style={S.th}>狀態</th><th style={S.th}>時間</th></tr></thead>
          <tbody>{mockActivities.firstDeposit.map((r, i) => (
            <tr key={i}><td style={S.td}>{r.user}</td><td style={{ ...S.td, color: "#FFD700" }}>{r.type}</td><td style={{ ...S.td, color: "#00ff88", fontFamily: "monospace" }}>${r.amount}</td><td style={S.td}>{r.turnover}</td><td style={S.td}><span style={S.badge(r.status === "已完成" ? "#00ff88" : "#ffaa00")}>{r.status}</span></td><td style={{ ...S.td, fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{r.date}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>⭐ VIP 升級記錄</div>
        <table style={S.table}><thead><tr><th style={S.th}>用戶</th><th style={S.th}>升級前</th><th style={S.th}>升級後</th><th style={S.th}>日期</th></tr></thead>
          <tbody>{mockActivities.vipUpgrades.map((r, i) => (
            <tr key={i}><td style={S.td}>{r.user}</td><td style={S.td}><VipBadge level={r.from} /></td><td style={S.td}><VipBadge level={r.to} /></td><td style={{ ...S.td, fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{r.date}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>🤝 邀請佣金記錄</div>
        <table style={S.table}><thead><tr><th style={S.th}>代理</th><th style={S.th}>被邀請人</th><th style={S.th}>層級</th><th style={S.th}>佣金</th><th style={S.th}>日期</th></tr></thead>
          <tbody>{mockActivities.referralCommissions.map((r, i) => (
            <tr key={i}><td style={{ ...S.td, color: "#FFD700" }}>{r.agent}</td><td style={S.td}>{r.referred}</td><td style={S.td}><span style={S.badge(r.level.includes("直推") ? "#00BFFF" : "#888")}>{r.level}</span></td><td style={{ ...S.td, color: "#00ff88", fontFamily: "monospace" }}>${r.amount}</td><td style={{ ...S.td, fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{r.date}</td></tr>
          ))}</tbody>
        </table>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>📅 簽到記錄</div>
        <table style={S.table}><thead><tr><th style={S.th}>用戶</th><th style={S.th}>天數</th><th style={S.th}>獎勵</th><th style={S.th}>日期</th></tr></thead>
          <tbody>{mockActivities.checkins.map((r, i) => (
            <tr key={i}><td style={S.td}>{r.user}</td><td style={S.td}><span style={S.badge("#FFD700")}>Day {r.day}</span></td><td style={{ ...S.td, color: "#00ff88", fontFamily: "monospace" }}>${r.reward}</td><td style={{ ...S.td, fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{r.date}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );

  /* ─── AGENTS ─── */
  const renderAgents = () => (
    <div style={S.section}>
      <div style={S.card}>
        <div style={S.cardTitle}>🤝 代理總覽</div>
        <div style={S.statGrid}>
          <div style={S.statBox}><div style={S.statLabel}>總代理數</div><div style={{ ...S.statValue, color: "#FFD700" }}>{mockAgents.length}</div></div>
          <div style={S.statBox}><div style={S.statLabel}>總帶人數</div><div style={{ ...S.statValue, color: "#00BFFF" }}>{mockAgents.reduce((s, a) => s + a.members, 0)}</div></div>
          <div style={S.statBox}><div style={S.statLabel}>總流水</div><div style={{ ...S.statValue, fontSize: "16px" }}><AnimNum value={mockAgents.reduce((s, a) => s + a.flow, 0)} color="#FFD700" /></div></div>
          <div style={S.statBox}><div style={S.statLabel}>總佣金支出</div><div style={{ ...S.statValue, fontSize: "16px" }}><AnimNum value={mockAgents.reduce((s, a) => s + a.commission, 0)} color="#ff8800" prefix="-$" /></div></div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>📋 代理列表</div>
        <table style={S.table}><thead><tr><th style={S.th}>代理ID</th><th style={S.th}>名稱</th><th style={S.th}>帶人數</th><th style={S.th}>總流水</th><th style={S.th}>佣金</th><th style={S.th}>比例</th></tr></thead>
          <tbody>{mockAgents.map((a, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,215,0,0.02)" }}>
              <td style={{ ...S.td, color: "#00BFFF", fontFamily: "monospace" }}>{a.id}</td>
              <td style={{ ...S.td, fontWeight: "600" }}>{a.name}</td>
              <td style={{ ...S.td, fontFamily: "monospace" }}>{a.members}</td>
              <td style={{ ...S.td, color: "#FFD700", fontFamily: "monospace" }}>${a.flow.toLocaleString()}</td>
              <td style={{ ...S.td, color: "#00ff88", fontFamily: "monospace" }}>${a.commission.toLocaleString()}</td>
              <td style={S.td}><span style={S.badge("#00BFFF")}>{a.rate}</span></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );

  /* ─── RISK CONTROL ─── */
  const renderRisk = () => (
    <div style={S.section}>
      <div style={S.card}>
        <div style={S.cardTitle}>🛡️ 風控總覽</div>
        <div style={{ ...S.statGrid, gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div style={S.statBox}><div style={S.statLabel}>高風險</div><div style={{ ...S.statValue, color: "#ff4444" }}>{mockRisks.filter(r => r.level === "高").length}</div></div>
          <div style={S.statBox}><div style={S.statLabel}>中風險</div><div style={{ ...S.statValue, color: "#ffaa00" }}>{mockRisks.filter(r => r.level === "中").length}</div></div>
          <div style={S.statBox}><div style={S.statLabel}>已處理</div><div style={{ ...S.statValue, color: "#00ff88" }}>0</div></div>
        </div>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>⚠️ 異常警告列表</div>
        {mockRisks.map((r, i) => (
          <div key={i} style={{ padding: "12px", marginBottom: "8px", borderRadius: "8px", background: r.level === "高" ? "rgba(255,68,68,0.08)" : "rgba(255,170,0,0.06)", border: `1px solid ${r.level === "高" ? "rgba(255,68,68,0.2)" : "rgba(255,170,0,0.15)"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><RiskBadge level={r.level} /><span style={{ fontSize: "13px", fontWeight: "700", color: "#FFD700" }}>{r.type}</span></div>
              <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>{r.time}</span>
            </div>
            <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", marginBottom: "6px" }}>用戶：<span style={{ color: "#00BFFF" }}>{r.user}</span></div>
            <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.5)" }}>{r.detail}</div>
            <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
              <button style={{ ...S.btn, background: "rgba(255,68,68,0.15)", color: "#ff4444" }}>封鎖帳號</button>
              <button style={{ ...S.btn, background: "rgba(255,170,0,0.15)", color: "#ffaa00" }}>標記觀察</button>
              <button style={{ ...S.btn, background: "rgba(0,255,136,0.15)", color: "#00ff88" }}>忽略</button>
            </div>
          </div>
        ))}
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>🌐 多帳號 IP 檢測</div>
        <table style={S.table}><thead><tr><th style={S.th}>IP 地址</th><th style={S.th}>關聯帳號</th><th style={S.th}>風險</th></tr></thead>
          <tbody>{[
            { ip: "192.168.1.***", accounts: "歐皇附體, 梭哈戰士, 金幣獵人", risk: "高" },
            { ip: "10.0.0.***", accounts: "翻倍狂人, 穩如老狗", risk: "中" },
            { ip: "172.16.0.***", accounts: "反水達人, 暴走老虎機, 提款王者", risk: "高" },
          ].map((r, i) => (
            <tr key={i}><td style={{ ...S.td, fontFamily: "monospace", color: "#00BFFF" }}>{r.ip}</td><td style={S.td}>{r.accounts}</td><td style={S.td}><RiskBadge level={r.risk} /></td></tr>
          ))}</tbody>
        </table>
      </div>
      <div style={S.card}>
        <div style={S.cardTitle}>⚡ 高頻下注監控</div>
        <table style={S.table}><thead><tr><th style={S.th}>用戶</th><th style={S.th}>5分鐘下注次數</th><th style={S.th}>金額</th><th style={S.th}>遊戲</th></tr></thead>
          <tbody>{[
            { user: "梭哈戰士", count: 87, amount: "$45,200", game: "百家樂" },
            { user: "暴走老虎機", count: 156, amount: "$12,300", game: "老虎機" },
            { user: "翻倍狂人", count: 63, amount: "$28,900", game: "輪盤" },
          ].map((r, i) => (
            <tr key={i}><td style={{ ...S.td, color: "#FFD700" }}>{r.user}</td><td style={{ ...S.td, color: "#ff4444", fontWeight: "700", fontFamily: "monospace" }}>{r.count}</td><td style={{ ...S.td, fontFamily: "monospace" }}>{r.amount}</td><td style={S.td}>{r.game}</td></tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );

  const PANELS = [renderRevenue, renderUsers, renderActivities, renderAgents, renderRisk];

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <div><div style={S.logo}>LA1 管理後台</div><div style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>營收管理系統 v3.0</div></div>
        <button style={{ ...S.btn, background: "rgba(255,68,68,0.15)", color: "#ff4444" }} onClick={() => setAuthed(false)}>登出</button>
      </div>
      {/* Tabs */}
      <div style={S.tabs}>{TABS.map((t, i) => (<div key={i} style={S.tab(activeTab === i)} onClick={() => setActiveTab(i)}>{t.icon} {t.label}</div>))}</div>
      {/* Content */}
      {PANELS[activeTab]()}
      {/* Adjust Modal */}
      {adjustModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#111", border: "1px solid rgba(255,215,0,0.3)", borderRadius: "16px", padding: "24px", width: "320px" }}>
            <div style={{ fontSize: "16px", fontWeight: "700", marginBottom: "4px", color: "#FFD700" }}>{adjustModal.adjustType === "add" ? "💰 上分" : "💸 扣分"}</div>
            <div style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", marginBottom: "16px" }}>用戶：{adjustModal.name}（{adjustModal.tgId}）</div>
            <input style={S.input} type="number" placeholder="輸入金額 (USDT)" value={adjustAmt} onChange={e => setAdjustAmt(e.target.value)} />
            <input style={S.input} placeholder="備註原因（選填）" value={adjustReason} onChange={e => setAdjustReason(e.target.value)} />
            <div style={{ display: "flex", gap: "8px" }}>
              <button style={{ ...S.loginBtn, flex: 1, background: adjustModal.adjustType === "add" ? "linear-gradient(135deg, #00ff88, #00BFFF)" : "linear-gradient(135deg, #ff4444, #ff8800)" }} onClick={() => handleAdjust(adjustModal.adjustType)}>確認{adjustModal.adjustType === "add" ? "上分" : "扣分"}</button>
              <button style={{ ...S.btn, flex: 1, background: "rgba(255,255,255,0.1)", color: "#fff", padding: "14px" }} onClick={() => { setAdjustModal(null); setAdjustAmt(""); setAdjustReason(""); }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
