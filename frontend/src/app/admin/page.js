"use client";
import { useState, useEffect, useRef } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://la1-backend-production.up.railway.app";
const ADMIN_PWD = "585858";
const OP_PWD = "888888";

/* ═══════════════════════════════════════════════════════════════════════════
   MOCK DATA
   ═══════════════════════════════════════════════════════════════════════════ */
const TG_NAMES = [
  "賭神小明","歐皇附體","梭哈戰士","一夜暴富","幸運鯨魚","百家樂之王","輪盤殺手",
  "金幣獵人","不賭不行","佛系玩家","暴走老虎機","提款王者","反水達人","VIP大佬",
  "今晚吃雞","翻倍狂人","運氣爆棚","零元購神","逆風翻盤","穩如老狗","鑽石手","月光族",
  "暴富夢想家","幣圈韭菜","梭哈一把","躺贏玩家","歐洲狗","非洲酋長","水晶球大師","財神爺"
];
const GAMES = ["百家樂","老虎機","輪盤","捕魚","真人百家樂","骰寶","龍虎","21點"];
const BET_TYPES = {
  "百家樂": ["莊","閒","和","莊對","閒對"],
  "老虎機": ["單線","多線","全押"],
  "輪盤": ["單號","紅","黑","大","小","單","雙"],
  "捕魚": ["普通炮","連發炮","閃電炮"],
  "真人百家樂": ["莊","閒","和"],
  "骰寶": ["大","小","單","雙","點數"],
  "龍虎": ["龍","虎","和"],
  "21點": ["加倍","分牌","保險"],
};
const PLATFORMS = ["PG電子","JDB電子","CQ9","PP真人","EVO真人","SA真人","JILI捕魚"];

const rand = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const randF = (a, b) => +(Math.random() * (b - a) + a).toFixed(2);

function genDate(daysAgo = 0, hoursAgo = 0) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(d.getHours() - hoursAgo);
  return d.toISOString().replace("T", " ").slice(0, 19);
}

const MOCK_USERS = Array.from({ length: 30 }, (_, i) => {
  const dep = rand(0, 50000);
  const bet = rand(Math.floor(dep * 0.5), Math.floor(dep * 3));
  const pnl = randF(-dep * 0.6, dep * 0.3);
  const vip = dep > 20000 ? 5 : dep > 10000 ? 4 : dep > 5000 ? 3 : dep > 1000 ? 2 : dep > 100 ? 1 : 0;
  return {
    id: 1000 + i, tgId: 700000000 + rand(0, 999999),
    name: TG_NAMES[i % TG_NAMES.length],
    deposit: dep, bet, pnl, vip,
    inviter: i > 5 ? TG_NAMES[rand(0, 5)] : "—",
    balance: randF(0, dep * 0.5),
    regDate: genDate(rand(0, 30)),
    ip: `${rand(1,255)}.${rand(1,255)}.${rand(1,255)}.${rand(1,255)}`,
    riskFlag: i % 15 === 0,
  };
});

const MOCK_GAME_RECORDS = Array.from({ length: 200 }, (_, i) => {
  const game = GAMES[rand(0, GAMES.length - 1)];
  const types = BET_TYPES[game] || ["普通"];
  const amount = randF(10, 5000);
  const r = Math.random();
  const result = r < 0.47 ? "贏" : r < 0.94 ? "輸" : "和";
  const pnl = result === "贏" ? +(amount * 0.95).toFixed(2) : result === "輸" ? -amount : 0;
  return {
    id: i + 1,
    user: TG_NAMES[rand(0, TG_NAMES.length - 1)],
    game, betType: types[rand(0, types.length - 1)], amount, result, pnl,
    time: genDate(rand(0, 30), rand(0, 23)),
  };
});

const MOCK_TRANSFER_RECORDS = Array.from({ length: 80 }, (_, i) => {
  const platform = PLATFORMS[rand(0, PLATFORMS.length - 1)];
  const inAmount = randF(100, 10000);
  const outAmount = randF(50, inAmount * 1.2);
  const inTime = genDate(rand(0, 30), rand(2, 24));
  const outTime = new Date(new Date(inTime).getTime() + rand(30, 300) * 60000)
    .toISOString().replace("T", " ").slice(0, 19);
  return {
    id: i + 1,
    user: TG_NAMES[rand(0, TG_NAMES.length - 1)],
    platform, inAmount, inTime, outAmount, outTime,
    status: Math.random() > 0.1 ? "已結算" : "進行中",
  };
});

const MOCK_OP_LOGS = Array.from({ length: 40 }, (_, i) => ({
  id: i + 1,
  action: Math.random() > 0.3 ? "上分" : "扣分",
  targetUser: TG_NAMES[rand(0, TG_NAMES.length - 1)],
  amount: rand(50, 5000),
  reason: ["首充確認","活動補發","測試","退款","VIP禮金","錯誤修正"][rand(0, 5)],
  operatorIp: `${rand(1,255)}.${rand(1,255)}.${rand(1,255)}.${rand(1,255)}`,
  opVerified: Math.random() > 0.05,
  time: genDate(rand(0, 14), rand(0, 23)),
}));

const MOCK_REVENUE = Array.from({ length: 30 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (29 - i));
  const dep = rand(5000, 80000);
  const withdraw = rand(2000, Math.floor(dep * 0.6));
  const bonus = rand(500, 5000);
  return { date: date.toISOString().split("T")[0].slice(5), deposit: dep, withdraw, bonus, net: dep - withdraw - bonus };
});

const MOCK_AGENTS = [
  { id: "AG001", name: "金牌代理A", level: "金牌", members: 128, flow: 892340, commission: 13385, rate: "1.5%" },
  { id: "AG002", name: "銀牌代理B", level: "銀牌", members: 67, flow: 423100, commission: 6347, rate: "1.5%" },
  { id: "AG003", name: "鑽石代理C", level: "鑽石", members: 234, flow: 1567800, commission: 23517, rate: "1.5%" },
  { id: "AG004", name: "新手代理D", level: "新手", members: 12, flow: 34500, commission: 518, rate: "1.5%" },
  { id: "AG005", name: "VIP代理E", level: "VIP", members: 89, flow: 678900, commission: 10184, rate: "1.5%" },
];

const MOCK_RISK_ALERTS = [
  { id: 1, type: "多帳號 IP", level: "高風險", username: "歐皇附體", detail: "IP 192.168.1.1 已關聯 4 個帳號", action: "封鎖", time: genDate(0, 1), handled: false },
  { id: 2, type: "高頻下注", level: "中風險", username: "梭哈戰士", detail: "5分鐘內下注 67 次", action: "觀察", time: genDate(0, 2), handled: false },
  { id: 3, type: "刷返水異常", level: "高風險", username: "反水達人", detail: "返水佔充值比例 8.3%，疑似刷水", action: "封鎖", time: genDate(0, 3), handled: false },
  { id: 4, type: "提款流水不足", level: "中風險", username: "提款王者", detail: "流水要求未達標，還需投注 1,200 USDT", action: "攔截", time: genDate(0, 4), handled: true },
  { id: 5, type: "同IP邀請", level: "高風險", username: "VIP大佬", detail: "邀請人與被邀請人使用相同IP，佣金不計算", action: "封鎖", time: genDate(1, 0), handled: false },
  { id: 6, type: "高頻下注", level: "中風險", username: "暴走老虎機", detail: "5分鐘內下注 55 次", action: "觀察", time: genDate(1, 2), handled: true },
];

const MOCK_IP_DATA = [
  { ip: "103.45.67.89", accountCount: 4, accounts: ["賭神小明","歐皇附體","梭哈戰士","一夜暴富"], risk: "高風險" },
  { ip: "58.23.145.201", accountCount: 3, accounts: ["幸運鯨魚","百家樂之王","輪盤殺手"], risk: "高風險" },
  { ip: "172.16.0.45", accountCount: 2, accounts: ["金幣獵人","不賭不行"], risk: "中風險" },
];

