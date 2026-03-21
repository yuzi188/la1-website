"use client";
import { useLanguage } from "../i18n/LanguageContext";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Navbar() {
  const { t } = useLanguage();
  const handleMemberClick = (e) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      const user = localStorage.getItem("la1_user");
      window.location.href = user ? "/dashboard" : "/login";
    }
  };

  return (
    <div className="nav">
      <div className="container nav-inner">
        <a href="/" className="brand">
          <div className="brand-mark">LA1</div>
          <div className="brand-copy">
            <strong>LA1</strong>
            <span>{t("hero.brand", "AI 娛樂平台")}</span>
          </div>
        </a>

        <div className="nav-links">
          <a href="/">{t("nav.home")}</a>
          <a href="#games">{t("nav.games")}</a>
          <a href="#live">{t("nav.live")}</a>
          <a href="#member" onClick={handleMemberClick}>{t("nav.memberCenter")}</a>
          <a href="https://t.me/LA1111_bot" target="_blank" rel="noopener noreferrer">{t("nav.service")}</a>
        </div>

        <div className="nav-actions">
          <LanguageSwitcher />
          <a className="btn btn-outline" href="#" onClick={handleMemberClick}>{t("nav.memberCenter")}</a>
          <a className="btn btn-primary" href="https://t.me/LA1111_bot" target="_blank" rel="noopener noreferrer">{t("nav.joinNow")}</a>
        </div>
      </div>
    </div>
  );
}
