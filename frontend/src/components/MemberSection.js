"use client";
import { useLanguage } from "../i18n/LanguageContext";

export default function MemberSection() {
  const { t } = useLanguage();
  const handleMemberClick = (href) => {
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("la1_user");
      window.location.href = user ? href : "/login";
    }
  };

  return (
    <section id="member" className="section">
      <div className="container member-grid">
        <div className="glass panel">
          <div className="balance">
            <div>
              <p className="muted">{t("member.center")}</p>
              <h3 style={{ color: "#FFD700" }}>{t("member.vipMember")}</h3>
            </div>
            <strong className="gradient">$ 0.00</strong>
          </div>
          <div className="feature-list">
            <div className="feature-item" style={{ cursor: "pointer" }}
              onClick={() => handleMemberClick("/dashboard")}>
              <span style={{ color: "#FFD700" }}>{t("member.memberEntry")}</span>
              <span className="muted">{t("member.memberEntryDesc")}</span>
            </div>
            <div className="feature-item" style={{ cursor: "pointer" }}
              onClick={() => handleMemberClick("/dashboard")}>
              <span style={{ color: "#FFD700" }}>{t("member.aiRecommend")}</span>
              <span className="muted">{t("member.aiRecommendDesc")}</span>
            </div>
            <div className="feature-item" style={{ cursor: "pointer" }}
              onClick={() => handleMemberClick("/dashboard")}>
              <span style={{ color: "#FFD700" }}>{t("member.vipUpgrade")}</span>
              <span className="muted">{t("member.vipUpgradeDesc")}</span>
            </div>
          </div>
          <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
            <button onClick={() => handleMemberClick("/login")} style={{
              flex: 1,
              padding: "12px",
              background: "linear-gradient(135deg, #FFD700, #D4AF37)",
              border: "none",
              borderRadius: 10,
              color: "#000",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              letterSpacing: 1,
            }}>{t("member.loginRegister")}</button>
            <button onClick={() => handleMemberClick("/deposit")} style={{
              flex: 1,
              padding: "12px",
              background: "linear-gradient(135deg, rgba(0,191,255,0.2), rgba(30,144,255,0.1))",
              border: "1px solid rgba(0,191,255,0.4)",
              borderRadius: 10,
              color: "#00BFFF",
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              letterSpacing: 1,
            }}>{t("member.depositNow")}</button>
          </div>
        </div>

        <div className="glass panel">
          <p className="muted">{t("member.depositService")}</p>
          <h3 style={{ color: "#FFD700" }}>{t("member.contactUs")}</h3>
          <p className="muted" style={{ marginTop: 10, lineHeight: 1.9 }}>
            {t("member.contactUsDesc")}
          </p>
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <a className="tg-big" href="https://t.me/LA1111_bot" target="_blank" rel="noopener noreferrer">
              <span className="tg-icon">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
                  <path d="M21 4L3 11.3l5.8 2.1L18 7.6l-6.9 6.1.1 5L14 15.8l3.1 2.3L21 4Z" fill="#000"/>
                </svg>
              </span>
              {t("member.contactService")}
            </a>
            <button onClick={() => handleMemberClick("/deposit")} style={{
              width: "100%",
              padding: "14px",
              background: "linear-gradient(135deg, rgba(255,215,0,0.15), rgba(30,144,255,0.1))",
              border: "1px solid rgba(255,215,0,0.3)",
              borderRadius: 10,
              color: "#FFD700",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              letterSpacing: 1,
            }}>{t("member.depositMoney")}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