/* ═══════════════════════════════════════════════════════════════════════════
   UI COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function StatCard({ title, value, sub, color = "#FFD700", icon }) {
  const isNeg = typeof value === "string" && value.startsWith("-");
  const isPos = typeof value === "string" && value.startsWith("+");
  const valColor = isNeg ? "#FF4444" : isPos ? "#00FF88" : color;
  return (
    <div style={{ background: "linear-gradient(135deg, #0d0d0d, #1a1a1a)", border: `1px solid ${color}44`, borderRadius: 12, padding: "16px 18px", minWidth: 130 }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ color: "#888", fontSize: 11, marginBottom: 5 }}>{title}</div>
      <div style={{ color: valColor, fontSize: 20, fontWeight: 700, fontFamily: "monospace" }}>{value}</div>
      {sub && <div style={{ color: "#666", fontSize: 11, marginTop: 3 }}>{sub}</div>}
    </div>
  );
}

function Badge({ text }) {
  const map = {
    "高風險": "#FF4444", "中風險": "#FF8800", "低風險": "#00BFFF",
    "已處理": "#00FF88", "待處理": "#FF8800",
    "封鎖": "#FF4444", "觀察": "#FF8800", "攔截": "#FF6600",
    "已結算": "#00FF88", "進行中": "#FF8800",
    "上分": "#00FF88", "扣分": "#FF4444",
    "已驗證": "#00FF88", "未驗證": "#FF4444",
    "贏": "#00FF88", "輸": "#FF4444", "和": "#888",
    "直推": "#FFD700", "二級": "#00BFFF",
    "金牌": "#FFD700", "銀牌": "#C0C0C0", "鑽石": "#00BFFF", "新手": "#888", "VIP": "#FF44FF",
    "已完成": "#00FF88",
  };
  const c = map[text] || "#888";
  return <span style={{ background: c + "22", color: c, border: `1px solid ${c}55`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{text}</span>;
}

function DataTable({ cols, rows }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #FFD70033" }}>
            {cols.map(c => <th key={c.key} style={{ padding: "10px 10px", color: "#FFD700", fontWeight: 600, textAlign: "left", whiteSpace: "nowrap", fontSize: 11 }}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0
            ? <tr><td colSpan={cols.length} style={{ textAlign: "center", color: "#555", padding: 30 }}>暫無數據</td></tr>
            : rows.map((row, ri) => (
              <tr key={ri} style={{ borderBottom: "1px solid #ffffff06", background: ri % 2 === 0 ? "transparent" : "#ffffff03" }}>
                {cols.map(c => <td key={c.key} style={{ padding: "8px 10px", color: "#ccc", whiteSpace: "nowrap" }}>{c.render ? c.render(row) : row[c.key]}</td>)}
              </tr>
            ))
          }
        </tbody>
      </table>
    </div>
  );
}

function RevenueChart({ data }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || !data.length) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.offsetWidth || 700, H = 220;
    canvas.width = W; canvas.height = H;
    ctx.clearRect(0, 0, W, H);
    const pad = { t: 24, r: 20, b: 36, l: 60 };
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
    const maxV = Math.max(...data.map(d => d.deposit));
    const minV = Math.min(...data.map(d => d.net));
    const range = maxV - minV || 1;
    // Grid
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (cH / 4) * i;
      ctx.strokeStyle = "#ffffff0a"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(W - pad.r, y); ctx.stroke();
      const val = maxV - (range / 4) * i;
      ctx.fillStyle = "#555"; ctx.font = "10px monospace"; ctx.textAlign = "right";
      ctx.fillText(val >= 1000 ? (val / 1000).toFixed(0) + "K" : val.toFixed(0), pad.l - 5, y + 4);
    }
    const drawLine = (key, color, fill) => {
      const pts = data.map((d, i) => ({ x: pad.l + (i / (data.length - 1)) * cW, y: pad.t + ((maxV - d[key]) / range) * cH }));
      if (fill) {
        ctx.beginPath();
        pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, pad.t + cH); ctx.lineTo(pts[0].x, pad.t + cH); ctx.closePath();
        const g = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH);
        g.addColorStop(0, color + "33"); g.addColorStop(1, color + "00");
        ctx.fillStyle = g; ctx.fill();
      }
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
    };
    drawLine("deposit", "#FFD700", true);
    drawLine("withdraw", "#00BFFF", false);
    drawLine("net", "#00FF88", false);
    // X labels
    ctx.fillStyle = "#555"; ctx.font = "9px monospace"; ctx.textAlign = "center";
    data.forEach((d, i) => { if (i % 5 === 0) ctx.fillText(d.date, pad.l + (i / (data.length - 1)) * cW, H - 8); });
    // Legend
    [["充值","#FFD700"],["提款","#00BFFF"],["淨利","#00FF88"]].forEach(([l, c], i) => {
      ctx.fillStyle = c; ctx.fillRect(pad.l + i * 75, 6, 12, 3);
      ctx.fillStyle = "#aaa"; ctx.font = "10px sans-serif"; ctx.textAlign = "left";
      ctx.fillText(l, pad.l + i * 75 + 16, 13);
    });
  }, [data]);
  return <canvas ref={ref} style={{ width: "100%", height: 220 }} />;
}

function SearchBar({ value, onChange, placeholder, style }) {
  return (
    <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      style={{ padding: "8px 12px", background: "#111", border: "1px solid #FFD70044", borderRadius: 8, color: "#fff", fontSize: 13, ...style }} />
  );
}

function DateFilter({ start, end, onStart, onEnd, onReset }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
      <input type="date" value={start} onChange={e => onStart(e.target.value)}
        style={{ padding: "8px 10px", background: "#111", border: "1px solid #FFD70044", borderRadius: 8, color: "#fff", fontSize: 13 }} />
      <span style={{ color: "#555" }}>至</span>
      <input type="date" value={end} onChange={e => onEnd(e.target.value)}
        style={{ padding: "8px 10px", background: "#111", border: "1px solid #FFD70044", borderRadius: 8, color: "#fff", fontSize: 13 }} />
      <button onClick={onReset} style={{ padding: "8px 14px", background: "#222", border: "none", borderRadius: 8, color: "#888", cursor: "pointer", fontSize: 12 }}>重置</button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANALYTICS PANEL (Mock Data)
   ═══════════════════════════════════════════════════════════════════════════ */

