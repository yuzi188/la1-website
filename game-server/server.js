/**
 * LA1 Texas Hold'em — Game Server Entry Point
 *
 * Stack: Express + Socket.IO + PostgreSQL + Redis
 * All game parameters loaded from DB / env — no hard-coded values.
 */

require("dotenv").config();

const express   = require("express");
const http      = require("http");
const { Server } = require("socket.io");
const cors      = require("cors");

const registerSocketHandlers = require("./socket");
const { getRoomList }        = require("./socket/room");
const { loadRoomConfigs, loadSystemConfigs, invalidateSysConfigCache } = require("./db");
const defaultConfig          = require("./config/gameConfig");

const app    = express();
const server = http.createServer(app);

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000")
  .split(",").map(s => s.trim());

app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

// ── Socket.IO ─────────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"], credentials: true },
  pingTimeout:  60000,
  pingInterval: 25000,
});

registerSocketHandlers(io);

// ── REST API ──────────────────────────────────────────────────────────────────

// Health check
app.get("/health", (req, res) => res.json({ status: "ok", ts: Date.now() }));

// Room list (for lobby SSR / polling fallback)
app.get("/api/rooms", async (req, res) => {
  try {
    const rooms = await getRoomList();
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Room configs (admin / debugging)
app.get("/api/room-configs", async (req, res) => {
  try {
    const configs = await loadRoomConfigs();
    res.json(configs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// System configs (admin read)
app.get("/api/system-configs", async (req, res) => {
  try {
    const cfg = await loadSystemConfigs();
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invalidate system config cache (call after admin update)
app.post("/api/system-configs/refresh", (req, res) => {
  invalidateSysConfigCache();
  res.json({ success: true, message: "Config cache cleared" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || "4000");

server.listen(PORT, () => {
  console.log(`\n🃏  LA1 Poker Game Server running on port ${PORT}`);
  console.log(`    Environment : ${process.env.NODE_ENV || "development"}`);
  console.log(`    DB URL      : ${process.env.DATABASE_URL ? "✅ set" : "⚠️  not set (DB features disabled)"}`);
  console.log(`    Redis URL   : ${process.env.REDIS_URL   ? "✅ set" : "⚠️  not set (in-memory fallback)"}`);
  console.log(`    Wallet URL  : ${process.env.WALLET_URL  ? "✅ set" : "⚠️  not set (wallet calls skipped)"}`);
  console.log(`    Bot enabled : ${defaultConfig.bot.enabled}\n`);
});

module.exports = { app, server, io };
