/**
 * Bot Brain — Behaviour model for AI players
 * Think-time and aggression loaded from system config (no hard-coded values).
 */

const { v4: uuidv4 } = require("uuid");
const { getBestFive } = require("../core/engine");
const { loadSystemConfigs } = require("../db");
const defaultConfig = require("../config/gameConfig");

const BOT_NAMES = [
  "機器鯊", "AI Pro", "算牌王", "鐵面人", "暗夜狐",
  "閃電手", "冷血客", "幸運星", "風暴神", "金算盤",
];

/**
 * Create a bot player object.
 */
function createBotPlayer({ roomId, seatIndex, buyIn, thinkMin, thinkMax }) {
  const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
  return {
    id:         `bot-${uuidv4()}`,
    name,
    chips:      buyIn,
    buyIn,
    seatIndex,
    isBot:      true,
    avatar:     null,
    cards:      [],
    bet:        0,
    totalBet:   0,
    folded:     false,
    allIn:      false,
    isActive:   true,
    lastAction: null,
    connected:  true,
    thinkMin:   thinkMin || defaultConfig.bot.thinkMin,
    thinkMax:   thinkMax || defaultConfig.bot.thinkMax,
    memory:     createMemory(),
  };
}

/**
 * Decide the bot's action given the current game state.
 * Returns { action, amount } after a simulated think delay.
 *
 * @param {object} bot    - Bot player object
 * @param {object} state  - Current game state
 */
async function decide(bot, state) {
  // Load think-time from system config
  const sys = await loadSystemConfigs().catch(() => ({}));
  const thinkMin = parseInt(sys.bot_think_min_ms ?? bot.thinkMin ?? defaultConfig.bot.thinkMin);
  const thinkMax = parseInt(sys.bot_think_max_ms ?? bot.thinkMax ?? defaultConfig.bot.thinkMax);

  // Simulate human think delay
  const delay = thinkMin + Math.random() * (thinkMax - thinkMin);
  await sleep(delay);

  const strength = evaluateStrength(bot, state);
  return makeDecision(bot, state, strength);
}

function evaluateStrength(bot, state) {
  if (!bot.cards || bot.cards.length < 2) return 0;
  const allCards = [...bot.cards, ...(state.community || [])];
  if (allCards.length < 5) {
    // Pre-flop: use hole card heuristic
    return holeCardStrength(bot.cards);
  }
  const { score } = getBestFive(allCards);
  return score;
}

function holeCardStrength(cards) {
  const RANKS = "23456789TJQKA";
  const r1 = RANKS.indexOf(cards[0][0]);
  const r2 = RANKS.indexOf(cards[1][0]);
  const suited = cards[0][1] === cards[1][1];
  const paired = r1 === r2;

  if (paired && r1 >= 10) return 7;   // high pair (JJ+)
  if (paired) return 5;               // low pair
  if (r1 >= 11 && r2 >= 11) return 6; // AK, AQ, KQ etc.
  if (Math.max(r1, r2) >= 11) return suited ? 4 : 3;
  if (suited && Math.abs(r1 - r2) <= 2) return 3; // suited connector
  return Math.max(r1, r2) >= 8 ? 2 : 1;
}

function makeDecision(bot, state, strength) {
  const callAmount = state.currentBet - bot.bet;
  const potOdds    = callAmount > 0 ? callAmount / (state.pot + callAmount) : 0;
  const bluff      = Math.random() < 0.12; // 12% bluff frequency

  // Strong hand (score 6+): raise
  if (strength >= 6) {
    const raiseAmount = Math.min(
      state.currentBet + state.bigBlind * 3,
      bot.chips + bot.bet
    );
    return { action: "RAISE", amount: raiseAmount };
  }

  // Medium hand (score 3-5): call or small raise
  if (strength >= 3) {
    if (callAmount === 0) return { action: "CHECK", amount: 0 };
    if (potOdds < 0.35) return { action: "CALL", amount: 0 };
    return { action: "FOLD", amount: 0 };
  }

  // Bluff: occasionally raise with weak hand
  if (bluff && callAmount === 0) {
    const raiseAmount = Math.min(
      state.currentBet + state.bigBlind * 2,
      bot.chips + bot.bet
    );
    return { action: "RAISE", amount: raiseAmount };
  }

  // Weak hand
  if (callAmount === 0) return { action: "CHECK", amount: 0 };
  if (callAmount <= state.bigBlind && Math.random() < 0.4) {
    return { action: "CALL", amount: 0 };
  }
  return { action: "FOLD", amount: 0 };
}

// ── Memory (tracks opponent tendencies) ──────────────────────────────────────

function createMemory() {
  return { opponents: {} };
}

function recordOpponentAction(memory, playerId, action) {
  if (!memory.opponents[playerId]) {
    memory.opponents[playerId] = { folds: 0, calls: 0, raises: 0, total: 0 };
  }
  const m = memory.opponents[playerId];
  m.total++;
  if (action === "FOLD")  m.folds++;
  if (action === "CALL")  m.calls++;
  if (action === "RAISE") m.raises++;
}

function getOpponentProfile(memory, playerId) {
  const m = memory.opponents[playerId];
  if (!m || m.total < 3) return "unknown";
  const foldRate  = m.folds  / m.total;
  const raiseRate = m.raises / m.total;
  if (foldRate  > 0.6) return "tight";
  if (raiseRate > 0.4) return "aggressive";
  return "normal";
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { createBotPlayer, decide, recordOpponentAction, getOpponentProfile };