function AnalyticsPanel() {
  // Generate mock data
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (29 - i));
    return d.toISOString().split("T")[0].slice(5);
  });

  const retentionData = days30.map((date, i) => ({
    date,
    day1: Math.round(40 + Math.random() * 25),
    day7: Math.round(20 + Math.random() * 15),
    day30: Math.round(8 + Math.random() * 10),
  }));

  const arpuData = days30.map((date, i) => ({
    date,
    arpu: +(5 + Math.random() * 15 + Math.sin(i / 5) * 3).toFixed(2),
  }));

  const activeUsersData = days30.map((date, i) => ({
    date,
    dau: Math.round(200 + Math.random() * 300 + Math.sin(i / 4) * 50),
    wau: Math.round(800 + Math.random() * 400),
    mau: Math.round(2000 + Math.random() * 800),
  }));

  const depositWithdrawData = days30.map((date, i) => ({
    date,
    deposit: Math.round(10000 + Math.random() * 40000),
    withdraw: Math.round(5000 + Math.random() * 20000),
  }));

  const newUsersData = days30.map((date, i) => ({
    date,
    count: Math.round(15 + Math.random() * 35 + Math.sin(i / 3) * 10),
  }));

  const gameBetData = [
    { name: "百家樂", pct: 28, color: "#FFD700" },
    { name: "老虎機", pct: 22, color: "#00BFFF" },
    { name: "輪盤", pct: 15, color: "#FF8800" },
    { name: "捕魚", pct: 12, color: "#00FF88" },
    { name: "真人百家樂", pct: 10, color: "#FF44FF" },
    { name: "骰寶", pct: 8, color: "#FF4444" },
    { name: "其他", pct: 5, color: "#888" },
  ];

  // CSS-only bar chart component
  const BarChart = ({ data, keys, colors, labels, height = 200 }) => {
    const maxVal = Math.max(...data.flatMap(d => keys.map(k => d[k] || 0)));
    const barW = Math.max(4, Math.floor((100 / data.length) * 0.7));
    return (
      <div>
        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
          {keys.map((k, i) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 4, borderRadius: 2, background: colors[i] }} />
              <span style={{ fontSize: 10, color: "#aaa" }}>{labels[i]}</span>
            </div>
          ))}
        </div>
        {/* Chart */}
        <div style={{ position: "relative", height, borderLeft: "1px solid #ffffff11", borderBottom: "1px solid #ffffff11", display: "flex", alignItems: "flex-end", gap: 1, paddingBottom: 20 }}>
          {/* Y-axis labels */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <div key={i} style={{ position: "absolute", left: -4, bottom: 20 + (height - 20) * pct, transform: "translateX(-100%)", fontSize: 9, color: "#444", paddingRight: 6 }}>
              {Math.round(maxVal * (1 - pct) * (pct === 0 ? 0 : 1) / (pct === 0 ? 1 : 1))}
            </div>
          ))}
          {data.map((d, di) => (
            <div key={di} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <div style={{ display: "flex", gap: 1, alignItems: "flex-end", height: height - 20 }}>
                {keys.map((k, ki) => (
                  <div key={k} style={{
                    width: Math.max(3, barW / keys.length),
                    height: `${Math.max(1, (d[k] / maxVal) * 100)}%`,
                    background: colors[ki],
                    borderRadius: "2px 2px 0 0",
                    transition: "height 0.5s",
                    opacity: 0.85,
                  }} />
                ))}
              </div>
              {di % Math.ceil(data.length / 8) === 0 && (
                <div style={{ fontSize: 8, color: "#444", marginTop: 2, whiteSpace: "nowrap" }}>{d.date}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // CSS-only line chart component
  const LineChart = ({ data, keys, colors, labels, height = 180, suffix = "" }) => {
    const allVals = data.flatMap(d => keys.map(k => d[k] || 0));
    const maxVal = Math.max(...allVals);
    const minVal = Math.min(...allVals);
    const range = maxVal - minVal || 1;
    return (
      <div>
        <div style={{ display: "flex", gap: 16, marginBottom: 10, flexWrap: "wrap" }}>
          {keys.map((k, i) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 12, height: 3, borderRadius: 2, background: colors[i] }} />
              <span style={{ fontSize: 10, color: "#aaa" }}>{labels[i]}</span>
            </div>
          ))}
        </div>
        <div style={{ position: "relative", height, borderLeft: "1px solid #ffffff11", borderBottom: "1px solid #ffffff11", paddingBottom: 20 }}>
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <div key={i} style={{ position: "absolute", left: 0, right: 0, bottom: 20 + (height - 20) * pct, borderTop: "1px solid #ffffff06" }}>
              <span style={{ position: "absolute", left: -4, transform: "translateX(-100%) translateY(-50%)", fontSize: 9, color: "#444", paddingRight: 6 }}>
                {(maxVal - range * pct).toFixed(suffix === "%" ? 0 : 1)}{suffix}
              </span>
            </div>
          ))}
          {/* SVG lines */}
          <svg style={{ position: "absolute", left: 0, top: 0, width: "100%", height: height - 20 }} viewBox={`0 0 ${data.length - 1} 100`} preserveAspectRatio="none">
            {keys.map((k, ki) => {
              const points = data.map((d, i) => `${i},${100 - ((d[k] - minVal) / range) * 100}`).join(" ");
              return <polyline key={k} points={points} fill="none" stroke={colors[ki]} strokeWidth="1.5" vectorEffect="non-scaling-stroke" />;
            })}
          </svg>
          {/* X labels */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, display: "flex", justifyContent: "space-between" }}>
            {data.filter((_, i) => i % Math.ceil(data.length / 8) === 0).map((d, i) => (
              <span key={i} style={{ fontSize: 8, color: "#444" }}>{d.date}</span>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // CSS-only pie chart (using conic-gradient)
  const PieChart = ({ data }) => {
    let cumPct = 0;
    const stops = data.map(d => {
      const start = cumPct;
      cumPct += d.pct;
      return `${d.color} ${start}% ${cumPct}%`;
    }).join(", ");
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 24, flexWrap: "wrap" }}>
        <div style={{
          width: 160, height: 160, borderRadius: "50%",
          background: `conic-gradient(${stops})`,
          boxShadow: "0 0 20px rgba(255,215,0,0.1)",
          flexShrink: 0,
        }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {data.map(d => (
            <div key={d.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: d.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "#ccc" }}>{d.name}</span>
              <span style={{ fontSize: 12, color: d.color, fontWeight: 700, fontFamily: "monospace" }}>{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const ChartCard = ({ title, children }) => (
    <div style={{ background: "#0d0d0d", border: "1px solid #FFD70022", borderRadius: 12, padding: 16, marginBottom: 14 }}>
      <div style={{ color: "#FFD700", fontWeight: 600, marginBottom: 12, fontSize: 13 }}>{title}</div>
      {children}
    </div>
  );

  // Summary stats
  const avgRetD1 = Math.round(retentionData.reduce((s, d) => s + d.day1, 0) / retentionData.length);
  const avgArpu = (arpuData.reduce((s, d) => s + d.arpu, 0) / arpuData.length).toFixed(2);
  const totalNewUsers = newUsersData.reduce((s, d) => s + d.count, 0);
  const avgDAU = Math.round(activeUsersData.reduce((s, d) => s + d.dau, 0) / activeUsersData.length);

  return (
    <>
      <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📉 數據分析面板</div>
      <div style={{ color: "#555", fontSize: 11, marginBottom: 14 }}>※ 目前展示模擬數據，待接入真實數據後自動替換</div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
        <StatCard title="平均日留存" value={`${avgRetD1}%`} icon="📈" color="#00FF88" />
        <StatCard title="ARPU" value={`$${avgArpu}`} icon="💰" color="#FFD700" />
        <StatCard title="30日新增用戶" value={totalNewUsers} icon="👥" color="#00BFFF" />
        <StatCard title="平均 DAU" value={avgDAU} icon="📊" color="#FF8800" />
      </div>

      {/* Retention Chart */}
      <ChartCard title="📈 留存率趨勢（日留存 / 7日 / 30日）">
        <LineChart
          data={retentionData}
          keys={["day1", "day7", "day30"]}
          colors={["#00FF88", "#00BFFF", "#FFD700"]}
          labels={["日留存", "7日留存", "30日留存"]}
          suffix="%"
        />
      </ChartCard>

      {/* ARPU Chart */}
      <ChartCard title="💰 ARPU（每用戶平均收入）趨勢">
        <LineChart
          data={arpuData}
          keys={["arpu"]}
          colors={["#FFD700"]}
          labels={["ARPU (USDT)"]}
          suffix=""
        />
      </ChartCard>

      {/* Active Users Chart */}
      <ChartCard title="📊 活躍用戶數趨勢">
        <LineChart
          data={activeUsersData}
          keys={["dau", "wau", "mau"]}
          colors={["#00FF88", "#00BFFF", "#FFD700"]}
          labels={["DAU", "WAU", "MAU"]}
        />
      </ChartCard>

      {/* Deposit/Withdraw Chart */}
      <ChartCard title="💵 充值 / 提款趨勢對比">
        <BarChart
          data={depositWithdrawData}
          keys={["deposit", "withdraw"]}
          colors={["#FFD700", "#00BFFF"]}
          labels={["充值", "提款"]}
        />
      </ChartCard>

      {/* New Users Chart */}
      <ChartCard title="👥 新增用戶趨勢">
        <BarChart
          data={newUsersData}
          keys={["count"]}
          colors={["#00BFFF"]}
          labels={["新增用戶"]}
          height={160}
        />
      </ChartCard>

      {/* Game Bet Pie Chart */}
      <ChartCard title="🎰 各遊戲類型下注佔比">
        <PieChart data={gameBetData} />
      </ChartCard>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════ */
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [adminToken, setAdminToken] = useState("");
  const [adminUser, setAdminUser] = useState({ username: "", role: "" });
  const [username, setUsername] = useState("");
  const [pwd, setPwd] = useState("");
  const [loginErr, setLoginErr] = useState("");
  const [tab, setTab] = useState("dashboard");

  // Admin Management
  const [adminList, setAdminList] = useState([]);
  const [adminLogs, setAdminLogs] = useState([]);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editAdmin, setEditAdmin] = useState(null);
  const [newAdmin, setNewAdmin] = useState({ username: "", password: "", role: "operator" });
  const [adminMsg, setAdminMsg] = useState("");

  // Users
  const [users, setUsers] = useState(MOCK_USERS);
  const [userSearch, setUserSearch] = useState("");

  // Adjust modal
  const [adjustModal, setAdjustModal] = useState(null);
  const [adjustAmt, setAdjustAmt] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [adjustOpPwd, setAdjustOpPwd] = useState("");
  const [adjustMsg, setAdjustMsg] = useState("");
  const [adjustLoading, setAdjustLoading] = useState(false);

  // Risk
  const [riskAlerts, setRiskAlerts] = useState(MOCK_RISK_ALERTS);

  // Reports filters
  const [gameSearch, setGameSearch] = useState("");
  const [gameFilter, setGameFilter] = useState("");
  const [gameStart, setGameStart] = useState("");
  const [gameEnd, setGameEnd] = useState("");
  const [txSearch, setTxSearch] = useState("");
  const [txStart, setTxStart] = useState("");
  const [txEnd, setTxEnd] = useState("");
  const [opSearch, setOpSearch] = useState("");
  const [opStart, setOpStart] = useState("");
  const [opEnd, setOpEnd] = useState("");
  const [reportPeriod, setReportPeriod] = useState("30d");

  // Announcements
  const [annList, setAnnList] = useState([]);
  const [annTitle, setAnnTitle] = useState("");
  const [annContent, setAnnContent] = useState("");
  const [annType, setAnnType] = useState("info");
  const [annPinned, setAnnPinned] = useState(false);
  const [annMsg, setAnnMsg] = useState("");

  // Tickets
  const [ticketList, setTicketList] = useState([]);
  const [replyModal, setReplyModal] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyMsg, setReplyMsg] = useState("");

  // Fetch users
  const fetchUsers = () => {
    if (!adminToken) return;
    fetch(`${BACKEND}/admin/users`, { headers: { Authorization: `Bearer ${adminToken}` } })
      .then(r => r.json()).then(data => {
        if (Array.isArray(data)) setUsers(data);
      }).catch(() => {});
  };

  // Fetch announcements
  const fetchAnnouncements = () => {
    fetch(`${BACKEND}/announcements`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setAnnList(data);
    }).catch(() => {});
  };

  // Fetch tickets
  const fetchTickets = () => {
    if (!adminToken) return;
    fetch(`${BACKEND}/admin/tickets`, { headers: { Authorization: `Bearer ${adminToken}` } })
      .then(r => r.json()).then(data => {
        if (Array.isArray(data)) setTicketList(data);
      }).catch(() => {});
  };

  useEffect(() => {
    if (authed) {
      fetchUsers();
      fetchAnnouncements();
      fetchTickets();
    }
  }, [authed]);

  // Login
  const handleLogin = async () => {
    setLoginErr("");
    try {
      const r = await fetch(`${BACKEND}/admin/login`, { 
        method: "POST", 
        headers: { "Content-Type": "application/json" }, 
        body: JSON.stringify({ username, password: pwd }) 
      });
      const d = await r.json();
      if (d.token) { 
        setAdminToken(d.token); 
        setAdminUser({ username: d.username, role: d.role });
        setAuthed(true); 
        // Set default tab based on role
        if (d.role === "support") setTab("tickets");
        return; 
      }
      if (d.error) { setLoginErr(d.error); return; }
    } catch (e) {
      setLoginErr("登入失敗，請檢查網絡連接");
    }
  };

  // Adjust balance
  const handleAdjust = async (type) => {
    setAdjustLoading(true); setAdjustMsg("");
    const amt = parseFloat(adjustAmt);
    if (!amt || amt <= 0) { setAdjustMsg("請輸入有效金額"); setAdjustLoading(false); return; }
    if (amt > 10000) { setAdjustMsg("❌ 單筆上分不能超過 10,000 USDT"); setAdjustLoading(false); return; }
    try {
      const r = await fetch(`${BACKEND}/admin/adjust-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ userId: adjustModal.id, amount: amt, type, reason: adjustReason }),
      });
      const d = await r.json();
      if (d.ok) {
        setAdjustMsg(`✅ ${type === "add" ? "上分" : "扣分"} ${amt} USDT 成功！`);
        setUsers(prev => prev.map(u => u.id === adjustModal.id ? { ...u, balance: d.newBalance ?? u.balance } : u));
        setTimeout(() => { setAdjustModal(null); setAdjustAmt(""); setAdjustReason(""); setAdjustOpPwd(""); setAdjustMsg(""); }, 2000);
        setAdjustLoading(false); return;
      } else {
        setAdjustMsg(`❌ ${d.error || "操作失敗"}`);
      }
    } catch (e) {
      setAdjustMsg("❌ 請求失敗");
    }
    setAdjustLoading(false);
  };

  // Admin Management Functions
  const fetchAdmins = async () => {
    if (adminUser.role !== "super_admin") return;
    try {
      const r = await fetch(`${BACKEND}/admin/admins`, { headers: { Authorization: `Bearer ${adminToken}` } });
      const d = await r.json();
      if (Array.isArray(d)) setAdminList(d);
    } catch {}
  };

  const fetchAdminLogs = async () => {
    if (adminUser.role !== "super_admin") return;
    try {
      const r = await fetch(`${BACKEND}/admin/logs`, { headers: { Authorization: `Bearer ${adminToken}` } });
      const d = await r.json();
      if (Array.isArray(d)) setAdminLogs(d);
    } catch {}
  };

  const handleSaveAdmin = async () => {
    setAdminMsg("");
    const isEdit = !!editAdmin;
    const url = isEdit ? `${BACKEND}/admin/admins/${editAdmin.id}` : `${BACKEND}/admin/admins`;
    const method = isEdit ? "PUT" : "POST";
    
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(newAdmin),
      });
      const d = await r.json();
      if (d.ok) {
        setAdminMsg(`✅ ${isEdit ? "更新" : "創建"}成功`);
        fetchAdmins();
        setTimeout(() => { setShowAdminModal(false); setEditAdmin(null); setNewAdmin({ username: "", password: "", role: "operator" }); setAdminMsg(""); }, 1500);
      } else {
        setAdminMsg(`❌ ${d.error || "操作失敗"}`);
      }
    } catch {
      setAdminMsg("❌ 請求失敗");
    }
  };

  const handleDeleteAdmin = async (id) => {
    if (!confirm("確定要刪除此管理員嗎？")) return;
    try {
      const r = await fetch(`${BACKEND}/admin/admins/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const d = await r.json();
      if (d.ok) { fetchAdmins(); } else { alert(d.error || "刪除失敗"); }
    } catch {}
  };

  useEffect(() => {
    if (authed && tab === "admins") {
      fetchAdmins();
      fetchAdminLogs();
    }
  }, [authed, tab]);

  // Filtered data
  const filteredUsers = users.filter(u => !userSearch || u.name.includes(userSearch) || String(u.tgId).includes(userSearch));
  const filteredGames = MOCK_GAME_RECORDS.filter(r => {
    if (gameSearch && !r.user.includes(gameSearch)) return false;
    if (gameFilter && r.game !== gameFilter) return false;
    if (gameStart && r.time < gameStart) return false;
    if (gameEnd && r.time > gameEnd + " 23:59:59") return false;
    return true;
  });
  const filteredTx = MOCK_TRANSFER_RECORDS.filter(r => {
    if (txSearch && !r.user.includes(txSearch)) return false;
    if (txStart && r.inTime < txStart) return false;
    if (txEnd && r.inTime > txEnd + " 23:59:59") return false;
    return true;
  });
  const filteredOps = MOCK_OP_LOGS.filter(r => {
    if (opSearch && !r.targetUser.includes(opSearch) && !r.operatorIp.includes(opSearch)) return false;
    if (opStart && r.time < opStart) return false;
    if (opEnd && r.time > opEnd + " 23:59:59") return false;
    return true;
  });

  const today = MOCK_REVENUE[MOCK_REVENUE.length - 1];
  const totalDep = MOCK_REVENUE.reduce((s, d) => s + d.deposit, 0);
  const totalNet = MOCK_REVENUE.reduce((s, d) => s + d.net, 0);
  const chartData = MOCK_REVENUE.slice(reportPeriod === "7d" ? -7 : reportPeriod === "90d" ? -90 : -30);

  /* ─── LOGIN ─── */
  if (!authed) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "sans-serif" }}>
      <div style={{ background: "linear-gradient(135deg, #0d0d0d, #1a1a1a)", border: "1px solid #FFD70066", borderRadius: 16, padding: 40, width: 340, textAlign: "center" }}>
        <div style={{ fontSize: 52, marginBottom: 8 }}>🐼</div>
        <div style={{ color: "#FFD700", fontSize: 22, fontWeight: 700, marginBottom: 4 }}>LA1 後台管理</div>
        <div style={{ color: "#555", fontSize: 12, marginBottom: 28 }}>Admin Panel v3.0 · 風控 + 報表 + 安全上分</div>
        <input type="text" placeholder="管理員帳號" value={username}
          onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{ width: "100%", padding: "12px 16px", background: "#111", border: "1px solid #FFD70044", borderRadius: 8, color: "#fff", fontSize: 15, marginBottom: 12, boxSizing: "border-box" }} />
        <input type="password" placeholder="管理員密碼" value={pwd}
          onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === "Enter" && handleLogin()}
          style={{ width: "100%", padding: "12px 16px", background: "#111", border: "1px solid #FFD70044", borderRadius: 8, color: "#fff", fontSize: 15, marginBottom: 12, boxSizing: "border-box" }} />
        {loginErr && <div style={{ color: "#FF4444", fontSize: 13, marginBottom: 10 }}>{loginErr}</div>}
        <button onClick={handleLogin}
          style={{ width: "100%", padding: 13, background: "linear-gradient(135deg, #FFD700, #B8860B)", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, fontSize: 16, cursor: "pointer" }}>
          登入後台
        </button>
        <div style={{ color: "#333", fontSize: 11, marginTop: 16 }}>LA1 AI Entertainment © 2026</div>
      </div>
    </div>
  );

  const ALL_TABS = [
    { id: "dashboard", label: "📊 營收面板", roles: ["super_admin", "operator"] },
    { id: "users", label: "👥 用戶管理", roles: ["super_admin", "operator"] },
    { id: "activity", label: "🎁 活動系統", roles: ["super_admin", "operator"] },
    { id: "agents", label: "🤝 代理系統", roles: ["super_admin", "operator"] },
    { id: "risk", label: "🛡️ 風控系統", roles: ["super_admin"] },
    { id: "oplogs", label: "📋 操作記錄", roles: ["super_admin"] },
    { id: "reports", label: "📈 報表", roles: ["super_admin", "operator"] },
    { id: "announcements", label: "📢 公告管理", roles: ["super_admin", "operator"] },
    { id: "tickets", label: "🎫 工單管理", roles: ["super_admin", "operator", "support"] },
    { id: "analytics", label: "📉 數據分析", roles: ["super_admin", "operator"] },
    { id: "admins", label: "🔐 管理員管理", roles: ["super_admin"] },
  ];

  const TABS = ALL_TABS.filter(t => t.roles.includes(adminUser.role));

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", fontFamily: "sans-serif" }}>
      {/* Header */}
      <div style={{ background: "#0a0a0a", borderBottom: "1px solid #FFD70033", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 26 }}>🐼</span>
          <div>
            <div style={{ color: "#FFD700", fontWeight: 700, fontSize: 16 }}>LA1 後台管理系統</div>
            <div style={{ color: "#555", fontSize: 10 }}>Admin Panel v3.0 · 黑金藍主題</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ background: "#00FF8822", border: "1px solid #00FF8855", borderRadius: 6, padding: "3px 10px", color: "#00FF88", fontSize: 11 }}>● 已連線</span>
          <button onClick={() => setAuthed(false)} style={{ background: "transparent", border: "1px solid #FF444455", borderRadius: 6, color: "#FF4444", padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>登出</button>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ background: "#050505", borderBottom: "1px solid #FFD70022", padding: "0 16px", display: "flex", overflowX: "auto", gap: 0 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? "#FFD70011" : "transparent",
            border: "none", borderBottom: tab === t.id ? "2px solid #FFD700" : "2px solid transparent",
            color: tab === t.id ? "#FFD700" : "#555", padding: "13px 16px", cursor: "pointer",
            fontSize: 12, fontWeight: tab === t.id ? 700 : 400, whiteSpace: "nowrap",
          }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: 16, maxWidth: 1400, margin: "0 auto" }}>

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && <>
          <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📊 營收面板</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10, marginBottom: 16 }}>
            <StatCard title="今日充值" value={`$${today.deposit.toLocaleString()}`} icon="💰" color="#FFD700" />
            <StatCard title="今日提款" value={`$${today.withdraw.toLocaleString()}`} icon="📤" color="#00BFFF" />
            <StatCard title="今日獎金" value={`$${today.bonus.toLocaleString()}`} icon="🎁" color="#FF8800" />
            <StatCard title="今日淨利" value={`${today.net >= 0 ? "+" : ""}$${today.net.toLocaleString()}`} icon="💎" color={today.net >= 0 ? "#00FF88" : "#FF4444"} />
            <StatCard title="總用戶數" value={users.length} icon="👥" color="#00BFFF" />
            <StatCard title="風控警告" value={riskAlerts.filter(a => !a.handled).length} sub="未處理" icon="🛡️" color="#FF4444" />
          </div>
          <div style={{ background: "#0d0d0d", border: "1px solid #FFD70033", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ color: "#FFD700", fontWeight: 600, marginBottom: 10, fontSize: 13 }}>📈 30 日營收趨勢</div>
            <RevenueChart data={MOCK_REVENUE} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ background: "#0d0d0d", border: "1px solid #FFD70022", borderRadius: 12, padding: 16 }}>
              <div style={{ color: "#FFD700", fontWeight: 600, marginBottom: 12, fontSize: 13 }}>🔽 轉化漏斗</div>
              {[["進站人數", rand(800,1200), "#FFD700", 100],["註冊人數", rand(200,400), "#00BFFF", 35],["充值人數", rand(80,150), "#FF8800", 15],["下注人數", rand(60,120), "#00FF88", 10]].map(([label, val, color, pct]) => (
                <div key={label} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "#888", fontSize: 12 }}>{label}</span>
                    <span style={{ color, fontWeight: 700, fontSize: 13 }}>{val.toLocaleString()}</span>
                  </div>
                  <div style={{ background: "#1a1a1a", borderRadius: 4, height: 5 }}>
                    <div style={{ background: color, width: `${pct}%`, height: "100%", borderRadius: 4 }} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ background: "#0d0d0d", border: "1px solid #FFD70022", borderRadius: 12, padding: 16 }}>
              <div style={{ color: "#FFD700", fontWeight: 600, marginBottom: 12, fontSize: 13 }}>📋 30 日累計</div>
              {[["總充值", `$${totalDep.toLocaleString()}`, "#FFD700"],["總淨利", `${totalNet >= 0 ? "+" : ""}$${totalNet.toLocaleString()}`, totalNet >= 0 ? "#00FF88" : "#FF4444"],["平均日充值", `$${Math.floor(totalDep / 30).toLocaleString()}`, "#00BFFF"],["今日新用戶", rand(5,25), "#aaa"],["今日VIP升級", rand(1,8), "#FFD700"],["今日簽到", rand(20,80), "#00FF88"]].map(([l, v, c]) => (
                <div key={l} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #ffffff06" }}>
                  <span style={{ color: "#777", fontSize: 12 }}>{l}</span>
                  <span style={{ color: c, fontWeight: 700, fontSize: 13 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </>}

        {/* ── USERS ── */}
        {tab === "users" && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700 }}>👥 用戶管理</div>
            <div style={{ display: "flex", gap: 8 }}>
              <SearchBar value={userSearch} onChange={setUserSearch} placeholder="搜尋用戶名 / TG ID" style={{ width: 200 }} />
              <span style={{ background: "#FFD70011", border: "1px solid #FFD70033", borderRadius: 8, padding: "8px 12px", color: "#FFD700", fontSize: 12 }}>共 {filteredUsers.length} 位</span>
            </div>
          </div>
          <div style={{ background: "#0d0d0d", border: "1px solid #FFD70022", borderRadius: 12, overflow: "hidden" }}>
            <DataTable
              cols={[
                { key: "id", label: "ID" },
                { key: "name", label: "TG 名稱" },
                { key: "tgId", label: "TG ID" },
                { key: "balance", label: "餘額", render: r => <span style={{ color: "#FFD700" }}>${r.balance.toFixed(2)}</span> },
                { key: "deposit", label: "累計充值", render: r => `$${r.deposit.toLocaleString()}` },
                { key: "bet", label: "累計投注", render: r => `$${r.bet.toLocaleString()}` },
                { key: "pnl", label: "盈虧", render: r => <span style={{ color: r.pnl >= 0 ? "#00FF88" : "#FF4444" }}>{r.pnl >= 0 ? "+" : ""}${r.pnl.toFixed(0)}</span> },
                { key: "vip", label: "VIP", render: r => <Badge text={`VIP${r.vip}`} /> },
                { key: "inviter", label: "來源" },
                { key: "risk", label: "風控", render: r => r.riskFlag ? <Badge text="高風險" /> : <span style={{ color: "#333" }}>—</span> },
                { key: "regDate", label: "註冊", render: r => r.regDate.slice(0, 10) },
                { key: "action", label: "操作", render: r => (
                  <button onClick={() => { setAdjustModal(r); setAdjustAmt(""); setAdjustReason(""); setAdjustOpPwd(""); setAdjustMsg(""); }}
                    style={{ background: "#FFD70022", border: "1px solid #FFD70055", borderRadius: 6, color: "#FFD700", padding: "4px 10px", cursor: "pointer", fontSize: 11 }}>上分/扣分</button>
                )},
              ]}
              rows={filteredUsers}
            />
          </div>
        </>}

        {/* ── ACTIVITY ── */}
        {tab === "activity" && <>
          <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>🎁 活動系統管理</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
            <StatCard title="首充領取" value={rand(20,80)} sub="本月" icon="🎁" color="#FFD700" />
            <StatCard title="簽到次數" value={rand(200,500)} sub="本月" icon="✅" color="#00FF88" />
            <StatCard title="邀請佣金" value={`$${rand(5000,20000).toLocaleString()}`} sub="本月" icon="🤝" color="#00BFFF" />
            <StatCard title="VIP 升級" value={rand(10,40)} sub="本月" icon="🏆" color="#FF8800" />
          </div>
          {[
            { title: "🎁 首充領取記錄", cols: [
              { key: "user", label: "用戶" },
              { key: "type", label: "方案" },
              { key: "amount", label: "獎金", render: r => <span style={{ color: "#00FF88" }}>+${r.amount}</span> },
              { key: "turnover", label: "流水要求" },
              { key: "status", label: "狀態", render: r => <Badge text={r.status} /> },
              { key: "time", label: "時間" },
            ], rows: Array.from({ length: 8 }, () => ({ user: TG_NAMES[rand(0,TG_NAMES.length-1)], type: Math.random()>0.5?"充100送38":"充30送10", amount: Math.random()>0.5?38:10, turnover: Math.random()>0.5?"10倍":"8倍", status: Math.random()>0.3?"已完成":"進行中", time: genDate(rand(0,14),rand(0,23)) })) },
            { title: "🤝 邀請佣金記錄", cols: [
              { key: "agent", label: "代理" },
              { key: "referred", label: "被邀請人" },
              { key: "level", label: "層級", render: r => <Badge text={r.level} /> },
              { key: "commission", label: "佣金", render: r => <span style={{ color: "#00FF88" }}>+${r.commission}</span> },
              { key: "time", label: "時間" },
            ], rows: Array.from({ length: 10 }, () => ({ agent: TG_NAMES[rand(0,5)], referred: TG_NAMES[rand(6,TG_NAMES.length-1)], level: Math.random()>0.3?"直推":"二級", commission: randF(10,500), time: genDate(rand(0,14),rand(0,23)) })) },
            { title: "✅ 簽到記錄", cols: [
              { key: "user", label: "用戶" },
              { key: "day", label: "第幾天", render: r => `第 ${r.day} 天` },
              { key: "reward", label: "獎勵", render: r => <span style={{ color: "#00FF88" }}>+${r.reward} USDT</span> },
              { key: "time", label: "時間" },
            ], rows: Array.from({ length: 12 }, () => ({ user: TG_NAMES[rand(0,TG_NAMES.length-1)], day: rand(1,7), reward: [0.5,0.5,1,1,1.5,1.5,3][rand(0,6)], time: genDate(rand(0,7),rand(0,23)) })) },
          ].map(section => (
            <div key={section.title} style={{ background: "#0d0d0d", border: "1px solid #FFD70022", borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ color: "#FFD700", fontWeight: 600, marginBottom: 10, fontSize: 13 }}>{section.title}</div>
              <DataTable cols={section.cols} rows={section.rows} />
            </div>
          ))}
        </>}

        {/* ── AGENTS ── */}
        {tab === "agents" && <>
          <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>🤝 代理系統</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
            <StatCard title="總代理數" value={MOCK_AGENTS.length} icon="🤝" color="#FFD700" />
            <StatCard title="總帶人數" value={MOCK_AGENTS.reduce((s,a)=>s+a.members,0)} icon="👥" color="#00BFFF" />
            <StatCard title="總流水" value={`$${MOCK_AGENTS.reduce((s,a)=>s+a.flow,0).toLocaleString()}`} icon="💰" color="#FF8800" />
            <StatCard title="總佣金" value={`$${MOCK_AGENTS.reduce((s,a)=>s+a.commission,0).toLocaleString()}`} icon="💎" color="#00FF88" />
          </div>
          <div style={{ background: "#0d0d0d", border: "1px solid #FFD70022", borderRadius: 12, overflow: "hidden" }}>
            <DataTable
              cols={[
                { key: "id", label: "代理ID" },
                { key: "name", label: "名稱" },
                { key: "level", label: "等級", render: r => <Badge text={r.level} /> },
                { key: "members", label: "帶人數" },
                { key: "flow", label: "總流水", render: r => `$${r.flow.toLocaleString()}` },
                { key: "commission", label: "佣金", render: r => <span style={{ color: "#00FF88" }}>${r.commission.toLocaleString()}</span> },
                { key: "rate", label: "佣金比例" },
              ]}
              rows={MOCK_AGENTS}
            />
          </div>
        </>}

        {/* ── RISK ── */}
        {tab === "risk" && <>
          <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>🛡️ 風控系統</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
            <StatCard title="高風險" value={riskAlerts.filter(a=>a.level==="高風險").length} icon="🚨" color="#FF4444" />
            <StatCard title="中風險" value={riskAlerts.filter(a=>a.level==="中風險").length} icon="⚠️" color="#FF8800" />
            <StatCard title="未處理" value={riskAlerts.filter(a=>!a.handled).length} icon="🔔" color="#FF4444" />
            <StatCard title="已處理" value={riskAlerts.filter(a=>a.handled).length} icon="✅" color="#00FF88" />
          </div>
          <div style={{ background: "#0d0d0d", border: "1px solid #FF444422", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ color: "#FF4444", fontWeight: 600, marginBottom: 10, fontSize: 13 }}>🚨 異常警告列表</div>
            <DataTable
              cols={[
                { key: "type", label: "類型", render: r => <Badge text={r.type} /> },
                { key: "level", label: "風險", render: r => <Badge text={r.level} /> },
                { key: "username", label: "用戶" },
                { key: "detail", label: "詳情" },
                { key: "action", label: "建議", render: r => <Badge text={r.action} /> },
                { key: "time", label: "時間", render: r => r.time.slice(0,16) },
                { key: "status", label: "狀態", render: r => <Badge text={r.handled ? "已處理" : "待處理"} /> },
                { key: "ops", label: "操作", render: r => !r.handled && (
                  <button onClick={() => setRiskAlerts(p => p.map(a => a.id === r.id ? { ...a, handled: true } : a))}
                    style={{ background: "#00FF8822", border: "1px solid #00FF8855", borderRadius: 6, color: "#00FF88", padding: "3px 8px", cursor: "pointer", fontSize: 11 }}>標記處理</button>
                )},
              ]}
              rows={riskAlerts}
            />
          </div>
          <div style={{ background: "#0d0d0d", border: "1px solid #FF444422", borderRadius: 12, padding: 14 }}>
            <div style={{ color: "#FF4444", fontWeight: 600, marginBottom: 10, fontSize: 13 }}>🌐 多帳號 IP 檢測</div>
            <DataTable
              cols={[
                { key: "ip", label: "IP 地址" },
                { key: "accountCount", label: "關聯帳號數" },
                { key: "accounts", label: "帳號列表", render: r => r.accounts.join("、") },
                { key: "risk", label: "風險", render: r => <Badge text={r.risk} /> },
              ]}
              rows={MOCK_IP_DATA}
            />
          </div>
        </>}

        {/* ── OP LOGS ── */}
        {tab === "oplogs" && <>
          <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📋 操作記錄</div>
          <div style={{ display: "flex", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
            <SearchBar value={opSearch} onChange={setOpSearch} placeholder="搜尋用戶名 / IP" style={{ width: 180 }} />
            <DateFilter start={opStart} end={opEnd} onStart={setOpStart} onEnd={setOpEnd} onReset={() => { setOpSearch(""); setOpStart(""); setOpEnd(""); }} />
            <span style={{ color: "#555", fontSize: 12, lineHeight: "36px" }}>共 {filteredOps.length} 筆</span>
          </div>
          <div style={{ background: "#0d0d0d", border: "1px solid #FFD70022", borderRadius: 12, overflow: "hidden" }}>
            <DataTable
              cols={[
                { key: "id", label: "#" },
                { key: "action", label: "動作", render: r => <Badge text={r.action} /> },
                { key: "targetUser", label: "目標用戶" },
                { key: "amount", label: "金額", render: r => <span style={{ color: r.action === "上分" ? "#00FF88" : "#FF4444" }}>{r.action === "上分" ? "+" : "-"}${r.amount}</span> },
                { key: "reason", label: "原因" },
                { key: "operatorIp", label: "操作者IP" },
                { key: "opVerified", label: "操作密碼", render: r => <Badge text={r.opVerified ? "已驗證" : "未驗證"} /> },
                { key: "time", label: "時間", render: r => r.time.slice(0,16) },
              ]}
              rows={filteredOps}
            />
          </div>
        </>}

        {/* ── REPORTS ── */}
        {tab === "reports" && <>
          <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📈 報表系統</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {[["7d","近7天"],["30d","近30天"],["90d","近90天"]].map(([v,l]) => (
              <button key={v} onClick={() => setReportPeriod(v)} style={{
                padding: "8px 16px", background: reportPeriod===v ? "linear-gradient(135deg,#FFD700,#B8860B)" : "#111",
                border: `1px solid ${reportPeriod===v ? "#FFD700" : "#333"}`, borderRadius: 8,
                color: reportPeriod===v ? "#000" : "#888", cursor: "pointer", fontWeight: reportPeriod===v ? 700 : 400, fontSize: 13,
              }}>{l}</button>
            ))}
          </div>
          <div style={{ background: "#0d0d0d", border: "1px solid #FFD70033", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ color: "#FFD700", fontWeight: 600, marginBottom: 10, fontSize: 13 }}>📈 營收趨勢圖</div>
            <RevenueChart data={chartData} />
          </div>

          {/* Game Records */}
          <div style={{ background: "#0d0d0d", border: "1px solid #FFD70022", borderRadius: 12, padding: 14, marginBottom: 14 }}>
            <div style={{ color: "#FFD700", fontWeight: 600, marginBottom: 10, fontSize: 13 }}>🎮 遊戲紀錄</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <SearchBar value={gameSearch} onChange={setGameSearch} placeholder="搜尋用戶名" style={{ width: 150 }} />
              <select value={gameFilter} onChange={e => setGameFilter(e.target.value)}
                style={{ padding: "8px 10px", background: "#111", border: "1px solid #FFD70044", borderRadius: 8, color: "#fff", fontSize: 13 }}>
                <option value="">全部遊戲</option>
                {GAMES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <DateFilter start={gameStart} end={gameEnd} onStart={setGameStart} onEnd={setGameEnd} onReset={() => { setGameSearch(""); setGameFilter(""); setGameStart(""); setGameEnd(""); }} />
              <span style={{ color: "#555", fontSize: 12, lineHeight: "36px" }}>共 {filteredGames.length} 筆</span>
            </div>
            <DataTable
              cols={[
                { key: "user", label: "用戶名稱" },
                { key: "game", label: "遊戲" },
                { key: "betType", label: "下注類別" },
                { key: "amount", label: "下注金額", render: r => `$${r.amount.toFixed(2)}` },
                { key: "result", label: "賽果", render: r => <Badge text={r.result} /> },
                { key: "pnl", label: "盈虧", render: r => <span style={{ color: r.pnl > 0 ? "#00FF88" : r.pnl < 0 ? "#FF4444" : "#888" }}>{r.pnl > 0 ? "+" : ""}{r.pnl.toFixed(2)}</span> },
                { key: "time", label: "時間", render: r => r.time.slice(0,16) },
              ]}
              rows={filteredGames.slice(0, 100)}
            />
          </div>

          {/* Transfer Records */}
          <div style={{ background: "#0d0d0d", border: "1px solid #FFD70022", borderRadius: 12, padding: 14 }}>
            <div style={{ color: "#FFD700", fontWeight: 600, marginBottom: 10, fontSize: 13 }}>🔄 點數轉入紀錄</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <SearchBar value={txSearch} onChange={setTxSearch} placeholder="搜尋用戶名" style={{ width: 150 }} />
              <DateFilter start={txStart} end={txEnd} onStart={setTxStart} onEnd={setTxEnd} onReset={() => { setTxSearch(""); setTxStart(""); setTxEnd(""); }} />
              <span style={{ color: "#555", fontSize: 12, lineHeight: "36px" }}>共 {filteredTx.length} 筆</span>
            </div>
            <DataTable
              cols={[
                { key: "user", label: "用戶名稱" },
                { key: "platform", label: "轉入遊戲" },
                { key: "inAmount", label: "轉入金額", render: r => <span style={{ color: "#FFD700" }}>+${r.inAmount.toFixed(2)}</span> },
                { key: "inTime", label: "轉入時間", render: r => r.inTime.slice(0,16) },
                { key: "outAmount", label: "轉出金額", render: r => <span style={{ color: r.outAmount > r.inAmount ? "#00FF88" : "#FF4444" }}>${r.outAmount.toFixed(2)}</span> },
                { key: "outTime", label: "轉出時間", render: r => r.outTime.slice(0,16) },
                { key: "status", label: "狀態", render: r => <Badge text={r.status} /> },
              ]}
              rows={filteredTx}
            />
          </div>
        </>}

        {/* ── ANNOUNCEMENTS ── */}
        {tab === "announcements" && <>
          <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>📢 公告管理</div>
          {/* Create Announcement */}
          <div style={{ background: "#0d0d0d", border: "1px solid #FFD70022", borderRadius: 12, padding: 16, marginBottom: 16 }}>
            <div style={{ color: "#FFD700", fontWeight: 600, marginBottom: 12, fontSize: 13 }}>新增公告</div>
            <div style={{ display: "flex", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
              <input placeholder="公告標題" value={annTitle} onChange={e => setAnnTitle(e.target.value)}
                style={{ flex: 1, minWidth: 150, padding: "10px 14px", background: "#111", border: "1px solid #FFD70044", borderRadius: 8, color: "#fff", fontSize: 13 }} />
              <select value={annType} onChange={e => setAnnType(e.target.value)}
                style={{ padding: "10px 12px", background: "#111", border: "1px solid #FFD70044", borderRadius: 8, color: "#fff", fontSize: 13 }}>
                <option value="info">📢 一般通知</option>
                <option value="warning">⚠️ 警告</option>
                <option value="promo">🎁 優惠活動</option>
                <option value="maintenance">🔧 維護通知</option>
              </select>
              <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#888", fontSize: 12, cursor: "pointer" }}>
                <input type="checkbox" checked={annPinned} onChange={e => setAnnPinned(e.target.checked)} />
                置頂
              </label>
            </div>
            <textarea placeholder="公告內容" value={annContent} onChange={e => setAnnContent(e.target.value)}
              style={{ width: "100%", minHeight: 80, padding: "10px 14px", background: "#111", border: "1px solid #FFD70044", borderRadius: 8, color: "#fff", fontSize: 13, resize: "vertical", boxSizing: "border-box", marginBottom: 10 }} />
            {annMsg && <div style={{ color: annMsg.startsWith("✅") ? "#00FF88" : "#FF4444", fontSize: 12, marginBottom: 8 }}>{annMsg}</div>}
            <button onClick={async () => {
              if (!annTitle || !annContent) { setAnnMsg("❗ 請填寫標題和內容"); return; }
              try {
                const r = await fetch(`${BACKEND}/admin/announcement`, {
                  method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
                  body: JSON.stringify({ title: annTitle, content: annContent, type: annType, pinned: annPinned }),
                });
                const d = await r.json();
                if (d.ok) { setAnnMsg("✅ 公告已發布"); setAnnTitle(""); setAnnContent(""); setAnnPinned(false); fetchAnnouncements(); }
                else setAnnMsg(`❌ ${d.error || "發布失敗"}`);
              } catch { setAnnMsg("❌ 網絡錯誤"); }
            }} style={{ padding: "10px 24px", background: "linear-gradient(135deg,#FFD700,#B8860B)", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
              發布公告
            </button>
          </div>
          {/* Announcement List */}
          <div style={{ background: "#0d0d0d", border: "1px solid #FFD70022", borderRadius: 12, padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ color: "#FFD700", fontWeight: 600, fontSize: 13 }}>公告列表</div>
              <button onClick={fetchAnnouncements} style={{ padding: "5px 12px", background: "#222", border: "1px solid #FFD70033", borderRadius: 6, color: "#FFD700", cursor: "pointer", fontSize: 11 }}>刷新</button>
            </div>
            <DataTable
              cols={[
                { key: "id", label: "ID" },
                { key: "type", label: "類型", render: r => {
                  const map = { info: "📢 一般", warning: "⚠️ 警告", promo: "🎁 優惠", maintenance: "🔧 維護" };
                  return <span style={{ fontSize: 11 }}>{map[r.type] || r.type}</span>;
                }},
                { key: "title", label: "標題" },
                { key: "content", label: "內容", render: r => <span style={{ maxWidth: 200, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.content}</span> },
                { key: "pinned", label: "置頂", render: r => r.pinned ? <span style={{ color: "#FFD700" }}>★</span> : <span style={{ color: "#333" }}>—</span> },
                { key: "created_at", label: "建立時間", render: r => (r.created_at || "").slice(0, 16) },
                { key: "action", label: "操作", render: r => (
                  <button onClick={async () => {
                    if (!confirm("確定刪除此公告？")) return;
                    try {
                      await fetch(`${BACKEND}/admin/announcement/${r.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${adminToken}` } });
                      fetchAnnouncements();
                    } catch {}
                  }} style={{ background: "#FF444422", border: "1px solid #FF444455", borderRadius: 6, color: "#FF4444", padding: "3px 10px", cursor: "pointer", fontSize: 11 }}>刪除</button>
                )},
              ]}
              rows={annList}
            />
          </div>
        </>}

        {/* ── TICKETS ── */}
        {tab === "tickets" && <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ color: "#FFD700", fontSize: 16, fontWeight: 700 }}>🎫 工單管理</div>
            <button onClick={fetchTickets} style={{ padding: "6px 14px", background: "#222", border: "1px solid #FFD70033", borderRadius: 6, color: "#FFD700", cursor: "pointer", fontSize: 12 }}>刷新</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
            <StatCard title="總工單" value={ticketList.length} icon="🎫" color="#FFD700" />
            <StatCard title="待處理" value={ticketList.filter(t=>t.status==="open").length} icon="🔔" color="#FF4444" />
            <StatCard title="已回覆" value={ticketList.filter(t=>t.status==="replied").length} icon="✅" color="#00FF88" />
            <StatCard title="已關閉" value={ticketList.filter(t=>t.status==="closed").length} icon="💪" color="#00BFFF" />
          </div>
          <div style={{ background: "#0d0d0d", border: "1px solid #FFD70022", borderRadius: 12, overflow: "hidden" }}>
            <DataTable
              cols={[
                { key: "id", label: "#" },
                { key: "user", label: "用戶", render: r => r.tg_first_name || r.tg_username || r.username || `ID:${r.user_id}` },
                { key: "subject", label: "主題" },
                { key: "message", label: "內容", render: r => <span style={{ maxWidth: 180, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.message}</span> },
                { key: "status", label: "狀態", render: r => {
                  const map = { open: ["#FF4444", "待處理"], replied: ["#00FF88", "已回覆"], closed: ["#888", "已關閉"] };
                  const [c, t] = map[r.status] || ["#888", r.status];
                  return <span style={{ background: c+"22", color: c, border: `1px solid ${c}55`, borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600 }}>{t}</span>;
                }},
                { key: "admin_reply", label: "回覆", render: r => r.admin_reply ? <span style={{ maxWidth: 150, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#00FF88" }}>{r.admin_reply}</span> : <span style={{ color: "#333" }}>—</span> },
                { key: "created_at", label: "提交時間", render: r => (r.created_at || "").slice(0, 16) },
                { key: "action", label: "操作", render: r => r.status === "open" ? (
                  <button onClick={() => { setReplyModal(r); setReplyText(""); setReplyMsg(""); }}
                    style={{ background: "#00BFFF22", border: "1px solid #00BFFF55", borderRadius: 6, color: "#00BFFF", padding: "3px 10px", cursor: "pointer", fontSize: 11 }}>回覆</button>
                ) : null },
              ]}
              rows={ticketList}
            />
          </div>
        </>}

        {/* ── ANALYTICS ── */}
        {tab === "analytics" && <AnalyticsPanel />}

      </div>

      {/* ── TICKET REPLY MODAL ── */}
      {replyModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000dd", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#111", border: "1px solid #00BFFF66", borderRadius: 16, padding: 28, width: 400, maxWidth: "90vw" }}>
            <div style={{ color: "#00BFFF", fontSize: 17, fontWeight: 700, marginBottom: 4 }}>📩 回覆工單 #{replyModal.id}</div>
            <div style={{ color: "#777", fontSize: 12, marginBottom: 6 }}>用戶：{replyModal.tg_first_name || replyModal.tg_username || replyModal.username || `ID:${replyModal.user_id}`}</div>
            <div style={{ color: "#aaa", fontSize: 12, marginBottom: 6 }}>主題：{replyModal.subject}</div>
            <div style={{ background: "#0d0d0d", border: "1px solid #ffffff11", borderRadius: 8, padding: "10px 14px", color: "#ccc", fontSize: 12, marginBottom: 14, maxHeight: 100, overflow: "auto" }}>{replyModal.message}</div>
            <textarea placeholder="輸入回覆內容..." value={replyText} onChange={e => setReplyText(e.target.value)}
              style={{ width: "100%", minHeight: 80, padding: "10px 14px", background: "#0d0d0d", border: "1px solid #00BFFF44", borderRadius: 8, color: "#fff", fontSize: 13, resize: "vertical", boxSizing: "border-box", marginBottom: 10 }} />
            {replyMsg && <div style={{ color: replyMsg.startsWith("✅") ? "#00FF88" : "#FF4444", fontSize: 12, marginBottom: 8 }}>{replyMsg}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={async () => {
                if (!replyText.trim()) { setReplyMsg("❗ 請輸入回覆內容"); return; }
                try {
                  const r = await fetch(`${BACKEND}/admin/reply-ticket`, {
                    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${adminToken}` },
                    body: JSON.stringify({ ticketId: replyModal.id, reply: replyText }),
                  });
                  const d = await r.json();
                  if (d.ok) { setReplyMsg("✅ 回覆成功"); fetchTickets(); setTimeout(() => setReplyModal(null), 1500); }
                  else setReplyMsg(`❌ ${d.error || "回覆失敗"}`);
                } catch { setReplyMsg("❌ 網絡錯誤"); }
              }} style={{ flex: 1, padding: 11, background: "linear-gradient(135deg,#00BFFF,#1E90FF)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>發送回覆</button>
              <button onClick={() => setReplyModal(null)}
                style={{ padding: "11px 14px", background: "#222", border: "1px solid #444", borderRadius: 8, color: "#888", cursor: "pointer", fontSize: 13 }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADMIN MODAL ── */}
      {showAdminModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000dd", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#111", border: "1px solid #FFD70066", borderRadius: 16, padding: 28, width: 360, maxWidth: "90vw" }}>
            <div style={{ color: "#FFD700", fontSize: 17, fontWeight: 700, marginBottom: 16 }}>{editAdmin ? "編輯管理員" : "新增管理員"}</div>
            
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#888", fontSize: 11, marginBottom: 5 }}>帳號</div>
              <input type="text" placeholder="帳號" value={newAdmin.username} disabled={!!editAdmin} onChange={e => setNewAdmin({...newAdmin, username: e.target.value})}
                style={{ width: "100%", padding: "10px 14px", background: "#0d0d0d", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#888", fontSize: 11, marginBottom: 5 }}>密碼 {editAdmin && "(留空表示不修改)"}</div>
              <input type="password" placeholder="密碼" value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})}
                style={{ width: "100%", padding: "10px 14px", background: "#0d0d0d", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#888", fontSize: 11, marginBottom: 5 }}>角色</div>
              <select value={newAdmin.role} onChange={e => setNewAdmin({...newAdmin, role: e.target.value})}
                style={{ width: "100%", padding: "10px 14px", background: "#0d0d0d", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box" }}>
                <option value="super_admin">超級管理員 (super_admin)</option>
                <option value="operator">運營人員 (operator)</option>
                <option value="support">客服人員 (support)</option>
              </select>
            </div>

            {editAdmin && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "#888", fontSize: 11, marginBottom: 5 }}>狀態</div>
                <select value={newAdmin.status} onChange={e => setNewAdmin({...newAdmin, status: e.target.value})}
                  style={{ width: "100%", padding: "10px 14px", background: "#0d0d0d", border: "1px solid #333", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box" }}>
                  <option value="active">啟用</option>
                  <option value="disabled">停用</option>
                </select>
              </div>
            )}
            
            {adminMsg && <div style={{ color: adminMsg.includes("✅") ? "#00FF88" : "#FF4444", fontSize: 12, marginBottom: 12 }}>{adminMsg}</div>}
            
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleSaveAdmin}
                style={{ flex: 1, padding: 11, background: "linear-gradient(135deg,#FFD700,#B8860B)", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>儲存</button>
              <button onClick={() => setShowAdminModal(false)}
                style={{ padding: "11px 14px", background: "#222", border: "1px solid #444", borderRadius: 8, color: "#888", cursor: "pointer", fontSize: 13 }}>取消</button>
            </div>
          </div>
        </div>
      )}

      {/* ── ADJUST MODAL ── */}
      {adjustModal && (
        <div style={{ position: "fixed", inset: 0, background: "#000000dd", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
          <div style={{ background: "#111", border: "1px solid #FFD70066", borderRadius: 16, padding: 28, width: 360, maxWidth: "90vw" }}>
            <div style={{ color: "#FFD700", fontSize: 17, fontWeight: 700, marginBottom: 4 }}>💰 上分 / 扣分</div>
            <div style={{ color: "#777", fontSize: 12, marginBottom: 20 }}>用戶：{adjustModal.name} · 當前餘額：${adjustModal.balance.toFixed(2)}</div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#888", fontSize: 11, marginBottom: 5 }}>金額（USDT）<span style={{ color: "#555" }}> · 單筆上限 10,000</span></div>
              <input type="number" placeholder="請輸入金額" value={adjustAmt} onChange={e => setAdjustAmt(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", background: "#0d0d0d", border: "1px solid #FFD70044", borderRadius: 8, color: "#fff", fontSize: 15, boxSizing: "border-box" }} />
            </div>
            <div style={{ marginBottom: 12 }}>
              <div style={{ color: "#888", fontSize: 11, marginBottom: 5 }}>備註原因</div>
              <input placeholder="例如：首充確認、活動補發" value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                style={{ width: "100%", padding: "10px 14px", background: "#0d0d0d", border: "1px solid #FFD70044", borderRadius: 8, color: "#fff", fontSize: 14, boxSizing: "border-box" }} />
            </div>
            {adjustMsg && (
              <div style={{ background: adjustMsg.startsWith("✅") ? "#00FF8811" : "#FF444411", border: `1px solid ${adjustMsg.startsWith("✅") ? "#00FF8844" : "#FF444444"}`, borderRadius: 8, padding: "10px 14px", color: adjustMsg.startsWith("✅") ? "#00FF88" : "#FF4444", fontSize: 13, marginBottom: 14 }}>
                {adjustMsg}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => handleAdjust("add")} disabled={adjustLoading}
                style={{ flex: 1, padding: 11, background: "linear-gradient(135deg,#00FF88,#00AA55)", border: "none", borderRadius: 8, color: "#000", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>⬆️ 上分</button>
              <button onClick={() => handleAdjust("deduct")} disabled={adjustLoading}
                style={{ flex: 1, padding: 11, background: "linear-gradient(135deg,#FF4444,#AA0000)", border: "none", borderRadius: 8, color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>⬇️ 扣分</button>
              <button onClick={() => setAdjustModal(null)}
                style={{ padding: "11px 14px", background: "#222", border: "1px solid #444", borderRadius: 8, color: "#888", cursor: "pointer", fontSize: 13 }}>取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
