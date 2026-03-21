-- ============================================================
-- LA1 Texas Hold'em — Database Schema (SQLite)
-- All operational parameters stored here; no hard-coded values
-- ============================================================

-- ── Room configurations (動態房間配置) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_configs (
  id              TEXT        PRIMARY KEY,
  name            TEXT        NOT NULL,
  small_blind     REAL        NOT NULL DEFAULT 1,
  big_blind       REAL        NOT NULL DEFAULT 2,
  min_buyin       REAL        NOT NULL DEFAULT 100,
  max_buyin       REAL        NOT NULL DEFAULT 300,
  max_players     INTEGER     NOT NULL DEFAULT 6,
  enable_bot      INTEGER     NOT NULL DEFAULT 1,
  bot_fill_target INTEGER     NOT NULL DEFAULT 4,
  rake_percent    REAL        NOT NULL DEFAULT 0.05,
  rake_cap        REAL        NOT NULL DEFAULT 10,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  is_active       INTEGER     NOT NULL DEFAULT 1,
  created_at      TEXT        NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT        NOT NULL DEFAULT (datetime('now'))
);

-- ── System-wide key-value config (全局可調參數) ─────────────────────────────
CREATE TABLE IF NOT EXISTS system_configs (
  key             TEXT        PRIMARY KEY,
  value           TEXT        NOT NULL,
  description     TEXT,
  updated_at      TEXT        NOT NULL DEFAULT (datetime('now'))
);

-- ── Game rounds (每局記錄) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_rounds (
  id              TEXT        PRIMARY KEY,
  room_id         TEXT        NOT NULL REFERENCES room_configs(id),
  phase           TEXT        NOT NULL DEFAULT 'WAITING',
  pot             REAL        NOT NULL DEFAULT 0,
  rake            REAL        NOT NULL DEFAULT 0,
  community       TEXT        NOT NULL DEFAULT '[]',
  started_at      TEXT,
  ended_at        TEXT,
  created_at      TEXT        NOT NULL DEFAULT (datetime('now'))
);

-- ── Player seats in a round ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS round_players (
  id              TEXT        PRIMARY KEY,
  round_id        TEXT        NOT NULL REFERENCES game_rounds(id),
  user_id         TEXT        NOT NULL,
  seat_index      INTEGER     NOT NULL,
  buy_in          REAL        NOT NULL,
  final_chips     REAL,
  net             REAL,
  is_bot          INTEGER     NOT NULL DEFAULT 0,
  cards           TEXT,
  created_at      TEXT        NOT NULL DEFAULT (datetime('now'))
);

-- ── Action log (操作記錄) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS round_actions (
  id              TEXT        PRIMARY KEY,
  round_id        TEXT        NOT NULL REFERENCES game_rounds(id),
  user_id         TEXT        NOT NULL,
  phase           TEXT        NOT NULL,
  action          TEXT        NOT NULL,
  amount          REAL        NOT NULL DEFAULT 0,
  created_at      TEXT        NOT NULL DEFAULT (datetime('now'))
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_game_rounds_room    ON game_rounds(room_id);
CREATE INDEX IF NOT EXISTS idx_round_players_round ON round_players(round_id);
CREATE INDEX IF NOT EXISTS idx_round_actions_round ON round_actions(round_id);
CREATE INDEX IF NOT EXISTS idx_round_players_user  ON round_players(user_id);

-- ── Seed default room configs ────────────────────────────────────────────────
INSERT OR IGNORE INTO room_configs (id, name, small_blind, big_blind, min_buyin, max_buyin, max_players, enable_bot, bot_fill_target, rake_percent, rake_cap, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', '初級桌', 1,  2,  100,  300,   6, 1, 4, 0.05, 10, 1),
  ('00000000-0000-0000-0000-000000000002', '中級桌', 5,  10, 500,  2000,  6, 1, 3, 0.05, 10, 2),
  ('00000000-0000-0000-0000-000000000003', '高級桌', 10, 20, 2000, 20000, 6, 0, 0, 0.04, 20, 3);

-- ── Seed default system configs ──────────────────────────────────────────────
INSERT OR IGNORE INTO system_configs (key, value, description) VALUES
  ('rake_percent',          '0.05',  '全局抽水比例（可被房間配置覆蓋）'),
  ('rake_cap',              '10',    '全局抽水封頂（U）'),
  ('bot_enabled',           'true',  '全局 Bot 開關'),
  ('bot_think_min_ms',      '800',   'Bot 最短思考時間（毫秒）'),
  ('bot_think_max_ms',      '3000',  'Bot 最長思考時間（毫秒）'),
  ('turn_timeout_seconds',  '30',    '每回合操作超時（秒）'),
  ('mm_wait_seconds',       '15',    '等待第二位真人玩家秒數'),
  ('mm_min_players',        '2',     '開局最少玩家數');
