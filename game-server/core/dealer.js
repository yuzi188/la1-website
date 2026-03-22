/**
 * Dealer — Texas Hold'em game flow controller
 * Orchestrates: deal → preflop → flop → turn → river → showdown → settle
 *
 * IMPORTANT: currentPlayerIndex is always an index into the FULL state.players
 * array, NOT into a filtered active-only array.
 */

const { v4: uuidv4 } = require("uuid");
const {
  PHASES, createDeck, getActivePlayers, getNonAllInPlayers, resetRound, nextPhase,
} = require("./state");
const { applyAction, isBettingRoundOver } = require("./actions");
const { sidePots, distributePots } = require("./sidepot");
const { compare, getBestFive, getHandName } = require("./engine");
const { calculateRakeSync } = require("./rake");
const { saveRound, finalizeRound, logAction } = require("../db");

/**
 * Start a new round in the given game state.
 * Mutates state in place; returns the updated state.
 */
async function startRound(state) {
  const active = state.players.filter(p => p && p.isActive && p.chips > 0);
  if (active.length < 2) throw new Error("Not enough players to start");

  // Assign new round ID
  state.roundId = uuidv4();
  state.phase   = PHASES.PREFLOP;
  state.deck    = createDeck();
  state.community = [];
  state.pot     = 0;
  state.sidePots = [];
  state.history  = [];

  // Reset player state
  state.players.forEach(p => {
    if (!p) return;
    p.cards     = [];
    p.bet       = 0;
    p.totalBet  = 0;
    p.folded    = false;
    p.allIn     = false;
    p.lastAction = null;
    p.buyIn     = p.buyIn || p.chips; // track buy-in for stats
  });

  // Rotate dealer button (full array index)
  state.dealerIndex = nextActiveIndex(state.players, state.dealerIndex);

  // Post blinds (full array indices)
  const sbIdx = nextActiveIndex(state.players, state.dealerIndex);
  const bbIdx = nextActiveIndex(state.players, sbIdx);
  state.smallBlindIndex = sbIdx;
  state.bigBlindIndex   = bbIdx;

  postBlind(state, state.players[sbIdx], state.smallBlind);
  postBlind(state, state.players[bbIdx], state.bigBlind);

  state.currentBet = state.bigBlind;
  state.minRaise   = state.bigBlind;

  // Deal 2 hole cards to each active player
  active.forEach(p => {
    p.cards = [state.deck.pop(), state.deck.pop()];
  });

  // First to act: player after BB (full array index, skip folded/all-in)
  state.currentPlayerIndex = nextActiveNonAllInIndex(state.players, bbIdx);

  await saveRound({
    id:        state.roundId,
    roomId:    state.roomId,
    phase:     state.phase,
    pot:       state.pot,
    community: state.community,
  });

  return state;
}

/**
 * Process a player action and advance the game if needed.
 */
async function handleAction(state, playerId, action, amount = 0) {
  const result = applyAction(state, playerId, action, amount);
  if (!result.success) return { success: false, error: result.error };

  await logAction(state.roundId, playerId, state.phase, action, amount);

  // Advance turn pointer (full array index)
  advanceTurn(state);

  // Check if betting round is complete
  if (isBettingRoundOver(state) || getActivePlayers(state).length <= 1) {
    await advancePhase(state);
  }

  return { success: true, state };
}

/**
 * Advance to the next game phase (flop/turn/river/showdown).
 */
