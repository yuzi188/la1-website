/**
 * Room Manager — manages live game rooms in memory + Redis
 * Room configs are loaded from DB; no parameters hard-coded here.
 */

const { v4: uuidv4 } = require("uuid");
const { createGameState, createPlayer } = require("../core/state");
const { fillBots, canStartRound } = require("../core/matchmaking");
const { startRound } = require("../core/dealer");
const { loadRoomConfig, loadRoomConfigs, loadSystemConfigs } = require("../db");
const { saveRoomState, loadRoomState } = require("../cache/redis");

// In-process room registry: roomId → gameState
const rooms = new Map();

/**
 * Get or create a live room instance for a given config ID.
 */
async function getOrCreateRoom(roomConfigId) {
  // Try in-memory first
  if (rooms.has(roomConfigId)) return rooms.get(roomConfigId);

  // Try Redis
  const cached = await loadRoomState(roomConfigId);
  if (cached) {
    rooms.set(roomConfigId, cached);
    return cached;
  }

  // Bootstrap from DB config
  const cfg = await loadRoomConfig(roomConfigId);
  if (!cfg) throw new Error(`Room config not found: ${roomConfigId}`);

  const sys = await loadSystemConfigs();
  const state = createGameState(roomConfigId, {
    smallBlind:   parseFloat(cfg.small_blind),
    bigBlind:     parseFloat(cfg.big_blind),
    minBuyIn:     parseFloat(cfg.min_buyin),
    maxBuyIn:     parseFloat(cfg.max_buyin),
    maxPlayers:   parseInt(cfg.max_players),
    turnTimeout:  parseInt(sys.turn_timeout_seconds ?? 30),
  });
  state.roomConfig = cfg; // attach for rake calculations
  state.config     = cfg; // alias used by matchmaking

  rooms.set(roomConfigId, state);
  await saveRoomState(roomConfigId, state);
  return state;
}

/**
 * Add a human player to a room.
 */
async function joinRoom(roomConfigId, userId, userName, buyIn, avatar = null) {
  const state = await getOrCreateRoom(roomConfigId);
  const cfg   = state.roomConfig || state.config;

  // Validate buy-in
  const minBuy = parseFloat(cfg.min_buyin);
  const maxBuy = parseFloat(cfg.max_buyin);
  if (buyIn < minBuy || buyIn > maxBuy) {
    throw new Error(`Buy-in must be between ${minBuy} and ${maxBuy}`);
  }

  // Check capacity
  if (state.players.filter(p => p.isActive).length >= parseInt(cfg.max_players)) {
    throw new Error("Room is full");
  }

  // Find free seat
  const usedSeats = new Set(state.players.map(p => p.seatIndex));
  let seat = 0;
  while (usedSeats.has(seat)) seat++;

  const player = createPlayer(userId, userName, buyIn, seat, false, avatar);
  player.buyIn = buyIn;
  state.players.push(player);

  await saveRoomState(roomConfigId, state);
  return { state, player };
}

/**
 * Remove a player from a room (disconnect / leave).
 */
async function leaveRoom(roomConfigId, userId) {
  const state = rooms.get(roomConfigId);
  if (!state) return;

  const player = state.players.find(p => p.id === userId);
  if (player) {
    player.isActive  = false;
    player.connected = false;
  }

  // Remove bots that are no longer needed
  const humanCount = state.players.filter(p => !p.isBot && p.isActive).length;
  if (humanCount === 0) {
    // Clear the room
    rooms.delete(roomConfigId);
    return;
  }

  await saveRoomState(roomConfigId, state);
}

/**
 * Attempt to start a round if conditions are met.
 * Fills bots first, then checks minimum player count.
 */
async function tryStartRound(roomConfigId, io) {
  const state = rooms.get(roomConfigId);
  if (!state) return;

  if (state.phase !== "WAITING" && state.phase !== "SETTLE") return;

  const sys = await loadSystemConfigs();

  // Fill bots
  await fillBots(state, sys);

  const ready = await canStartRound(state);
  if (!ready) return;

  await startRound(state);
  await saveRoomState(roomConfigId, state);

  // Broadcast game start
  if (io) {
    io.to(roomConfigId).emit("START_GAME", sanitizeState(state, null));
    broadcastDeal(io, state);
  }
}

/**
 * Get all active rooms with their player counts (for lobby).
 */
async function getRoomList() {
  const configs = await loadRoomConfigs();
  return configs.map(cfg => {
    const live  = rooms.get(cfg.id);
    const count = live ? live.players.filter(p => p.isActive).length : 0;
    return {
      id:          cfg.id,
      name:        cfg.name,
      smallBlind:  cfg.small_blind,
      bigBlind:    cfg.big_blind,
      minBuyIn:    cfg.min_buyin,
      maxBuyIn:    cfg.max_buyin,
      maxPlayers:  cfg.max_players,
      playerCount: count,
      phase:       live?.phase || "WAITING",
    };
  });
}

/**
 * Strip private card info before broadcasting to a specific player.
 */
function sanitizeState(state, viewingPlayerId) {
  return {
    roomId:       state.roomId,
    phase:        state.phase,
    pot:          state.pot,
    community:    state.community,
    currentBet:   state.currentBet,
    minRaise:     state.minRaise,
    dealerIndex:  state.dealerIndex,
    currentPlayerIndex: state.currentPlayerIndex,
    players: state.players.map(p => ({
      id:         p.id,
      name:       p.name,
      chips:      p.chips,
      bet:        p.bet,
      folded:     p.folded,
      allIn:      p.allIn,
      isActive:   p.isActive,
      seatIndex:  p.seatIndex,
      isBot:      p.isBot,
      avatar:     p.avatar,
      lastAction: p.lastAction,
      // Only reveal cards to the owner or at showdown
      cards: (p.id === viewingPlayerId || state.phase === "SHOWDOWN" || state.phase === "SETTLE")
        ? p.cards
        : p.cards.map(() => "??"),
    })),
    showdown: state.showdown || null,
    winners:  state.winners  || null,
  };
}

function broadcastDeal(io, state) {
  state.players.forEach(p => {
    if (!p.isBot && p.connected) {
      const personal = sanitizeState(state, p.id);
      io.to(p.socketId || state.roomId).emit("DEAL", personal);
    }
  });
}

module.exports = {
  getOrCreateRoom,
  joinRoom,
  leaveRoom,
  tryStartRound,
  getRoomList,
  sanitizeState,
  rooms,
};
