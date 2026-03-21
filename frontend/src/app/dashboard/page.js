"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../i18n/LanguageContext";

export default function DashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    const stored = localStorage.getItem("la1_user");
    if (!stored) { router.push("/login"); return; }
    setUser(JSON.parse(stored));
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("la1_user");
    router.push("/");
  };

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ color: "#FFD700", fontSize: 16 }}>{t("dashboard.loading")}</div>
    </div>
  );

  const games = [
    { icon: "🎰", name: t("dashboard.slot"), tag: t("dashboard.hot"), color: "#FFD700" },
    { icon: "🎡", name: t("dashboard.roulette"), tag: t("dashboard.classic"), color: "#00BFFF" },
    { icon: "🃏", name: t("dashboard.baccarat"), tag: t("dashboard.vipBadge"), color: "#FFD700" },
    { icon: "🤖", name: t("dashboard.aiGame"), tag: t("dashboard.newBadge"), color: "#00BFFF" },
    { icon: "📹", name: t("dashboard.liveGame"), tag: t("dashboard.liveBadge"), color: "#FFD700" },
  ];

  const quickActions = [
    { icon: "💰", label: t("dashboard.deposit"), href: "/deposit", gold: true },
    { icon: "📤", label: t("dashboard.withdraw"), href: "https://t.me/LA1111_bot", external: true },
    { icon: "📋", label: t("dashboard.history"), href: "https://t.me/LA1111_bot", external: true },
    { icon: "🎁", label: t("dashboard.promo"), href: "https://t.me/LA1111_bot", external: true },
  ];

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #050510 0%, #0a0a0a 100%)",
      fontFamily: "'Segoe UI', sans-serif",
      color: "#fff",
      maxWidth: 480,
      margin: "0 auto",
      position: "relative",
      paddingBottom: 80,
    }}>
      {/* Top Bar */}
      <div style={{
        background: "rgba(0,0,0,0.95)",
        borderBottom: "1px solid rgba(255,215,0,0.15)",
        padding: "14px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg, #FFD700, #D4AF37)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 900, color: "#000",
          }}>LA1</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#FFD700" }}>{user.username}</div>
            <div style={{ fontSize: 11, color: "#00BFFF" }}>{user.vip}</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <a href="https://t.me/LA1111_bot" target="_blank" rel="noopener noreferrer" style={{
            padding: "6px 12px",
            background: "rgba(0,191,255,0.1)",
            border: "1px solid rgba(0,191,255,0.3)",
            borderRadius: 20,
            color: "#00BFFF",
            fontSize: 12,
            textDecoration: "none",
          }}>{t("nav.service")}</a>
          <button onClick={handleLogout} style={{
            background: "none",
            border: "none",
            color: "#555",
            fontSize: 12,
            cursor: "pointer",
          }}>{t("dashboard.logout")}</button>
        </div>
      </div>

      {/* Balance Card */}
      <div style={{
        margin: "16px",
        background: "linear-gradient(135deg, rgba(255,215,0,0.12) 0%, rgba(30,144,255,0.08) 50%, rgba(0,0,0,0.5) 100%)",
        border: "1px solid rgba(255,215,0,0.35)",
        borderRadius: 18,
        padding: "24px 20px",
        boxShadow: "0 0 40px rgba(255,215,0,0.1), 0 0 80px rgba(0,191,255,0.05)",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: -30, right: -30,
          width: 120, height: 120, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0,191,255,0.15), transparent 70%)",
          pointerEvents: "none",
        }} />
        <div style={{ color: "#888", fontSize: 12, marginBottom: 6, letterSpacing: 1 }}>{t("dashboard.balance")}</div>
        <div style={{
          fontSize: 40, fontWeight: 900,
          background: "linear-gradient(135deg, #FFD700, #FFA500)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          letterSpacing: 1, lineHeight: 1.1,
        }}>$ {(user.balance || 0).toFixed(2)}</div>
        <div style={{ color: "#555", fontSize: 11, marginTop: 4 }}>≈ USDT {(user.balance || 0).toFixed(2)}</div>

        {/* Quick Action Row */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          {quickActions.map((a) => (
            <a key={a.label}
              href={a.href}
              target={a.external ? "_blank" : "_self"}
              rel={a.external ? "noopener noreferrer" : undefined}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
                padding: "10px 4px",
                background: a.gold
                  ? "linear-gradient(135deg, rgba(255,215,0,0.25), rgba(255,165,0,0.15))"
                  : "rgba(255,255,255,0.05)",
                border: a.gold ? "1px solid rgba(255,215,0,0.4)" : "1px solid rgba(255,255,255,0.08)",
                borderRadius: 10,
                textDecoration: "none",
                cursor: "pointer",
              }}>
              <span style={{ fontSize: 20 }}>{a.icon}</span>
              <span style={{ fontSize: 11, color: a.gold ? "#FFD700" : "#aaa", fontWeight: 600 }}>{a.label}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "flex", gap: 10, margin: "0 16px 16px" }}>
        {[
          { label: t("dashboard.balance"), value: "+$ 0.00", color: "#4CAF50" },
          { label: t("dashboard.deposit"), value: "$ 0.00", color: "#FFD700" },
          { label: t("dashboard.promo"), value: "$ 0.00", color: "#00BFFF" },
        ].map((s) => (
          <div key={s.label} style={{
            flex: 1,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 12,
            padding: "12px 8px",
            textAlign: "center",
          }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: "#555", marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Games Section */}
      <div style={{ margin: "0 16px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: "#FFD700" }}>{t("dashboard.myGames")}</span>
          <a href="/#games" style={{ fontSize: 12, color: "#00BFFF", textDecoration: "none" }}>{t("common.more")} ›</a>
        </div>
        <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }}>
          {games.map((g) => (
            <a key={g.name} href="https://t.me/LA1111_bot" target="_blank" rel="noopener noreferrer"
              style={{
                minWidth: 80,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
                padding: "14px 8px",
                background: "rgba(255,255,255,0.03)",
                border: `1px solid rgba(${g.color === "#FFD700" ? "255,215,0" : "0,191,255"},0.2)`,
                borderRadius: 12,
                textDecoration: "none",
                flexShrink: 0,
              }}>
              <span style={{ fontSize: 26 }}>{g.icon}</span>
              <span style={{ fontSize: 12, color: "#fff", fontWeight: 600 }}>{g.name}</span>
              <span style={{
                fontSize: 9,
                padding: "2px 6px",
                background: `rgba(${g.color === "#FFD700" ? "255,215,0" : "0,191,255"},0.15)`,
                borderRadius: 10,
                color: g.color,
              }}>{g.tag}</span>
            </a>
          ))}
        </div>
      </div>

      {/* VIP Banner */}
      <div style={{
        margin: "0 16px 16px",
        background: "linear-gradient(135deg, rgba(0,191,255,0.1), rgba(255,215,0,0.05))",
        border: "1px solid rgba(0,191,255,0.25)",
        borderRadius: 14,
        padding: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#00BFFF" }}>{t("vip.title")}</div>
          <div style={{ fontSize: 11, color: "#555", marginTop: 3 }}>{t("vip.exclusiveBonus")}</div>
        </div>
        <a href="https://t.me/LA1111_bot" target="_blank" rel="noopener noreferrer" style={{
          padding: "8px 16px",
          background: "linear-gradient(135deg, #00BFFF, #1E90FF)",
          borderRadius: 20,
          color: "#fff",
          fontSize: 12,
          fontWeight: 700,
          textDecoration: "none",
          whiteSpace: "nowrap",
        }}>{t("common.more")}</a>
      </div>

      {/* TG CTA */}
      <div style={{ margin: "0 16px" }}>
        <a href="https://t.me/LA1111_bot" target="_blank" rel="noopener noreferrer" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          width: "100%",
          padding: "16px",
          background: "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #1E90FF 100%)",
          borderRadius: 14,
          color: "#000",
          fontWeight: 900,
          fontSize: 16,
          textDecoration: "none",
          boxSizing: "border-box",
          boxShadow: "0 0 30px rgba(255,215,0,0.3)",
          letterSpacing: 1,
        }}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <path d="M21 4L3 11.3l5.8 2.1L18 7.6l-6.9 6.1.1 5L14 15.8l3.1 2.3L21 4Z" fill="#000"/>
          </svg>
          {t("nav.joinNow")} @LA1111_bot
        </a>
      </div>

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
          { id: "home", icon: "🏠", label: t("bottomNav.home"), href: "/" },
          { id: "games", icon: "🎮", label: t("nav.games"), href: "/#games" },
          { id: "deposit", icon: "💰", label: t("bottomNav.deposit"), href: "/deposit" },
          { id: "member", icon: "👤", label: t("bottomNav.profile"), href: "/dashboard" },
          { id: "service", icon: "💬", label: t("bottomNav.service"), href: "https://t.me/LA1111_bot", external: true },
        ].map((item) => (
          <a key={item.id}
            href={item.href}
            target={item.external ? "_blank" : "_self"}
            rel={item.external ? "noopener noreferrer" : undefined}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "10px 4px 12px",
              textDecoration: "none",
              gap: 3,
            }}>
            <span style={{ fontSize: item.id === "deposit" ? 22 : 18 }}>{item.icon}</span>
            <span style={{
              fontSize: 10,
              color: item.id === "member" ? "#FFD700" : (item.id === "deposit" ? "#FFD700" : "#555"),
              fontWeight: item.id === "member" || item.id === "deposit" ? 700 : 400,
            }}>{item.label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
