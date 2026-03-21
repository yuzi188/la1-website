/**
 * DB module — PostgreSQL connection + runtime config loader
 * All game parameters are read from the DB; defaults fall back to gameConfig.js
 */

const { Pool } = require("pg");
const defaultConfig = require("../config/gameConfig");

let pool = null;

function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes("localhost")
        ? false
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
    pool.on("error", (err) => {
      console.error("[DB] Unexpected pool error:", err.message);
    });
  }
  return pool;
}

// ── Room configs ─────────────────────────────────────────────────────────────

/**
 * Load all active room configs from DB.
 * Falls back to defaultConfig.defaultRooms if DB is unavailable.
 */
async function loadRoomConfigs() {
  try {
    const { rows } = await getPool().query(
      `SELECT * FROM room_configs WHERE is_active = TRUE ORDER BY sort_order ASC`
    );
    if (rows.length > 0) return rows;
  } catch (err) {
    console.warn("[DB] loadRoomConfigs fallback to defaults:", err.message);
  }
  return defaultConfig.defaultRooms;
}

/**
 * Load a single room config by ID.
 */
async function loadRoomConfig(roomId) {
  try {
    const { rows } = await getPool().query(
      `SELECT * FROM room_configs WHERE id = $1 AND is_active = TRUE`,
      [roomId]
    );
    if (rows.length > 0) return rows[0];
  } catch (err) {
    console.warn("[DB] loadRoomConfig fallback:", err.message);
  }
  return defaultConfig.defaultRooms.find(r => r.id === roomId) || null;
}

// ── System configs ────────────────────────────────────────────────────────────

let _sysConfigCache = null;
let _sysConfigCachedAt = 0;
const SYS_CONFIG_TTL_MS = 60_000; // refresh every 60 s

/**
 * Load system-wide key-value configs with a 60-second cache.
 * Returns a plain object { key: value }.
 */
async function loadSystemConfigs() {
  const now = Date.now();
  if (_sysConfigCache && now - _sysConfigCachedAt < SYS_CONFIG_TTL_MS) {
    return _sysConfigCache;
  }
  try {
    const { rows } = await getPool().query(`SELECT key, value FROM system_configs`);
    const cfg = {};
    rows.forEach(r => { cfg[r.key] = r.value; });
    _sysConfigCache = cfg;
    _sysConfigCachedAt = now;
    return cfg;
  } catch (err) {
    console.warn("[DB] loadSystemConfigs fallback:", err.message);
    // Return env / hardcoded defaults
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

/** Force-invalidate the system config cache (call after admin update). */
function invalidateSysConfigCache() {
  _sysConfigCache = null;
  _sysConfigCachedAt = 0;
}

// ── Round persistence ─────────────────────────────────────────────────────────

async function saveRound(round) {
  try {
    await getPool().query(
      `INSERT INTO game_rounds (id, room_id, phase, pot, rake, community, started_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (id) DO UPDATE SET phase=$3, pot=$4, rake=$5, community=$6`,
      [round.id, round.roomId, round.phase, round.pot, round.rake || 0, JSON.stringify(round.community)]
    );
  } catch (err) {
    console.error("[DB] saveRound error:", err.message);
  }
}

async function finalizeRound(roundId, players) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `UPDATE game_rounds SET phase='SETTLE', ended_at=NOW() WHERE id=$1`,
      [roundId]
    );
    for (const p of players) {
      await client.query(
        `INSERT INTO round_players (round_id, user_id, seat_index, buy_in, final_chips, net, is_bot, cards)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         ON CONFLICT DO NOTHING`,
        [roundId, p.id, p.seatIndex, p.buyIn || 0, p.chips, (p.chips - (p.buyIn || 0)), p.isBot, JSON.stringify(p.cards)]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("[DB] finalizeRound error:", err.message);
  } finally {
    client.release();
  }
}

async function logAction(roundId, userId, phase, action, amount) {
  try {
    await getPool().query(
      `INSERT INTO round_actions (round_id, user_id, phase, action, amount)
       VALUES ($1,$2,$3,$4,$5)`,
      [roundId, userId, phase, action, amount || 0]
    );
  } catch (err) {
    console.error("[DB] logAction error:", err.message);
  }
}

module.exports = {
  getPool,
  loadRoomConfigs,
  loadRoomConfig,
  loadSystemConfigs,
  invalidateSysConfigCache,
  saveRound,
  finalizeRound,
  logAction,
};
