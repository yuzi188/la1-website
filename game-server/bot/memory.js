/**
 * Bot Memory — Tracks opponent tendencies across hands
 */

class PlayerMemory {
  constructor() {
    this.data = {};
  }

  record(playerId, action) {
    if (!this.data[playerId]) {
      this.data[playerId] = { folds: 0, calls: 0, raises: 0, allIns: 0, total: 0 };
    }
    const m = this.data[playerId];
    m.total++;
    switch (action.toUpperCase()) {
      case "FOLD":   m.folds++;   break;
      case "CALL":   m.calls++;   break;
      case "RAISE":  m.raises++;  break;
      case "ALL_IN": m.allIns++;  break;
    }
  }

  profile(playerId) {
    const m = this.data[playerId];
    if (!m || m.total < 5) return { type: "unknown", vpip: 0, pfr: 0 };

    const vpip = (m.calls + m.raises + m.allIns) / m.total; // voluntarily put $ in pot
    const pfr  = (m.raises + m.allIns) / m.total;           // pre-flop raise rate

    let type = "normal";
    if (vpip < 0.2)                   type = "tight-passive";
    else if (vpip < 0.2 && pfr > 0.1) type = "tight-aggressive";
    else if (vpip > 0.5 && pfr < 0.2) type = "loose-passive";
    else if (vpip > 0.5 && pfr > 0.3) type = "loose-aggressive";

    return { type, vpip: Math.round(vpip * 100), pfr: Math.round(pfr * 100) };
  }

  clear(playerId) {
    delete this.data[playerId];
  }
}

module.exports = PlayerMemory;
