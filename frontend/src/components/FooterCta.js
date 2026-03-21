"use client";
import { useLanguage } from "../i18n/LanguageContext";

export default function FooterCta() {
  const { t } = useLanguage();
  return (
    <section className="section">
      <div className="container">
        <div className="glass cta-band">
          <div>
            <h3>{t("hero.startGame")}</h3>
            <p>{t("hero.desc")}</p>
          </div>
          <a
            className="tg-big"
            href="https://t.me/LA1111_bot"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span className="tg-icon">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="none">
                <path d="M21 4L3 11.3l5.8 2.1L18 7.6l-6.9 6.1.1 5L14 15.8l3.1 2.3L21 4Z" fill="#000"/>
              </svg>
            </span>
            {t("nav.joinNow")} @LA1111_bot
          </a>
        </div>

        <div className="footer">
          <div className="footer-badges">
            <div className="footer-badge">
              <span className="footer-badge-icon">🔒</span>
              {t("login.trustBadge1")}
            </div>
            <div className="footer-badge">
              <span className="footer-badge-icon">⚡</span>
              {t("login.trustBadge2")}
            </div>
            <div className="footer-badge">
              <span className="footer-badge-icon">🌐</span>
              {t("login.trustBadge3")}
            </div>
          </div>
          <p>© 2026 {t("hero.brand")} · {t("hero.subtitle")}</p>
        </div>
      </div>
    </section>
  );
}
