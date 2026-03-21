"use client";
import { useLanguage } from "../i18n/LanguageContext";
import { usePathname } from "next/navigation";
import Image from "next/image";

// Gold SVG icon components
const DepositIcon = ({ active }) => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      filter: active
        ? "drop-shadow(0 0 6px rgba(255,215,0,0.9))"
        : "drop-shadow(0 0 3px rgba(255,215,0,0.4))",
      transition: "filter 0.3s",
    }}
  >
    {/* Coin stack */}
    <ellipse cx="13" cy="18" rx="7" ry="3" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.6" fill="none" />
    <line x1="6" y1="18" x2="6" y2="15" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.6" />
    <line x1="20" y1="18" x2="20" y2="15" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.6" />
    <ellipse cx="13" cy="15" rx="7" ry="3" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.6" fill="none" />
    <line x1="6" y1="15" x2="6" y2="12" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.6" />
    <line x1="20" y1="15" x2="20" y2="12" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.6" />
    <ellipse cx="13" cy="12" rx="7" ry="3" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.6" fill="none" />
    {/* Dollar sign */}
    <text x="13" y="13.5" textAnchor="middle" fontSize="5" fill={active ? "#FFE44D" : "#FFD700"} fontWeight="bold">$</text>
    {/* Arrow down */}
    <path d="M13 3 L13 8 M10.5 5.5 L13 8 L15.5 5.5" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ServiceIcon = ({ active }) => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      filter: active
        ? "drop-shadow(0 0 6px rgba(255,215,0,0.9))"
        : "drop-shadow(0 0 3px rgba(255,215,0,0.4))",
      transition: "filter 0.3s",
    }}
  >
    {/* Headset arc */}
    <path d="M5 13 C5 7.5 8.5 4 13 4 C17.5 4 21 7.5 21 13" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    {/* Left ear cup */}
    <rect x="4" y="12" width="4" height="6" rx="2" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.5" fill="none" />
    {/* Right ear cup */}
    <rect x="18" y="12" width="4" height="6" rx="2" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.5" fill="none" />
    {/* Mic arm */}
    <path d="M22 17 C22 20 19 22 16 22" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    {/* Mic dot */}
    <circle cx="15.5" cy="22" r="1.2" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.3" fill="none" />
  </svg>
);

const ActivityIcon = ({ active }) => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      filter: active
        ? "drop-shadow(0 0 6px rgba(255,215,0,0.9))"
        : "drop-shadow(0 0 3px rgba(255,215,0,0.4))",
      transition: "filter 0.3s",
    }}
  >
    {/* Trophy cup */}
    <path d="M8 4 H18 V14 C18 17.3 15.8 20 13 20 C10.2 20 8 17.3 8 14 Z" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.6" fill="none" strokeLinejoin="round" />
    {/* Trophy handles */}
    <path d="M8 7 C5 7 4 9 4 11 C4 13 5.5 14 8 13.5" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    <path d="M18 7 C21 7 22 9 22 11 C22 13 20.5 14 18 13.5" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.5" fill="none" strokeLinecap="round" />
    {/* Base stem */}
    <line x1="13" y1="20" x2="13" y2="22.5" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.6" strokeLinecap="round" />
    {/* Base plate */}
    <line x1="9" y1="22.5" x2="17" y2="22.5" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.8" strokeLinecap="round" />
    {/* Star in cup */}
    <polygon points="13,8 14,11 17,11 14.5,12.8 15.5,15.8 13,14 10.5,15.8 11.5,12.8 9,11 12,11" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="0.8" fill={active ? "rgba(255,228,77,0.2)" : "rgba(255,215,0,0.1)"} />
  </svg>
);

const ProfileIcon = ({ active }) => (
  <svg
    width="26"
    height="26"
    viewBox="0 0 26 26"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{
      filter: active
        ? "drop-shadow(0 0 6px rgba(255,215,0,0.9))"
        : "drop-shadow(0 0 3px rgba(255,215,0,0.4))",
      transition: "filter 0.3s",
    }}
  >
    {/* Head */}
    <circle cx="13" cy="9" r="4.5" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.6" fill="none" />
    {/* Body */}
    <path d="M4 23 C4 18 8 15 13 15 C18 15 22 18 22 23" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.6" fill="none" strokeLinecap="round" />
    {/* VIP crown hint */}
    <path d="M10 6.5 L11.5 8 L13 6 L14.5 8 L16 6.5" stroke={active ? "#FFE44D" : "#FFD700"} strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function BottomNav() {
  const { t } = useLanguage();
  const pathname = usePathname();

  const isActive = (href) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const navItems = [
    {
      id: "deposit",
      href: "/deposit",
      label: t("bottomNav.deposit"),
      icon: (active) => <DepositIcon active={active} />,
    },
    {
      id: "service",
      href: "/service",
      label: t("bottomNav.service"),
      icon: (active) => <ServiceIcon active={active} />,
    },
    {
      id: "home",
      href: "/",
      label: t("bottomNav.home"),
      isHome: true,
    },
    {
      id: "activity",
      href: "/activity",
      label: t("bottomNav.activity"),
      icon: (active) => <ActivityIcon active={active} />,
    },
    {
      id: "profile",
      href: "/profile",
      label: t("bottomNav.profile"),
      icon: (active) => <ProfileIcon active={active} />,
    },
  ];

  return (
    <nav className="bottom-nav">
      {navItems.map((item) => {
        const active = isActive(item.href);
        return (
          <a
            key={item.id}
            href={item.href}
            className={`bottom-nav-item${active ? " active" : ""}`}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "3px",
              color: active ? "#FFD700" : "#666",
              textDecoration: "none",
              fontSize: "11px",
              transition: "all 0.3s",
              transform: active ? "translateY(-2px)" : "none",
              position: "relative",
            }}
          >
            {item.isHome ? (
              /* Panda home button */
              <div
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: active
                    ? "2px solid #FFE44D"
                    : "2px solid rgba(255,215,0,0.5)",
                  boxShadow: active
                    ? "0 0 14px rgba(255,215,0,0.8), 0 0 28px rgba(255,215,0,0.4)"
                    : "0 0 8px rgba(255,215,0,0.3)",
                  transition: "all 0.3s",
                  flexShrink: 0,
                  position: "relative",
                  marginBottom: "1px",
                  animation: "panda-pulse 2.5s ease-in-out infinite",
                }}
              >
                <img
                  src="/panda-logo.jpeg"
                  alt="首頁"
                  width={46}
                  height={46}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    filter: active
                      ? "brightness(1.15) saturate(1.1)"
                      : "brightness(0.9)",
                    transition: "filter 0.3s",
                  }}
                />
              </div>
            ) : (
              <div
                className="icon-wrapper"
                style={{
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "10px",
                  background: active
                    ? "rgba(255,215,0,0.12)"
                    : "transparent",
                  boxShadow: active
                    ? "0 0 12px rgba(255,215,0,0.25)"
                    : "none",
                  transition: "all 0.3s",
                }}
              >
                {item.icon(active)}
              </div>
            )}
            <span
              style={{
                fontSize: "10px",
                fontWeight: active ? "700" : "400",
                color: active ? "#FFD700" : "#666",
                textShadow: active
                  ? "0 0 8px rgba(255,215,0,0.6)"
                  : "none",
                transition: "all 0.3s",
                letterSpacing: "0.3px",
              }}
            >
              {item.label}
            </span>
          </a>
        );
      })}
    </nav>
  );
}
