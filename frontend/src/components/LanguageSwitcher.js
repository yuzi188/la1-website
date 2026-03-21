"use client";
import { useState, useRef, useEffect } from "react";
import { useLanguage, LANGUAGES } from "../i18n/LanguageContext";

export default function LanguageSwitcher() {
  const { lang, setLang, mounted } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, []);

  if (!mounted) return null;

  const current = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <div ref={ref} style={{ position: "relative", zIndex: 1000 }}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: "6px 12px",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,215,0,0.3)",
          borderRadius: "8px",
          color: "#FFD700",
          fontSize: "13px",
          fontWeight: "600",
          cursor: "pointer",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: "16px" }}>{current.flag}</span>
        <span style={{ fontSize: "12px" }}>{current.code === "zh-TW" ? "繁中" : current.code === "zh-CN" ? "简中" : current.code.toUpperCase()}</span>
        <span style={{ fontSize: "10px", transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s" }}>▼</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: "160px",
            background: "rgba(10,10,10,0.98)",
            border: "1px solid rgba(255,215,0,0.25)",
            borderRadius: "12px",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            overflow: "hidden",
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                setLang(l.code);
                setOpen(false);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "100%",
                padding: "10px 14px",
                background: l.code === lang ? "rgba(255,215,0,0.1)" : "transparent",
                border: "none",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                color: l.code === lang ? "#FFD700" : "#ccc",
                fontSize: "13px",
                cursor: "pointer",
                textAlign: "left",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,215,0,0.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = l.code === lang ? "rgba(255,215,0,0.1)" : "transparent")}
            >
              <span style={{ fontSize: "18px" }}>{l.flag}</span>
              <span>{l.label}</span>
              {l.code === lang && <span style={{ marginLeft: "auto", color: "#FFD700", fontSize: "12px" }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
