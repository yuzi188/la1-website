"use client";
import { useLanguage } from "../i18n/LanguageContext";

export default function GamesSection() {
  const { t } = useLanguage();
  const games = [
    {
      title: t("games.slot"),
      desc: t("games.slotDesc"),
      img: "/assets/game-slot.png",
      tag: t("games.hot"),
    },
    {
      title: t("games.roulette"),
      desc: t("games.rouletteDesc"),
      img: "/assets/game-roulette.png",
      tag: t("games.classic"),
    },
    {
      title: t("games.baccarat"),
      desc: t("games.baccaratDesc"),
      img: "/assets/game-baccarat.png",
      tag: t("games.vip"),
    },
    {
      title: t("games.ai"),
      desc: t("games.aiDesc"),
      img: "/assets/game-ai.png",
      tag: "AI",
    },
  ];
  return (
    <section id="games" className="section">
      <div className="container">
        <div className="section-head">
          <div>
            <h2>{t("games.title")}</h2>
          </div>
          <p>
            {t("games.subtitle")}
          </p>
        </div>
        <div className="card-grid">
          {games.map((game) => (
            <a
              key={game.title}
              className="glass game-card"
              href="https://t.me/LA1111_bot"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div
                className="thumb"
                style={{ backgroundImage: `url(${game.img})` }}
              ></div>
              <div className="content">
                <span className="pill">{game.tag}</span>
                <h3>{game.title}</h3>
                <p>{game.desc}</p>
                <span className="card-cta">{t("games.enterGame")}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
