/* eslint-disable @next/next/no-img-element */
"use client";
import { useLanguage } from "../i18n/LanguageContext";

export default function Hero() {
  const { t } = useLanguage();
  return (
    <section className="hero">
      <div className="container">
        <div className="hero-banner">
          <img src="/assets/hero-main.png" alt={t("hero.brand")} />
          <div className="hero-overlay">
            <h1>
              <span className="gradient">LA1</span>{" "}
              <span style={{ color: "#fff" }}>{t("hero.brand")}</span>
            </h1>
            <div className="hero-tagline">{t("hero.subtitle")}</div>
            <div className="hero-actions">
              <a
                className="btn btn-primary"
                href="https://t.me/LA1111_bot"
                target="_blank"
                rel="noopener noreferrer"
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
                  <path
                    d="M21 4L3 11.3l5.8 2.1L18 7.6l-6.9 6.1.1 5L14 15.8l3.1 2.3L21 4Z"
                    fill="#000"
                  />
                </svg>
                {t("hero.startGame")}
              </a>
              <a className="btn btn-outline" href="#games">
                {t("nav.games")}
              </a>
            </div>
          </div>
        </div>

        <div className="trust-bar">
          <div className="trust-item">
            <span className="trust-icon">🔒</span>
            {t("login.trustBadge1")}
          </div>
          <div className="trust-item">
            <span className="trust-icon">⚡</span>
            {t("login.trustBadge2")}
          </div>
          <div className="trust-item">
            <span className="trust-icon">🌐</span>
            {t("login.trustBadge3")}
          </div>
        </div>
      </div>
    </section>
  );
}
