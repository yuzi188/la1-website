"use client";
import { useLanguage } from "../i18n/LanguageContext";

export default function LiveSection() {
  const { t } = useLanguage();
  return (
    <section id="live" className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2>{t("liveSection.title")}</h2>
          </div>
          <p>
            {t("liveSection.subtitle")}
          </p>
        </div>
        <div className="dealer-wrap">
          <a
            className="glass dealer-card"
            href="https://t.me/LA1111_bot"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div
              className="dealer-media"
              style={{ backgroundImage: "url('/assets/dealer-1.png')" }}
            ></div>
            <div className="dealer-content">
              <span className="pill">{t("liveSection.vipLive")}</span>
              <h3>{t("liveSection.topExperience")}</h3>
              <p>
                {t("liveSection.topExperienceDesc")}
              </p>
            </div>
          </a>
          <a
            className="glass dealer-card"
            href="https://t.me/LA1111_bot"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div
              className="dealer-media"
              style={{ backgroundImage: "url('/assets/dealer-2.png')" }}
            ></div>
            <div className="dealer-content">
              <span className="pill">{t("liveSection.vipRoom")}</span>
              <h3>{t("liveSection.privateVip")}</h3>
              <p>
                {t("liveSection.privateVipDesc")}
              </p>
            </div>
          </a>
        </div>
      </div>
    </section>
  );
}
