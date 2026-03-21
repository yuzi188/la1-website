"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../i18n/LanguageContext";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "https://la1-backend-production.up.railway.app";

export default function DashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("home");

  useEffect(() => {
    const init = async () => {
      // Check if inside Telegram Mini App — always call /tg-login to bind TG data
      const tg = typeof window !== "undefined" && window.Telegram?.WebApp;
      if (tg && tg.initData && tg.initData.length > 0) {
        tg.ready();
        tg.expand();
        try {
          const refCode = localStorage.getItem("la1_ref") || "";
          const res = await fetch(`${API}/tg-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              initData: tg.initData,
              ...(refCode ? { referral: refCode } : {}),
            }),
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

      // Fallback: use stored user
      const stored = localStorage.getItem("la1_user");
      if (!stored) { router.push("/login"); return; }
      setUser(JSON.parse(stored));
    };
    init();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("la1_user");
    localStorage.removeItem("la1_token");
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
        <div>
          <div style={{ color: "#FFD700", fontWeight: 800, fontSize: 18 }}>LA1</div>
          <div style={{ color: "#888", fontSize: 11 }}>{t("dashboard.welcome")}, {user.first_name || user.username}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#888", fontSize: 10 }}>{t("dashboard.balance")}</div>
            <div style={{ color: "#FFD700", fontWeight: 700, fontSize: 16 }}>${(user.balance ?? 0).toFixed(2)}</div>
          </div>
          <button onClick={handleLogout} style={{
            background: "transparent",
            border: "1px solid #333",
            borderRadius: 8,
            color: "#666",
            padding: "6px 10px",
            cursor: "pointer",
            fontSize: 12,
          }}>{t("dashboard.logout")}</button>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {quickActions.map(a => (
          <a key={a.label} href={a.href} target={a.external ? "_blank" : undefined} rel={a.external ? "noopener noreferrer" : undefined}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              background: a.gold ? "linear-gradient(135deg,#FFD70022,#FFA50011)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${a.gold ? "rgba(255,215,0,0.3)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 12, padding: "12px 8px", textDecoration: "none",
            }}>
            <span style={{ fontSize: 22 }}>{a.icon}</span>
            <span style={{ color: a.gold ? "#FFD700" : "#aaa", fontSize: 11, fontWeight: 600 }}>{a.label}</span>
          </a>
        ))}
      </div>

      {/* Games */}
      <div style={{ padding: "0 18px 16px" }}>
        <div style={{ color: "#FFD700", fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🎮 {t("dashboard.games")}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {games.map(g => (
            <div key={g.name} style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              padding: "14px 16px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              cursor: "pointer",
            }}>
              <span style={{ fontSize: 28 }}>{g.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{g.name}</div>
              </div>
              <span style={{
                background: `${g.color}22`,
                border: `1px solid ${g.color}55`,
                color: g.color,
                borderRadius: 6,
                padding: "3px 8px",
                fontSize: 11,
                fontWeight: 600,
              }}>{g.tag}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
