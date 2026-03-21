-- ============================================================
-- LA1 Texas Hold'em — Database Schema
-- All operational parameters stored here; no hard-coded values
-- ============================================================

-- ── Room configurations (動態房間配置) ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_configs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  small_blind  NUMERIC(12,2) NOT NULL DEFAULT 1,
  big_blind    NUMERIC(12,2) NOT NULL DEFAULT 2,
  min_buyin    NUMERIC(12,2) NOT NULL DEFAULT 100,
  max_buyin    NUMERIC(12,2) NOT NULL DEFAULT 300,
  max_players  INT         NOT NULL DEFAULT 6,
  enable_bot   BOOLEAN     NOT NULL DEFAULT TRUE,
  bot_fill_target INT      NOT NULL DEFAULT 4,   -- fill up to N seats with bots
  rake_percent NUMERIC(5,4) NOT NULL DEFAULT 0.05,
  rake_cap     NUMERIC(12,2) NOT NULL DEFAULT 10,
  sort_order   INT         NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMP   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── System-wide key-value config (全局可調參數) ─────────────────────────────
-- Allows live-tuning of any parameter without redeployment
CREATE TABLE IF NOT EXISTS system_configs (
  key          TEXT        PRIMARY KEY,
  value        TEXT        NOT NULL,
  description  TEXT,
  updated_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── Game rounds (每局記錄) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS game_rounds (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id      UUID        NOT NULL REFERENCES room_configs(id),
  phase        TEXT        NOT NULL DEFAULT 'WAITING',
  pot          NUMERIC(12,2) NOT NULL DEFAULT 0,
  rake         NUMERIC(12,2) NOT NULL DEFAULT 0,
  community    JSONB       NOT NULL DEFAULT '[]',
  started_at   TIMESTAMP,
  ended_at     TIMESTAMP,
  created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── Player seats in a round ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS round_players (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id     UUID        NOT NULL REFERENCES game_rounds(id),
  user_id      TEXT        NOT NULL,
  seat_index   INT         NOT NULL,
  buy_in       NUMERIC(12,2) NOT NULL,
  final_chips  NUMERIC(12,2),
  net          NUMERIC(12,2),
  is_bot       BOOLEAN     NOT NULL DEFAULT FALSE,
  cards        JSONB,
  created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── Action log (操作記錄) ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS round_actions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id     UUID        NOT NULL REFERENCES game_rounds(id),
  user_id      TEXT        NOT NULL,
  phase        TEXT        NOT NULL,
  action       TEXT        NOT NULL,   -- FOLD/CALL/RAISE/CHECK/ALL_IN
  amount       NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ── Indexes ─────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_game_rounds_room    ON game_rounds(room_id);
CREATE INDEX IF NOT EXISTS idx_round_players_round ON round_players(round_id);
CREATE INDEX IF NOT EXISTS idx_round_actions_round ON round_actions(round_id);
CREATE INDEX IF NOT EXISTS idx_round_players_user  ON round_players(user_id);

-- ── Seed default room configs ────────────────────────────────────────────────
INSERT INTO room_configs (id, name, small_blind, big_blind, min_buyin, max_buyin, max_players, enable_bot, bot_fill_target, rake_percent, rake_cap, sort_order)
VALUES
  ('00000000-0000-0000-0000-000000000001', '初級桌', 1,  2,  100,  300,   6, TRUE,  4, 0.05, 10, 1),
  ('00000000-0000-0000-0000-000000000002', '中級桌', 5,  10, 500,  2000,  6, TRUE,  3, 0.05, 10, 2),
  ('00000000-0000-0000-0000-000000000003', '高級桌', 10, 20, 2000, 20000, 6, FALSE, 0, 0.04, 20, 3)
ON CONFLICT (id) DO NOTHING;

-- ── Seed default system configs ──────────────────────────────────────────────
INSERT INTO system_configs (key, value, description) VALUES
  ('rake_percent',          '0.05',  '全局抽水比例（可被房間配置覆蓋）'),
  ('rake_cap',              '10',    '全局抽水封頂（U）'),
  ('bot_enabled',           'true',  '全局 Bot 開關'),
  ('bot_think_min_ms',      '800',   'Bot 最短思考時間（毫秒）'),
  ('bot_think_max_ms',      '3000',  'Bot 最長思考時間（毫秒）'),
  ('turn_timeout_seconds',  '30',    '每回合操作超時（秒）'),
  ('mm_wait_seconds',       '15',    '等待第二位真人玩家秒數'),
  ('mm_min_players',        '2',     '開局最少玩家數')
ON CONFLICT (key) DO NOTHING;
