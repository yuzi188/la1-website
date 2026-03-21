"use client";
import { useState, useEffect } from "react";
import { useTelegramAuth } from "../hooks/useTelegramAuth";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "../components/LanguageSwitcher";

export default function HomePage() {
  const { user, loading, isTgEnv } = useTelegramAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("fav");
  const [currentBanner, setCurrentBanner] = useState(0);
  const [announcements, setAnnouncements] = useState([]);

  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://la1-backend-production.up.railway.app";

  const players = [
    "賭神小明", "歐皇附體", "梭哈戰士", "一夜暴富", "幸運鯨魚", "百家樂之王", "輪盤殺手", "金幣獵人", "不賭不行", "佛系玩家",
    "暴走老虎機", "提款王者", "反水達人", "VIP大佬", "今晚吃雞", "翻倍狂人", "運氣爆棚", "零元購神", "逆風翻盤", "穩如老狗",
    "單手開法拉利", "全場我最靚", "發財手", "幸運女神眷顧", "賭聖阿星", "龍抬頭", "大吉大利", "財源滾滾", "躺著也賺錢", "橫財就手",
    "賭場清道夫", "提款機本人", "歐氣滿滿", "天選之子", "暴富小能手", "金庫管理員", "幸運錦鯉", "財神爺敲門", "發財夢想家", "贏到手軟"
  ];

  const actions = [t("marquee.text1", "贏了"), t("marquee.text2", "儲值了"), t("marquee.text3", "提款了"), t("marquee.text4", "獲得獎金")];
  const amounts = [100, 500, 1000, 5000, 10000, 50000];

  const marqueeItems = players.map((player, i) => {
    const action = actions[i % actions.length];
    const amount = amounts[i % amounts.length];
    const formattedAmount = amount.toLocaleString("zh-TW");
    return (
      <span key={i}>
        🎉 {player} {action} ✨<span style={{
          color: "#FFD700",
          fontWeight: "800",
          fontSize: "13px",
          textShadow: "0 0 8px rgba(255,215,0,0.7)",
        }}>{formattedAmount}U</span>✨ &nbsp;｜&nbsp;
      </span>
    );
  });

  const gameTabKeys = [
    { key: "fav", label: t("games.hot", "最愛") },
    { key: "electronic", label: t("games.electronic", "電子") },
    { key: "live", label: t("games.live", "真人") },
    { key: "fishing", label: t("games.fishing", "捕魚") },
  ];

  // Real AI-generated banner images
  const banners = [
    {
      img: "/assets/hero-main.jpg",
      title: t("hero.brand"),
      sub: t("hero.subtitle"),
    },
    {
      img: "/assets/banner-vip.jpg",
      title: t("vip.title"),
      sub: t("vip.exclusiveBonus"),
    },
    {
      img: "/assets/banner-bonus.jpg",
      title: t("firstDeposit.title"),
      sub: t("firstDeposit.bannerDesc"),
    },
    {
      img: "/assets/banner-invite.jpg",
      title: t("referral.title"),
      sub: t("referral.commission"),
    },
  ];

  // Game category data with real images
  const gamesByTab = {
    fav: [
      { name: t("games.blackjack"), img: "/assets/game-baccarat.png", tag: t("games.playable"), color: "#FFD700", href: "/game/blackjack" },
      { name: t("games.slot"), img: "/assets/game-electronic.jpg", tag: t("games.hot"), color: "#FFD700" },
      { name: t("games.baccarat"), img: "/assets/game-live.jpg", tag: "VIP", color: "#00BFFF" },
      { name: t("games.fishing"), img: "/assets/game-fishing.jpg", tag: t("games.fun"), color: "#FFD700" },
    ],
    electronic: [
      { name: t("games.blackjack"), img: "/assets/game-baccarat.png", tag: t("games.playable"), color: "#FFD700", href: "/game/blackjack" },
      { name: t("games.slot"), img: "/assets/game-electronic.jpg", tag: t("games.hot"), color: "#FFD700" },
      { name: t("games.electronic"), img: "/assets/game-slot.png", tag: t("games.classic"), color: "#FFD700" },
      { name: t("games.ai"), img: "/assets/game-ai.png", tag: t("games.new"), color: "#00BFFF" },
    ],
    live: [
      { name: t("games.blackjack"), img: "/assets/game-baccarat.png", tag: t("games.playable"), color: "#FFD700", href: "/game/blackjack" },
      { name: t("games.baccarat"), img: "/assets/game-live.jpg", tag: "VIP", color: "#00BFFF" },
      { name: t("games.roulette"), img: "/assets/game-roulette.png", tag: t("games.hot"), color: "#FFD700" },
      { name: t("liveSection.vipLive"), img: "/assets/dealer-1.png", tag: t("games.fun"), color: "#00BFFF" },
    ],
    fishing: [
      { name: t("games.fishing"), img: "/assets/game-fishing.jpg", tag: t("games.hot"), color: "#FFD700" },
      { name: t("games.fishing"), img: "/assets/game-fishing.jpg", tag: t("games.fun"), color: "#00BFFF" },
      { name: t("games.fishing"), img: "/assets/game-fishing.jpg", tag: "VIP", color: "#FFD700" },
      { name: t("games.fishing"), img: "/assets/game-fishing.jpg", tag: t("games.new"), color: "#00BFFF" },
    ],
  };

  const scrollGames = [
    { name: t("games.blackjack"), img: "/assets/game-baccarat.png", color: "#FFD700", href: "/game/blackjack" },
    { name: t("games.baccarat"), img: "/assets/game-live.jpg", color: "#FFD700" },
    { name: t("games.fishing"), img: "/assets/game-fishing.jpg", color: "#00BFFF" },
    { name: t("games.slot"), img: "/assets/game-electronic.jpg", color: "#FFD700" },
    { name: t("games.roulette"), img: "/assets/game-roulette.png", color: "#FFD700" },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetch(`${BACKEND}/announcements`).then(r => r.json()).then(data => {
      if (Array.isArray(data)) setAnnouncements(data);
    }).catch(() => {});
  }, []);

  const displayName = user?.first_name || user?.username || t("common.loading");
  const balance = user?.balance ?? 0;

  return (
    <div className="fade-in" style={{ padding: "16px", maxWidth: "480px", margin: "0 auto" }}>

      {/* ── Top Bar ── */}
      <header style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px", height: "36px",
            background: "linear-gradient(135deg, #FFD700, #D4AF37)",
            borderRadius: "10px",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: "900", color: "#000", fontSize: "11px", letterSpacing: "0.5px",
            boxShadow: "0 0 15px rgba(255,215,0,0.4)",
          }}>LA1</div>
          <div>
            <div style={{ fontWeight: "800", fontSize: "16px", letterSpacing: "1px" }}>LA1 AI</div>
            {user && (
              <div style={{ fontSize: "11px", color: "#00BFFF" }}>
                {isTgEnv ? "🤖 " : ""}{t("hero.welcome")}，{displayName}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <LanguageSwitcher />
          <div style={{
            background: "rgba(255,215,0,0.08)",
            padding: "8px 14px",
            borderRadius: "20px",
            display: "flex", alignItems: "center", gap: "8px",
            border: "1px solid rgba(255,215,0,0.3)",
          }}>
            <span style={{ color: "#FFD700", fontWeight: "800", fontSize: "15px" }}>
              $ {loading ? "..." : balance.toFixed(2)}
            </span>
            <a href="/deposit" style={{
              background: "rgba(255,215,0,0.15)",
              border: "none", cursor: "pointer", fontSize: "14px",
              borderRadius: "50%", width: "24px", height: "24px",
              display: "flex", alignItems: "center", justifyContent: "center",
              textDecoration: "none",
            }}>💰</a>
          </div>
        </div>
      </header>

      {/* ── TG Login Banner (non-TG env) ── */}
      {!loading && !user && !isTgEnv && (
        <div style={{
          background: "linear-gradient(135deg, rgba(0,191,255,0.1), rgba(255,215,0,0.05))",
          border: "1px solid rgba(0,191,255,0.3)",
          borderRadius: "12px",
          padding: "14px 16px",
          marginBottom: "16px",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <span style={{ fontSize: "24px" }}>📱</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: "13px", fontWeight: "700", color: "#00BFFF" }}>{t("login.tgLogin")}</div>
            <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>{t("login.or")} <a href="/login" style={{ color: "#FFD700" }}>{t("login.loginBtn")}</a></div>
          </div>
          <a href="https://t.me/LA1111_bot" target="_blank" rel="noopener noreferrer" style={{
            padding: "6px 12px",
            background: "linear-gradient(135deg, #00BFFF, #1E90FF)",
            borderRadius: "20px", color: "#fff",
            fontSize: "12px", fontWeight: "700", textDecoration: "none",
          }}>{t("hero.startGame")}</a>
        </div>
      )}

      {/* ── Banner Carousel with Real Images ── */}
      <div style={{
        position: "relative",
        height: "180px",
        borderRadius: "16px",
        overflow: "hidden",
        marginBottom: "16px",
        boxShadow: "0 0 30px rgba(255,215,0,0.15)",
        border: "1px solid rgba(255,215,0,0.2)",
      }}>
        {banners.map((banner, i) => (
          <div key={i} style={{
            position: "absolute",
            inset: 0,
            opacity: currentBanner === i ? 1 : 0,
            transition: "opacity 0.8s ease",
          }}>
            {/* Background image */}
            <div style={{
              position: "absolute", inset: 0,
              backgroundImage: `url(${banner.img})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              transform: currentBanner === i ? "scale(1.02)" : "scale(1)",
              transition: "transform 4s ease",
            }} />
            {/* Overlay gradient */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
            }} />
            {/* Text */}
            <div style={{
              position: "absolute", bottom: "20px", left: "18px",
            }}>
              <div style={{
                fontSize: "18px", fontWeight: "900", color: "#FFD700",
                textShadow: "0 0 20px rgba(255,215,0,0.8)",
                marginBottom: "4px",
              }}>{banner.title}</div>
              <div style={{ fontSize: "12px", color: "rgba(255,255,255,0.8)" }}>{banner.sub}</div>
            </div>
          </div>
        ))}
        {/* Dots */}
        <div style={{
          position: "absolute", bottom: "10px", right: "14px",
          display: "flex", gap: "5px",
        }}>
          {banners.map((_, i) => (
            <div key={i} onClick={() => setCurrentBanner(i)} style={{
              width: currentBanner === i ? "18px" : "5px",
              height: "5px",
              borderRadius: "3px",
              background: currentBanner === i ? "#FFD700" : "rgba(255,255,255,0.3)",
              transition: "all 0.3s",
              cursor: "pointer",
            }} />
          ))}
        </div>
      </div>

      {/* ── Announcement Marquee ── */}
      {announcements.length > 0 && (
        <div style={{
          background: "linear-gradient(135deg, rgba(255,215,0,0.08), rgba(0,191,255,0.05))",
          padding: "10px 14px",
          borderRadius: "10px",
          marginBottom: "12px",
          border: "1px solid rgba(255,215,0,0.25)",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          overflow: "hidden",
        }}>
          <span style={{
            background: "linear-gradient(135deg, #FFD700, #FFA500)",
            color: "#000",
            fontSize: "10px",
            fontWeight: "800",
            padding: "3px 8px",
            borderRadius: "4px",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}>{t("common.announcement")}</span>
          <div className="marquee-container" style={{ flex: 1 }}>
            <div className="marquee-content" style={{ fontSize: "12px", color: "#FFD700" }}>
              {announcements.map((a, i) => {
                const icon = a.type === "warning" ? "⚠️" : a.type === "promo" ? "🎁" : a.type === "maintenance" ? "🔧" : "📢";
                return `${icon} ${a.title}：${a.content}　　`;
              }).join("")}
              {announcements.map((a, i) => {
                const icon = a.type === "warning" ? "⚠️" : a.type === "promo" ? "🎁" : a.type === "maintenance" ? "🔧" : "📢";
                return `${icon} ${a.title}：${a.content}　　`;
              }).join("")}
            </div>
          </div>
        </div>
      )}

      {/* ── Marquee ── */}
      <div className="marquee-container" style={{
        background: "rgba(255,215,0,0.05)",
        padding: "8px 0",
        borderRadius: "8px",
        marginBottom: "20px",
        border: "1px solid rgba(255,215,0,0.1)",
      }}>
        <div className="marquee-content" style={{ fontSize: "12px", color: "#e0c060" }}>
          {marqueeItems}{marqueeItems}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(5, 1fr)",
        gap: "8px",
        marginBottom: "24px",
      }}>
        {[
          { icon: "💰", label: t("bottomNav.deposit"), href: "/deposit" },
          { icon: "📈", label: t("profile.balance"), href: "/profile" },
          { icon: "🤝", label: t("referral.title"), href: "/activity" },
          { icon: "📋", label: t("tasks.title"), href: "/activity" },
          { icon: "👑", label: "VIP", href: "/activity" },
        ].map((item, i) => (
          <a key={i} href={item.href} style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", gap: "5px", textDecoration: "none",
          }}>
            <div style={{
              width: "50px", height: "50px",
              background: "rgba(255,255,255,0.05)",
              borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "22px",
              border: "1px solid rgba(255,215,0,0.2)",
              boxShadow: "0 0 10px rgba(255,215,0,0.1)",
              animation: "pulse-gold 2.5s infinite",
              animationDelay: `${i * 0.2}s`,
            }}>{item.icon}</div>
            <span style={{ fontSize: "10px", color: "#aaa" }}>{item.label}</span>
          </a>
        ))}
      </div>

      {/* ── Game Tabs ── */}
      <div style={{
        display: "flex", gap: "20px",
        marginBottom: "14px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        paddingBottom: "10px",
      }}>
        {gameTabKeys.map(tab => (
          <span key={tab.key}
            className={`nav-tab ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
            style={{
              fontSize: "15px", fontWeight: "700", cursor: "pointer",
              color: activeTab === tab.key ? "#FFD700" : "#555",
              paddingBottom: "4px",
            }}
          >{tab.label}</span>
        ))}
      </div>

      {/* ── Game Cards Grid with Real Images ── */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "12px",
        marginBottom: "20px",
      }}>
        {(gamesByTab[activeTab] || []).map((game, i) => (
          <a key={i} href={game.href || "https://t.me/LA1111_bot"} target={game.href ? "_self" : "_blank"} rel="noopener noreferrer"
            className="game-card"
            style={{
              height: "160px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "flex-end",
              padding: "12px",
              background: `url(${game.img}) center/cover no-repeat`,
              borderRadius: "14px",
              textDecoration: "none",
              position: "relative",
              overflow: "hidden",
              border: `1px solid rgba(${i % 2 === 0 ? "255,215,0" : "0,191,255"},0.25)`,
              boxShadow: `0 0 15px rgba(${i % 2 === 0 ? "255,215,0" : "0,191,255"},0.1)`,
            }}>
            {/* Dark overlay */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 60%, transparent 100%)",
            }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{
                display: "inline-block",
                fontSize: "10px", padding: "2px 8px",
                background: `rgba(${i % 2 === 0 ? "255,215,0" : "0,191,255"},0.2)`,
                borderRadius: "10px",
                color: game.color, marginBottom: "4px",
                border: `1px solid rgba(${i % 2 === 0 ? "255,215,0" : "0,191,255"},0.3)`,
              }}>{game.tag}</div>
              <div style={{ fontWeight: "800", fontSize: "14px", color: "#fff" }}>{game.name}</div>
              <div style={{ fontSize: "11px", color: game.color }}>{t("games.enterGame")} ›</div>
            </div>
          </a>
        ))}
      </div>

      {/* ── Horizontal Scroll with Real Images ── */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontWeight: "800", color: "#FFD700", fontSize: "15px" }}>🔥 {t("games.title")}</span>
          <a href="https://t.me/LA1111_bot" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: "12px", color: "#00BFFF", textDecoration: "none" }}>{t("common.more")} ›</a>
        </div>
        <div className="no-scrollbar" style={{
          display: "flex", gap: "12px",
          overflowX: "auto", paddingBottom: "8px",
        }}>
          {scrollGames.map((game, i) => (
            <a key={i} href={game.href || "https://t.me/LA1111_bot"} target={game.href ? "_self" : "_blank"} rel="noopener noreferrer"
              className="game-card"
              style={{
                minWidth: "110px", height: "140px", flexShrink: 0,
                display: "flex", flexDirection: "column",
                justifyContent: "flex-end",
                padding: "10px",
                background: `url(${game.img}) center/cover no-repeat`,
                borderRadius: "12px",
                textDecoration: "none",
                position: "relative",
                overflow: "hidden",
                border: `1px solid rgba(${i % 2 === 0 ? "255,215,0" : "0,191,255"},0.2)`,
              }}>
              <div style={{
                position: "absolute", inset: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 60%)",
              }} />
              <div style={{ position: "relative", zIndex: 1 }}>
                <div style={{ fontSize: "12px", fontWeight: "700", color: "#fff" }}>{game.name}</div>
                <div style={{ fontSize: "10px", color: game.color }}>{t("games.enterGame")} ›</div>
              </div>
            </a>
          ))}
        </div>
      </div>

      {/* ── TG CTA ── */}
      <a href="https://t.me/LA1111_bot" target="_blank" rel="noopener noreferrer" style={{
        display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
        width: "100%", padding: "16px",
        background: "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #1E90FF 100%)",
        borderRadius: "14px", color: "#000",
        fontWeight: "900", fontSize: "16px",
        textDecoration: "none",
        boxShadow: "0 0 30px rgba(255,215,0,0.3)",
        letterSpacing: "1px",
        marginBottom: "8px",
      }}>
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
          <path d="M21 4L3 11.3l5.8 2.1L18 7.6l-6.9 6.1.1 5L14 15.8l3.1 2.3L21 4Z" fill="#000"/>
        </svg>
        {t("nav.joinNow")} @LA1111_bot
      </a>

      {/* ── Floating Daily Race Button ── */}
      <a href="/activity" style={{
        position: "fixed",
        right: "16px",
        bottom: "80px",
        width: "56px", height: "56px",
        background: "linear-gradient(135deg, #FFD700, #FFA500)",
        borderRadius: "50%",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        boxShadow: "0 0 20px rgba(255,215,0,0.5)",
        textDecoration: "none",
        animation: "float 3s ease-in-out infinite",
        zIndex: 100,
      }}>
        <span style={{ fontSize: "20px" }}>🏆</span>
        <span style={{ fontSize: "8px", color: "#000", fontWeight: "800" }}>NEW</span>
      </a>
    </div>
  );
}
