"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../../i18n/LanguageContext";

export default function LoginPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const [tab, setTab] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", confirm: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    if (tab === "register" && form.password !== form.confirm) {
      setError(t("login.confirmPassword"));
      setLoading(false);
      return;
    }
    const user = { username: form.username, balance: 0.00, vip: "VIP0", phone: form.phone || "" };
    localStorage.setItem("la1_user", JSON.stringify(user));
    setTimeout(() => { router.push("/dashboard"); }, 600);
  };

  const inputStyle = {
    width: "100%",
    padding: "14px 16px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,215,0,0.2)",
    borderRadius: 10,
    color: "#fff",
    fontSize: 15,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(180deg, #0a0a0a 0%, #050510 100%)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "flex-start",
      fontFamily: "'Segoe UI', sans-serif",
      color: "#fff",
    }}>
      {/* Header Strip */}
      <div style={{
        width: "100%",
        background: "rgba(0,0,0,0.8)",
        borderBottom: "1px solid rgba(255,215,0,0.15)",
        padding: "14px 20px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}>
        <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 10, color: "#666" }}>◀</span>
          <span style={{
            fontSize: 20,
            fontWeight: 900,
            background: "linear-gradient(135deg, #FFD700, #FFA500)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: 3,
          }}>LA1</span>
        </a>
      </div>

      {/* Hero Logo Area */}
      <div style={{
        width: "100%",
        background: "linear-gradient(180deg, rgba(255,215,0,0.08) 0%, transparent 100%)",
        padding: "32px 20px 24px",
        textAlign: "center",
        borderBottom: "1px solid rgba(255,215,0,0.1)",
      }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "linear-gradient(135deg, #FFD700, #D4AF37)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 12px",
          boxShadow: "0 0 30px rgba(255,215,0,0.4), 0 0 60px rgba(255,215,0,0.15)",
          fontSize: 28,
          fontWeight: 900,
          color: "#000",
          letterSpacing: 1,
        }}>LA1</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "#FFD700", marginBottom: 4 }}>{t("login.title")}</div>
        <div style={{ fontSize: 12, color: "#00BFFF", letterSpacing: 3 }}>{t("login.subtitle")}</div>
      </div>

      {/* Card */}
      <div style={{
        width: "100%",
        maxWidth: 480,
        padding: "0 16px 40px",
        marginTop: 0,
      }}>
        {/* Tab Bar */}
        <div style={{
          display: "flex",
          background: "rgba(255,255,255,0.03)",
          borderRadius: 12,
          padding: 4,
          margin: "20px 0 24px",
          border: "1px solid rgba(255,215,0,0.1)",
        }}>
          {[["login", t("login.loginTab")], ["register", t("login.registerTab")]].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setError(""); }} style={{
              flex: 1,
              padding: "10px 0",
              background: tab === key ? "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(30,144,255,0.1))" : "none",
              border: tab === key ? "1px solid rgba(255,215,0,0.3)" : "1px solid transparent",
              borderRadius: 9,
              cursor: "pointer",
              fontSize: 15,
              fontWeight: 700,
              color: tab === key ? "#FFD700" : "#555",
              transition: "all 0.2s",
            }}>{label}</button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 6, letterSpacing: 1 }}>{t("login.username")}</div>
            <input name="username" value={form.username} onChange={handleChange} required
              placeholder={t("login.usernamePlaceholder")} style={inputStyle} />
          </div>

          {tab === "register" && (
            <div>
              <div style={{ color: "#888", fontSize: 12, marginBottom: 6, letterSpacing: 1 }}>{t("login.phone")}</div>
              <input name="phone" value={form.phone} onChange={handleChange}
                placeholder={t("login.phonePlaceholder")} style={inputStyle} />
            </div>
          )}

          <div>
            <div style={{ color: "#888", fontSize: 12, marginBottom: 6, letterSpacing: 1 }}>{t("login.password")}</div>
            <input name="password" type="password" value={form.password} onChange={handleChange} required
              placeholder={t("login.passwordPlaceholder")} style={inputStyle} />
          </div>

          {tab === "register" && (
            <div>
              <div style={{ color: "#888", fontSize: 12, marginBottom: 6, letterSpacing: 1 }}>{t("login.confirmPassword")}</div>
              <input name="confirm" type="password" value={form.confirm} onChange={handleChange} required
                placeholder={t("login.confirmPasswordPlaceholder")} style={inputStyle} />
            </div>
          )}

          {error && (
            <div style={{
              background: "rgba(255,68,68,0.1)",
              border: "1px solid rgba(255,68,68,0.3)",
              borderRadius: 8,
              padding: "10px 14px",
              color: "#ff6666",
              fontSize: 13,
              textAlign: "center",
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%",
            padding: "16px",
            background: loading ? "rgba(255,215,0,0.3)" : "linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #1E90FF 100%)",
            border: "none",
            borderRadius: 12,
            color: "#000",
            fontWeight: 900,
            fontSize: 17,
            cursor: loading ? "not-allowed" : "pointer",
            letterSpacing: 2,
            marginTop: 4,
            boxShadow: "0 0 30px rgba(255,215,0,0.35), 0 4px 20px rgba(0,0,0,0.4)",
            transition: "all 0.2s",
          }}>
            {loading ? t("login.processing") : (tab === "login" ? t("login.loginBtn") : t("login.registerBtn"))}
          </button>
        </form>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ color: "#444", fontSize: 12 }}>{t("login.or")}</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* TG Button */}
        <a href="https://t.me/LA1111_bot" target="_blank" rel="noopener noreferrer" style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          width: "100%",
          padding: "14px",
          background: "rgba(0,191,255,0.08)",
          border: "1px solid rgba(0,191,255,0.3)",
          borderRadius: 12,
          color: "#00BFFF",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: 15,
          boxSizing: "border-box",
          boxShadow: "0 0 20px rgba(0,191,255,0.1)",
        }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path d="M21 4L3 11.3l5.8 2.1L18 7.6l-6.9 6.1.1 5L14 15.8l3.1 2.3L21 4Z" fill="#00BFFF"/>
          </svg>
          {t("login.tgLogin")}
        </a>

        {/* Trust Badges */}
        <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 28 }}>
          {[t("login.trustBadge1"), t("login.trustBadge2"), t("login.trustBadge3")].map(b => (
            <span key={b} style={{ color: "#444", fontSize: 11 }}>{b}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