async function advancePhase(state) {
  const active = getActivePlayers(state);

  // Only one player left — they win
  if (active.length === 1) {
    await settleRound(state, active);
    return;
  }

  resetRound(state);
  nextPhase(state);

  switch (state.phase) {
    case PHASES.FLOP:
      state.deck.pop(); // burn
      state.community.push(state.deck.pop(), state.deck.pop(), state.deck.pop());
      break;
    case PHASES.TURN:
      state.deck.pop();
      state.community.push(state.deck.pop());
      break;
    case PHASES.RIVER:
      state.deck.pop();
      state.community.push(state.deck.pop());
      break;
    case PHASES.SHOWDOWN:
      await settleRound(state, active);
      return;
  }

  // Set first actor (first active non-folded, non-all-in left of dealer)
  const nonAllIn = getNonAllInPlayers(state);
  if (nonAllIn.length === 0) {
    // Everyone all-in — run out the board automatically
    while (state.phase !== PHASES.SHOWDOWN) {
      resetRound(state);
      nextPhase(state);
      if (state.phase === PHASES.FLOP) {
        state.deck.pop();
        state.community.push(state.deck.pop(), state.deck.pop(), state.deck.pop());
      } else if (state.phase === PHASES.TURN || state.phase === PHASES.RIVER) {
        state.deck.pop();
        state.community.push(state.deck.pop());
      }
    }
    await settleRound(state, active);
    return;
  }

  // First to act post-flop: first active non-all-in left of dealer (full array index)
  state.currentPlayerIndex = nextActiveNonAllInIndex(state.players, state.dealerIndex);
}

/**
 * Settle the round: calculate rake, distribute pots, update chips.
 */
async function settleRound(state, activePlayers) {
  state.phase = PHASES.SHOWDOWN;

  // Build side pots
  const pots = sidePots(state.players.filter(p => p && p.totalBet > 0));

  // Apply rake to main pot
  const { rake, netPot } = calculateRakeSync(
    state.pot,
    parseFloat(state.roomConfig?.rake_percent ?? 0.05),
    parseFloat(state.roomConfig?.rake_cap     ?? 10),
    parseFloat(state.roomConfig?.no_rake_threshold ?? 10)
  );
  state.rake = rake;

  // Adjust main pot in pots array proportionally
  const totalInPots = pots.reduce((s, p) => s + p.amount, 0);
  if (totalInPots > 0) {
    const rakeRatio = rake / totalInPots;
    pots.forEach(p => { p.amount = Math.round(p.amount * (1 - rakeRatio) * 100) / 100; });
  }

  // Determine winners per pot
  const winnings = distributePots(pots, activePlayers, compare, state.community);

  // Build showdown result
  const showdown = activePlayers.map(p => {
    const best = getBestFive([...p.cards, ...state.community]);
    return {
      playerId: p.id,
      name:     p.name,
      cards:    p.cards,
      handName: getHandName(best.score),
      score:    best.score,
      won:      winnings[p.id] || 0,
    };
  });

  // Update chips
  activePlayers.forEach(p => {
    p.chips += winnings[p.id] || 0;
  });

  state.showdown  = showdown;
  state.phase     = PHASES.SETTLE;
  state.winners   = showdown.filter(r => r.won > 0);

  await finalizeRound(state.roundId, state.players);

  return state;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function postBlind(state, player, amount) {
  if (!player) return;
  const actual = Math.min(amount, player.chips);
  player.chips    -= actual;
  player.bet      += actual;
  player.totalBet += actual;
  state.pot       += actual;
  if (player.chips === 0) player.allIn = true;
}

/**
 * Find next active (non-folded, has chips) player in the FULL players array.
 */
function nextActiveIndex(players, fromIndex) {
  const len = players.length;
  let idx = (fromIndex + 1) % len;
  for (let i = 0; i < len; i++) {
    const p = players[idx];
    if (p && p.isActive && !p.folded && p.chips > 0) return idx;
    idx = (idx + 1) % len;
  }
  return fromIndex;
}

/**
 * Find next active, non-folded, non-all-in player in the FULL players array.
 */
function nextActiveNonAllInIndex(players, fromIndex) {
  const len = players.length;
  let idx = (fromIndex + 1) % len;
  for (let i = 0; i < len; i++) {
    const p = players[idx];
    if (p && p.isActive && !p.folded && !p.allIn) return idx;
    idx = (idx + 1) % len;
  }
  return fromIndex;
}

/**
 * Advance turn to the next active, non-folded, non-all-in player.
 * Uses FULL array indexing.
 */
function advanceTurn(state) {
  state.currentPlayerIndex = nextActiveNonAllInIndex(state.players, state.currentPlayerIndex);
}

module.exports = { startRound, handleAction, advancePhase, settleRound };
