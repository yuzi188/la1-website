/**
 * LA1 Texas Hold'em — Unified Game Configuration
 *
 * ⚠️  All operational parameters are loaded from DB / env at runtime.
 *     These values are DEFAULTS only — never hard-coded in game logic.
 *     Change them in the DB (room_configs / system_configs tables) or
 *     via environment variables; no redeployment required.
 */

module.exports = {
  // ── Rake (抽水) ─────────────────────────────────────────────────────────────
  rake: {
    percent: parseFloat(process.env.RAKE_PERCENT ?? "0.05"),  // 5%
    cap:     parseFloat(process.env.RAKE_CAP     ?? "10"),    // 封頂 10U
    // Rake is only collected when pot > no-rake threshold
    noRakeThreshold: parseFloat(process.env.RAKE_NO_RAKE_THRESHOLD ?? "10"),
  },

  // ── Matchmaking / Bot fill strategy (配桌策略) ──────────────────────────────
  matchmaking: {
    minPlayers: parseInt(process.env.MM_MIN_PLAYERS ?? "2"),
    maxPlayers: parseInt(process.env.MM_MAX_PLAYERS ?? "6"),
    // Seconds to wait for a second human before filling with bots
    waitSeconds: parseInt(process.env.MM_WAIT_SECONDS ?? "15"),
  },

  // ── Bot global toggle ────────────────────────────────────────────────────────
  bot: {
    enabled: (process.env.BOT_ENABLED ?? "true") === "true",
    // Think-time range (ms) to simulate human delay
    thinkMin: parseInt(process.env.BOT_THINK_MIN ?? "800"),
    thinkMax: parseInt(process.env.BOT_THINK_MAX ?? "3000"),
  },

  // ── Turn timer ───────────────────────────────────────────────────────────────
  turn: {
    timeoutSeconds: parseInt(process.env.TURN_TIMEOUT_SECONDS ?? "30"),
    warningSeconds: parseInt(process.env.TURN_WARNING_SECONDS ?? "10"),
  },

  // ── Default room presets (overridden by DB room_configs rows) ────────────────
  defaultRooms: [
    {
      id: "room-beginner",
      name: "初級桌",
      small_blind: 1,
      big_blind:   2,
      min_buyin:   100,
      max_buyin:   300,
      max_players: 6,
      enable_bot:  true,
      bot_fill_target: 4,  // fill up to N seats with bots
      rake_percent: 0.05,
      rake_cap:     10,
    },
    {
      id: "room-intermediate",
      name: "中級桌",
      small_blind: 5,
      big_blind:   10,
      min_buyin:   500,
      max_buyin:   2000,
      max_players: 6,
      enable_bot:  true,
      bot_fill_target: 3,
      rake_percent: 0.05,
      rake_cap:     10,
    },
    {
      id: "room-advanced",
      name: "高級桌",
      small_blind: 10,
      big_blind:   20,
      min_buyin:   2000,
      max_buyin:   20000,
      max_players: 6,
      enable_bot:  false,
      bot_fill_target: 0,
      rake_percent: 0.04,
      rake_cap:     20,
    },
  ],
};
