/**
 * Redis Cache — real-time game state storage
 * Falls back to in-memory Map if Redis is unavailable (dev mode).
 */

let client = null;
const memoryFallback = new Map();
let redisAvailable = false;

async function getClient() {
  if (client) return client;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("[Redis] REDIS_URL not set — using in-memory fallback");
    return null;
  }

  try {
    const { createClient } = require("redis");
    client = createClient({ url: redisUrl });
    client.on("error", (err) => {
      console.error("[Redis] Client error:", err.message);
      redisAvailable = false;
    });
    await client.connect();
    redisAvailable = true;
    console.log("[Redis] Connected");
    return client;
  } catch (err) {
    console.warn("[Redis] Connection failed, using in-memory fallback:", err.message);
    return null;
  }
}

async function set(key, value, ttlSeconds = 3600) {
  const c = await getClient();
  const serialized = JSON.stringify(value);
  if (c && redisAvailable) {
    await c.set(key, serialized, { EX: ttlSeconds });
  } else {
    memoryFallback.set(key, { value: serialized, expires: Date.now() + ttlSeconds * 1000 });
  }
}

async function get(key) {
  const c = await getClient();
  if (c && redisAvailable) {
    const raw = await c.get(key);
    return raw ? JSON.parse(raw) : null;
  }
  const entry = memoryFallback.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { memoryFallback.delete(key); return null; }
  return JSON.parse(entry.value);
}

async function del(key) {
  const c = await getClient();
  if (c && redisAvailable) {
    await c.del(key);
  } else {
    memoryFallback.delete(key);
  }
}

// ── Game-specific helpers ─────────────────────────────────────────────────────

const ROOM_STATE_TTL = 7200; // 2 hours

async function saveRoomState(roomId, state) {
  await set(`room:${roomId}`, state, ROOM_STATE_TTL);
}

async function loadRoomState(roomId) {
  return get(`room:${roomId}`);
}

async function deleteRoomState(roomId) {
  await del(`room:${roomId}`);
}

async function setPlayerSession(userId, data, ttl = 86400) {
  await set(`session:${userId}`, data, ttl);
}

async function getPlayerSession(userId) {
  return get(`session:${userId}`);
}

module.exports = {
  set, get, del,
  saveRoomState, loadRoomState, deleteRoomState,
  setPlayerSession, getPlayerSession,
};
