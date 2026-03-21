"use client";
import { useLanguage } from "../i18n/LanguageContext";

export default function BottomNav() {
  const { t } = useLanguage();
  return (
    <nav className="bottom-nav">
      <a href="/deposit" className="bottom-nav-item">
        <div className="icon-wrapper">💰</div>
        <span>{t("bottomNav.deposit")}</span>
      </a>
      <a href="/service" className="bottom-nav-item">
        <div className="icon-wrapper">💬</div>
        <span>{t("bottomNav.service")}</span>
      </a>
      <a href="/" className="bottom-nav-item active">
        <div className="icon-wrapper">🏠</div>
        <span>{t("bottomNav.home")}</span>
      </a>
      <a href="/activity" className="bottom-nav-item">
        <div className="icon-wrapper">🎁</div>
        <span>{t("bottomNav.activity")}</span>
      </a>
      <a href="/profile" className="bottom-nav-item">
        <div className="icon-wrapper">👤</div>
        <span>{t("bottomNav.profile")}</span>
      </a>
    </nav>
  );
}
