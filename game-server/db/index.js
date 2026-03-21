/**
 * DB module — SQLite (better-sqlite3) + runtime config loader
 * All game parameters are read from the DB; defaults fall back to gameConfig.js
 *
 * On Railway, the DB file is stored on a Volume mount so data persists across deploys.
 * Set DATABASE_PATH env to control the file location (default: ./data/poker.db).
 */

const path = require("path");
const fs   = require("fs");
const defaultConfig = require("../config/gameConfig");

let db = null;

function getDb() {
  if (db) return db;

  const Database = require("better-sqlite3");
  const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "..", "data", "poker.db");

  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Run migrations
  try {
    const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
    db.exec(schema);
    console.log("[DB] SQLite initialized at", dbPath);
  } catch (err) {
    console.error("[DB] Migration error:", err.message);
  }

  return db;
}

// ── UUID helper ──────────────────────────────────────────────────────────────
function uuid() {
  const { randomUUID } = require("crypto");
  return randomUUID();
}

// ── Room configs ─────────────────────────────────────────────────────────────

async function loadRoomConfigs() {
  try {
    const rows = getDb().prepare(
      `SELECT * FROM room_configs WHERE is_active = 1 ORDER BY sort_order ASC`
    ).all();
    if (rows.length > 0) {
      return rows.map(normalizeRoomRow);
    }
  } catch (err) {
    console.warn("[DB] loadRoomConfigs fallback to defaults:", err.message);
  }
  return defaultConfig.defaultRooms;
}

async function loadRoomConfig(roomId) {
  try {
    const row = getDb().prepare(
      `SELECT * FROM room_configs WHERE id = ? AND is_active = 1`
    ).get(roomId);
    if (row) return normalizeRoomRow(row);
  } catch (err) {
    console.warn("[DB] loadRoomConfig fallback:", err.message);
  }
  return defaultConfig.defaultRooms.find(r => r.id === roomId) || null;
}

/** Convert SQLite integer booleans to JS booleans */
function normalizeRoomRow(row) {
  return {
    ...row,
    enable_bot: !!row.enable_bot,
    is_active:  !!row.is_active,
  };
}

// ── System configs ────────────────────────────────────────────────────────────

let _sysConfigCache = null;
let _sysConfigCachedAt = 0;
const SYS_CONFIG_TTL_MS = 60_000;

async function loadSystemConfigs() {
  const now = Date.now();
  if (_sysConfigCache && now - _sysConfigCachedAt < SYS_CONFIG_TTL_MS) {
    return _sysConfigCache;
  }
  try {
    const rows = getDb().prepare(`SELECT key, value FROM system_configs`).all();
    const cfg = {};
    rows.forEach(r => { cfg[r.key] = r.value; });
    _sysConfigCache = cfg;
    _sysConfigCachedAt = now;
    return cfg;
  } catch (err) {
    console.warn("[DB] loadSystemConfigs fallback:", err.message);
    return {
      rake_percent:         String(defaultConfig.rake.percent),
      rake_cap:             String(defaultConfig.rake.cap),
      bot_enabled:          String(defaultConfig.bot.enabled),
      bot_think_min_ms:     String(defaultConfig.bot.thinkMin),
      bot_think_max_ms:     String(defaultConfig.bot.thinkMax),
      turn_timeout_seconds: String(defaultConfig.turn.timeoutSeconds),
      mm_wait_seconds:      String(defaultConfig.matchmaking.waitSeconds),
      mm_min_players:       String(defaultConfig.matchmaking.minPlayers),
    };
  }
}

function invalidateSysConfigCache() {
  _sysConfigCache = null;
  _sysConfigCachedAt = 0;
}

// ── Round persistence ─────────────────────────────────────────────────────────

async function saveRound(round) {
  try {
    getDb().prepare(`
      INSERT INTO game_rounds (id, room_id, phase, pot, rake, community, started_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT(id) DO UPDATE SET phase=excluded.phase, pot=excluded.pot, rake=excluded.rake, community=excluded.community
    `).run(
      round.id, round.roomId, round.phase, round.pot, round.rake || 0, JSON.stringify(round.community)
    );
  } catch (err) {
    console.error("[DB] saveRound error:", err.message);
  }
}

async function finalizeRound(roundId, players) {
  const database = getDb();
  const txn = database.transaction(() => {
    database.prepare(
      `UPDATE game_rounds SET phase='SETTLE', ended_at=datetime('now') WHERE id=?`
    ).run(roundId);

    const stmt = database.prepare(`
      INSERT OR IGNORE INTO round_players (id, round_id, user_id, seat_index, buy_in, final_chips, net, is_bot, cards)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of players) {
      stmt.run(
        uuid(), roundId, p.id, p.seatIndex, p.buyIn || 0,
        p.chips, (p.chips - (p.buyIn || 0)),
        p.isBot ? 1 : 0, JSON.stringify(p.cards)
      );
    }
  });

  try {
    txn();
  } catch (err) {
    console.error("[DB] finalizeRound error:", err.message);
  }
}

async function logAction(roundId, userId, phase, action, amount) {
  try {
    getDb().prepare(`
      INSERT INTO round_actions (id, round_id, user_id, phase, action, amount)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuid(), roundId, userId, phase, action, amount || 0);
  } catch (err) {
    console.error("[DB] logAction error:", err.message);
  }
}

module.exports = {
  getDb,
  loadRoomConfigs,
  loadRoomConfig,
  loadSystemConfigs,
  invalidateSysConfigCache,
  saveRound,
  finalizeRound,
  logAction,
};
