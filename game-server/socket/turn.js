/**
 * Turn Timer — manages per-player action timeouts
 * Timeout values loaded from system config; no hard-coded durations.
 *
 * IMPORTANT: currentPlayerIndex is an index into the FULL state.players array,
 * NOT into a filtered active-only array.
 */

const { loadSystemConfigs } = require("../db");
const defaultConfig = require("../config/gameConfig");
const { handleAction } = require("../core/dealer");
const { getActivePlayers } = require("../core/state");
const { decide } = require("../bot/brain");
const { sanitizeState, rooms, tryStartRound } = require("./room");
const { saveRoomState } = require("../cache/redis");

// Active timers: roomId → { timer, warningTimer }
const timers = new Map();

/**
 * Start the turn timer for the current active player.
 * Uses FULL array indexing: state.players[state.currentPlayerIndex].
 */
async function startTurnTimer(io, roomId) {
  clearTurnTimer(roomId);

  const state = rooms.get(roomId);
  if (!state) return;

  // Get current player directly from full array
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (!currentPlayer || !currentPlayer.isActive || currentPlayer.folded || currentPlayer.allIn) {
    // Current player is invalid/folded/all-in — skip to next valid player
    const len = state.players.length;
    let nextIdx = (state.currentPlayerIndex + 1) % len;
    let found = false;
    for (let i = 0; i < len; i++) {
      const p = state.players[nextIdx];
      if (p && p.isActive && !p.folded && !p.allIn) {
        state.currentPlayerIndex = nextIdx;
        found = true;
        break;
      }
      nextIdx = (nextIdx + 1) % len;
    }
    if (!found) return; // No valid player to act
    // Retry with corrected index
    await startTurnTimer(io, roomId);
    return;
  }

  const sys = await loadSystemConfigs().catch(() => ({}));
  const timeout = parseInt(sys.turn_timeout_seconds ?? defaultConfig.turn.timeoutSeconds) * 1000;
  const warning = parseInt(sys.turn_warning_seconds ?? defaultConfig.turn.warningSeconds) * 1000;

  // Emit TURN event to all clients
  io.to(roomId).emit("TURN", {
    playerId:   currentPlayer.id,
    playerName: currentPlayer.name,
    timeoutMs:  timeout,
    phase:      state.phase,
  });

  // Bot: auto-decide
  if (currentPlayer.isBot) {
    const warningTimer = setTimeout(async () => {
      try {
        const { action, amount } = await decide(currentPlayer, state);
        await processTurnAction(io, roomId, currentPlayer.id, action, amount);
      } catch (err) {
        console.error("[Turn] Bot decide error:", err.message);
        await processTurnAction(io, roomId, currentPlayer.id, "FOLD", 0);
      }
    }, Math.min(warning, timeout - 200));

    timers.set(roomId, { timer: null, warningTimer });
    return;
  }

  // Human: warning at (timeout - warning)
  const warningTimer = setTimeout(() => {
    io.to(roomId).emit("TURN_WARNING", {
      playerId:    currentPlayer.id,
      remainingMs: warning,
    });
  }, timeout - warning);

  // Auto-fold on timeout
  const timer = setTimeout(async () => {
    console.log(`[Turn] Timeout — auto-folding ${currentPlayer.name}`);
    await processTurnAction(io, roomId, currentPlayer.id, "FOLD", 0);
  }, timeout);

  timers.set(roomId, { timer, warningTimer });
}

/**
 * Process a player action and broadcast updated state.
 */
async function processTurnAction(io, roomId, playerId, action, amount) {
  clearTurnTimer(roomId);

  const state = rooms.get(roomId);
  if (!state) return;

  console.log(`[Turn] processTurnAction: player=${playerId}, action=${action}, amount=${amount}, currentPlayerIndex=${state.currentPlayerIndex}, currentPlayer=${state.players[state.currentPlayerIndex]?.id}`);

  const result = await handleAction(state, playerId, action, amount);
  if (!result.success) {
    console.log(`[Turn] Action failed: ${result.error}`);
    // Send error only to the acting player (use String() for safe comparison)
    const player = state.players.find(p => p && String(p.id) === String(playerId));
    if (player?.socketId) {
      io.to(player.socketId).emit("ACTION_ERROR", { error: result.error });
    }
    // Restart timer
    await startTurnTimer(io, roomId);
    return;
  }

  await saveRoomState(roomId, state);

  // Broadcast action to all
  io.to(roomId).emit("ACTION", {
    playerId,
    action,
    amount,
    pot:   state.pot,
    phase: state.phase,
  });

  // Broadcast updated state to each player (with private cards)
  state.players.forEach(p => {
    if (!p || p.isBot) return;
    const personal = sanitizeState(state, p.id);
    io.to(p.socketId || roomId).emit("MATCH_UPDATE", personal);
  });

  // Handle phase transitions
  if (state.phase === "FLOP") {
    io.to(roomId).emit("FLOP", { cards: state.community.slice(0, 3) });
  } else if (state.phase === "TURN") {
    io.to(roomId).emit("TURN_CARD", { card: state.community[3] });
  } else if (state.phase === "RIVER") {
    io.to(roomId).emit("RIVER", { card: state.community[4] });
  } else if (state.phase === "SHOWDOWN" || state.phase === "SETTLE") {
    io.to(roomId).emit("SHOWDOWN", {
      community: state.community,
      showdown:  state.showdown,
      winners:   state.winners,
    });
    io.to(roomId).emit("SETTLE", {
      winners:  state.winners,
      rake:     state.rake,
    });
    // Broadcast balance updates
    state.players.forEach(p => {
      if (!p || p.isBot || !p.socketId) return;
      io.to(p.socketId).emit("BALANCE_UPDATE", { chips: p.chips });
    });
    // Schedule next round
    setTimeout(() => tryStartRound(roomId, io), 8000);
    return;
  }

  // Continue to next turn
  await startTurnTimer(io, roomId);
}

function clearTurnTimer(roomId) {
  const t = timers.get(roomId);
  if (t) {
    if (t.timer)        clearTimeout(t.timer);
    if (t.warningTimer) clearTimeout(t.warningTimer);
    timers.delete(roomId);
  }
}

module.exports = { startTurnTimer, processTurnAction, clearTurnTimer };
