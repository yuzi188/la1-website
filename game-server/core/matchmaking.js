/**
 * Matchmaking & Bot Fill Strategy
 *
 * Rules (all thresholds read from room config / system config):
 *   < 2 human players  → do not start
 *   2 humans           → fill to min(4, bot_fill_target)
 *   3 humans           → fill to min(4 or 5, bot_fill_target)
 *   4+ humans          → no bots added
 *   enable_bot = false → never add bots (advanced tables)
 */

const { loadSystemConfigs } = require("../db");
const defaultConfig = require("../config/gameConfig");
const { createBotPlayer } = require("../bot/brain");

/**
 * Determine how many bots to add given the current room state.
 *
 * @param {object} room        - Live room object { players[], config }
 * @returns {number}           - Number of bots to add (0 if none needed)
 */
async function getBotFillCount(room) {
  const cfg = room.config;

  // Room-level bot toggle
  const botEnabled = cfg.enable_bot !== undefined
    ? cfg.enable_bot
    : (await loadSystemConfigs()).bot_enabled === "true";

  if (!botEnabled) return 0;

  const humanCount = room.players.filter(p => !p.isBot).length;
  const totalSeats = cfg.max_players || defaultConfig.matchmaking.maxPlayers;
  const fillTarget = cfg.bot_fill_target ?? 4;
  const currentTotal = room.players.length;

  // Don't start with fewer than 2 humans
  if (humanCount < 2) return 0;

  // Already at or above fill target
  if (currentTotal >= fillTarget) return 0;

  // Don't exceed max seats
  const botsToAdd = Math.min(fillTarget - currentTotal, totalSeats - currentTotal);
  return Math.max(0, botsToAdd);
}

/**
 * Fill a room with bot players according to the strategy.
 * Mutates room.players in place.
 *
 * @param {object} room   - Live room object
 * @param {object} sys    - Pre-loaded system configs (optional, avoids extra DB call)
 */
async function fillBots(room, sys = null) {
  const count = await getBotFillCount(room);
  if (count === 0) return;

  const sysConfig = sys || (await loadSystemConfigs());
  const thinkMin = parseInt(sysConfig.bot_think_min_ms ?? defaultConfig.bot.thinkMin);
  const thinkMax = parseInt(sysConfig.bot_think_max_ms ?? defaultConfig.bot.thinkMax);

  const usedSeats = new Set(room.players.map(p => p.seatIndex));

  for (let i = 0; i < count; i++) {
    // Find next free seat
    let seat = 0;
    while (usedSeats.has(seat)) seat++;
    usedSeats.add(seat);

    const bot = createBotPlayer({
      roomId:   room.id,
      seatIndex: seat,
      buyIn:    randomBuyIn(room.config),
      thinkMin,
      thinkMax,
    });
    room.players.push(bot);
  }
}

/**
 * Check whether a room is ready to start a new round.
 */
async function canStartRound(room) {
  const sys = await loadSystemConfigs();
  const minPlayers = parseInt(sys.mm_min_players ?? defaultConfig.matchmaking.minPlayers);
  const activePlayers = room.players.filter(p => p.isActive && p.chips > 0);
  return activePlayers.length >= minPlayers;
}

function randomBuyIn(cfg) {
  const min = parseFloat(cfg.min_buyin);
  const max = parseFloat(cfg.max_buyin);
  // Bots buy in at a random amount between min and min*3 (capped at max)
  const amount = min + Math.random() * Math.min(min * 2, max - min);
  return Math.round(amount / 10) * 10; // round to nearest 10
}

module.exports = { getBotFillCount, fillBots, canStartRound };
