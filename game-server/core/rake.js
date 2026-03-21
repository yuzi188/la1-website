/**
 * Rake (抽水) System
 * Percentage and cap are loaded from DB / config — never hard-coded.
 */

const { loadSystemConfigs } = require("../db");
const defaultConfig = require("../config/gameConfig");

/**
 * Calculate rake for a given pot using room-level config (preferred)
 * or system-level config as fallback.
 *
 * @param {number} pot         - Total pot amount
 * @param {object} roomConfig  - Room row from room_configs (has rake_percent, rake_cap)
 * @returns {{ rake: number, netPot: number }}
 */
async function calculateRake(pot, roomConfig = null) {
  let rakePercent, rakeCap, noRakeThreshold;

  if (roomConfig && roomConfig.rake_percent != null) {
    // Room-level override takes priority
    rakePercent      = parseFloat(roomConfig.rake_percent);
    rakeCap          = parseFloat(roomConfig.rake_cap);
    noRakeThreshold  = parseFloat(roomConfig.no_rake_threshold ?? defaultConfig.rake.noRakeThreshold);
  } else {
    // Fall back to system_configs table (with 60-s cache)
    const sys = await loadSystemConfigs();
    rakePercent      = parseFloat(sys.rake_percent      ?? defaultConfig.rake.percent);
    rakeCap          = parseFloat(sys.rake_cap          ?? defaultConfig.rake.cap);
    noRakeThreshold  = parseFloat(sys.rake_no_rake_threshold ?? defaultConfig.rake.noRakeThreshold);
  }

  // No rake on tiny pots
  if (pot <= noRakeThreshold) {
    return { rake: 0, netPot: pot };
  }

  let rake = pot * rakePercent;
  if (rake > rakeCap) rake = rakeCap;

  // Round to 2 decimal places
  rake = Math.round(rake * 100) / 100;

  return { rake, netPot: Math.round((pot - rake) * 100) / 100 };
}

/**
 * Synchronous version using pre-loaded config values.
 * Use this inside hot game-loop code to avoid async overhead.
 */
function calculateRakeSync(pot, rakePercent, rakeCap, noRakeThreshold = 10) {
  if (pot <= noRakeThreshold) return { rake: 0, netPot: pot };
  let rake = pot * rakePercent;
  if (rake > rakeCap) rake = rakeCap;
  rake = Math.round(rake * 100) / 100;
  return { rake, netPot: Math.round((pot - rake) * 100) / 100 };
}

module.exports = { calculateRake, calculateRakeSync };
