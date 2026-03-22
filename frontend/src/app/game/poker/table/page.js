"use client";
import { useState, useEffect, useRef, Component, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTelegramAuth } from "../../../../hooks/useTelegramAuth";
import "../poker.css";

const GAME_SERVER_WS  = process.env.NEXT_PUBLIC_POKER_SERVER_WS  || "https://la1-backend-production.up.railway.app";
const GAME_SERVER_URL = process.env.NEXT_PUBLIC_POKER_SERVER_URL || "https://la1-backend-production.up.railway.app";

// ─── Safe helpers ─────────────────────────────────────────────────────────────
function safeFixed(value, digits = 2) {
  const n = parseFloat(value);
  if (isNaN(n)) return "0." + "0".repeat(digits);
  return n.toFixed(digits);
}

/**
 * Resolve the user's stable ID from the user object.
 * Backend stores Telegram users with tg_id, not id.
 */
function resolveUserId(user) {
  if (!user) return "guest";
  if (user.tg_id != null) return String(user.tg_id);
  if (user.id != null) return String(user.id);
  if (user.username) return user.username;
  return "guest";
}

/**
 * Determine if it is the hero's turn.
 * Supports three server conventions:
 *   1. state.currentPlayerId  — direct player id (most reliable)
 *   2. state.currentPlayerIndex into the FULL players array (including nulls)
 *   3. state.currentPlayerIndex into the active-only filtered array (old logic)
 */
function calcIsMyTurn(state, heroId) {
  if (!state || !heroId) return false;
  // Convention 1: server sends currentPlayerId directly
  if (state.currentPlayerId != null) {
    return String(state.currentPlayerId) === String(heroId);
  }
  const players = state.players || [];
  const idx = state.currentPlayerIndex;
  if (idx == null) return false;
  // Convention 2: index into full array (most common)
  const byFull = players[idx];
  if (byFull && byFull.id != null) {
    return String(byFull.id) === String(heroId);
  }
  // Convention 3: index into active-only filtered array
  const active = players.filter(p => p && p.isActive && !p.folded && !p.allIn);
  const byActive = active[idx];
  if (byActive && byActive.id != null) {
    return String(byActive.id) === String(heroId);
  }
  return false;
}

// ─── Error Boundary ───────────────────────────────────────────────────────────
class PokerTableErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[PokerTable] Runtime error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#000", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🃏</div>
          <div style={{ fontSize: "18px", fontWeight: "800", color: "#FFD700", marginBottom: "8px" }}>牌桌載入失敗</div>
          <div style={{ fontSize: "13px", color: "#999", marginBottom: "24px", maxWidth: "300px" }}>
            {this.state.error?.message || "發生未知錯誤，請重新整理頁面"}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = "/game/poker"; }}
            style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)", border: "none", borderRadius: "12px", padding: "12px 28px", color: "#000", fontWeight: "800", fontSize: "14px", cursor: "pointer" }}
          >
            返回大廳
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Suit symbols & colors ────────────────────────────────────────────────────
const SUIT_MAP = {
  h: { symbol: "♥", color: "red",   name: "hearts"   },
  d: { symbol: "♦", color: "red",   name: "diamonds" },
  c: { symbol: "♣", color: "black", name: "clubs"    },
  s: { symbol: "♠", color: "black", name: "spades"   },
};

const RANK_DISPLAY = { T: "10", J: "J", Q: "Q", K: "K", A: "A" };

function parseCard(card) {
  if (!card || card === "??") return null;
  const rank = card[0];
  const suit = card[1];
  return {
    rank:   RANK_DISPLAY[rank] || rank,
    suit:   SUIT_MAP[suit] || SUIT_MAP["s"],
    hidden: false,
  };
}

// ─── PokerCard Component ──────────────────────────────────────────────────────
function PokerCard({ card, index = 0, hidden = false, delay = 0, size = "normal", showdown = false }) {
  const [dealt, setDealt] = useState(false);
  const [revealed, setRevealed] = useState(!hidden);

  useEffect(() => {
    const t = setTimeout(() => setDealt(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (showdown && hidden) {
      const t = setTimeout(() => setRevealed(true), delay + 200);
      return () => clearTimeout(t);
    }
    setRevealed(!hidden);
  }, [hidden, showdown, delay]);

  const parsed = card !== "??" ? parseCard(card) : null;
  const isHidden = !revealed || !parsed;

  const dims = size === "community"
    ? { w: 46, h: 65, rankSize: 12, suitSize: 9, centerSize: 20 }
    : size === "hole"
    ? { w: 40, h: 56, rankSize: 11, suitSize: 8, centerSize: 18 }
    : { w: 52, h: 74, rankSize: 13, suitSize: 10, centerSize: 22 };

  return (
    <div style={{
      width: dims.w, height: dims.h,
      borderRadius: "7px",
      transform:  dealt ? "translateY(0) scale(1)" : "translateY(-80px) scale(0.6)",
      opacity:    dealt ? 1 : 0,
      transition: `all 0.4s cubic-bezier(0.34,1.56,0.64,1) ${delay}ms`,
      marginLeft: index > 0 ? "-8px" : "0",
      zIndex:     index,
      flexShrink: 0,
      position:   "relative",
    }}>
      {isHidden ? (
        <div style={{
          width: "100%", height: "100%", borderRadius: "7px",
          background: "linear-gradient(135deg, #1a0800, #2d1200)",
          border: "1.5px solid #FFD700",
          display: "flex", alignItems: "center", justifyContent: "center",
          overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}>
          <div style={{
            position: "absolute", inset: "3px",
            border: "1px solid rgba(255,215,0,0.25)", borderRadius: "5px",
            background: "repeating-linear-gradient(45deg,transparent,transparent 3px,rgba(255,215,0,0.04) 3px,rgba(255,215,0,0.04) 6px)",
          }} />
          <span style={{ fontSize: dims.rankSize - 1, fontWeight: 900, color: "#FFD700", textShadow: "0 0 6px rgba(255,215,0,0.5)", zIndex: 1 }}>LA1</span>
        </div>
      ) : (
        <div style={{
          width: "100%", height: "100%", borderRadius: "7px",
          background: "#fff",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          padding: "3px 4px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.8)",
          animation: showdown ? "showdownReveal 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards" : "none",
        }}>
          <div style={{ lineHeight: 1 }}>
            <div style={{ fontSize: dims.rankSize, fontWeight: 900, color: parsed.suit.color === "red" ? "#e53935" : "#1a1a1a", fontFamily: "Georgia,serif" }}>{parsed.rank}</div>
            <div style={{ fontSize: dims.suitSize, color: parsed.suit.color === "red" ? "#e53935" : "#1a1a1a" }}>{parsed.suit.symbol}</div>
          </div>
          <div style={{ textAlign: "center", fontSize: dims.centerSize, color: parsed.suit.color === "red" ? "#e53935" : "#1a1a1a", lineHeight: 1 }}>{parsed.suit.symbol}</div>
          <div style={{ lineHeight: 1, transform: "rotate(180deg)", alignSelf: "flex-end" }}>
            <div style={{ fontSize: dims.rankSize, fontWeight: 900, color: parsed.suit.color === "red" ? "#e53935" : "#1a1a1a", fontFamily: "Georgia,serif" }}>{parsed.rank}</div>
            <div style={{ fontSize: dims.suitSize, color: parsed.suit.color === "red" ? "#e53935" : "#1a1a1a" }}>{parsed.suit.symbol}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Seat positions (6-player oval table) ────────────────────────────────────
const SEAT_POSITIONS = [
  { top: "78%", left: "50%",  transform: "translate(-50%, -50%)" },
  { top: "78%", left: "22%",  transform: "translate(-50%, -50%)" },
  { top: "42%", left: "5%",   transform: "translate(-50%, -50%)" },
  { top: "10%", left: "22%",  transform: "translate(-50%, -50%)" },
  { top: "10%", left: "78%",  transform: "translate(-50%, -50%)" },
  { top: "42%", left: "95%",  transform: "translate(-50%, -50%)" },
];

// ─── PlayerSeat Component ─────────────────────────────────────────────────────
function PlayerSeat({ player, isHero, isDealer, isCurrentTurn, phase, showdown }) {
  if (!player) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          border: "1.5px dashed rgba(255,255,255,0.1)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(255,255,255,0.15)", fontSize: "18px",
        }}>+</div>
        <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.15)" }}>空位</div>
      </div>
    );
  }

  const isWinner = showdown && player.lastAction !== "FOLD" && !player.folded;
  const avatarEmoji = player.isBot ? "🤖" : "👤";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", position: "relative" }}>
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: isHero ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.05)",
        border: `2px solid ${isWinner ? "#FFD700" : isCurrentTurn ? "#FFD700" : isHero ? "rgba(255,215,0,0.5)" : "rgba(255,255,255,0.12)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: "20px",
        boxShadow: isCurrentTurn ? "0 0 15px rgba(255,215,0,0.5), 0 0 30px rgba(255,215,0,0.2)" : "none",
        opacity: player.folded ? 0.3 : 1,
        transition: "all 0.3s",
        animation: isCurrentTurn ? "neonPulse 1.5s ease-in-out infinite" : isWinner ? "winPulse 1s ease-out 3" : "none",
        position: "relative",
      }}>
        {avatarEmoji}
        {isDealer && (
          <div style={{
            position: "absolute", top: -5, right: -5,
            width: 18, height: 18, borderRadius: "50%",
            background: "linear-gradient(135deg,#FFD700,#FFA500)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "8px", fontWeight: 900, color: "#000",
            boxShadow: "0 0 6px rgba(255,215,0,0.6)",
          }}>D</div>
        )}
      </div>
      <div style={{ fontSize: "10px", fontWeight: 700, color: isHero ? "#FFD700" : "#fff", maxWidth: "65px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
        {player.name || "玩家"}
      </div>
      <div style={{ fontSize: "10px", fontWeight: 800, color: "#FFD700" }}>
        {safeFixed(player.chips, 0)} U
      </div>
      {(player.bet || 0) > 0 && (
        <div style={{ fontSize: "9px", color: "#00BFFF", fontWeight: 700 }}>下注 {player.bet}</div>
      )}
      {player.lastAction && !isCurrentTurn && (
        <div style={{
          fontSize: "9px", padding: "1px 6px", borderRadius: "6px", fontWeight: 700,
          background: player.lastAction === "FOLD" ? "rgba(255,107,107,0.2)" : player.lastAction === "RAISE" ? "rgba(255,215,0,0.2)" : player.lastAction === "ALL_IN" ? "rgba(255,100,0,0.2)" : "rgba(0,191,255,0.2)",
          color: player.lastAction === "FOLD" ? "#FF6B6B" : player.lastAction === "RAISE" ? "#FFD700" : player.lastAction === "ALL_IN" ? "#FF6B00" : "#00BFFF",
          border: "1px solid currentColor", opacity: 0.8,
        }}>
          {player.lastAction === "ALL_IN" ? "全押" : player.lastAction === "FOLD" ? "棄牌" : player.lastAction === "CALL" ? "跟注" : player.lastAction === "RAISE" ? "加注" : player.lastAction === "CHECK" ? "過牌" : player.lastAction}
        </div>
      )}
      {player.cards && player.cards.length === 2 && !player.folded && (
        <div style={{ display: "flex", gap: "2px", marginTop: "2px" }}>
          {player.cards.map((c, i) => (
            <PokerCard key={i} card={c} index={i} hidden={c === "??"} delay={i * 100} size="hole" showdown={phase === "SHOWDOWN" || phase === "SETTLE"} />
          ))}
        </div>
      )}
      {player.allIn && (
        <div style={{ fontSize: "9px", color: "#FF6B00", fontWeight: 800, border: "1px solid rgba(255,107,0,0.4)", padding: "1px 5px", borderRadius: "5px" }}>ALL IN</div>
      )}
    </div>
  );
}

// ─── Action Panel (INLINE — not fixed) ───────────────────────────────────────
// Rendered directly in the page flow below the table. No position:fixed so it
// is never covered by the bottom nav or the floating trophy button.
function ActionPanel({ state, heroId, onAction, timeLeft, totalTime }) {
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [showRaise, setShowRaise] = useState(false);

  const hero = state?.players?.find(p => p && String(p.id) === String(heroId));

  // Use the robust multi-convention turn check
  const isMyTurn = !!(hero && !hero.folded && !hero.allIn && calcIsMyTurn(state, heroId));

  useEffect(() => {
    if (state) {
      const minRaise = (state.currentBet || 0) + (state.minRaise || state.bigBlind || 10);
      setRaiseAmount(minRaise);
    }
  }, [state]);

  // Always render the container so it takes up space; hide content when not turn
  if (!isMyTurn) {
    // Show a subtle "waiting" indicator so the space is reserved
    return (
      <div style={{
        width: "100%", maxWidth: "480px", margin: "0 auto",
        background: "rgba(5,5,10,0.95)",
        borderTop: "1px solid rgba(255,215,0,0.08)",
        borderRadius: "16px 16px 0 0",
        padding: "14px 16px",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "11px", color: "rgba(255,255,255,0.25)" }}>等待其他玩家...</div>
      </div>
    );
  }

  const callAmount = (state.currentBet || 0) - (hero?.bet || 0);
  const canCheck   = callAmount <= 0;
  const maxRaise   = (hero?.chips || 0) + (hero?.bet || 0);
  const minRaise   = (state.currentBet || 0) + (state.minRaise || state.bigBlind || 10);
  const timerPct   = totalTime > 0 ? (timeLeft / totalTime) * 100 : 100;
  const isUrgent   = timerPct < 30;

  return (
    <div style={{
      width: "100%", maxWidth: "480px", margin: "0 auto",
      background: "rgba(5,5,10,0.97)",
      borderTop: "1px solid rgba(255,215,0,0.2)",
      borderRadius: "16px 16px 0 0",
      padding: "10px 16px 16px",
    }}>
      {/* Timer bar */}
      <div style={{ height: "3px", background: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "10px" }}>
        <div style={{
          height: "100%", borderRadius: "2px",
          width: `${timerPct}%`,
          transition: "width 1s linear",
          background: isUrgent ? "#FF6B6B" : "linear-gradient(90deg,#FFD700,#00BFFF)",
          boxShadow: isUrgent ? "0 0 6px rgba(255,107,107,0.6)" : "none",
        }} />
      </div>

      <div style={{ fontSize: "11px", color: "#888", marginBottom: "10px", textAlign: "center" }}>
        輪到你了 · {timeLeft}s
      </div>

      {/* Raise slider */}
      {showRaise && (
        <div style={{ marginBottom: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", color: "#999", marginBottom: "4px" }}>
            <span>加注金額</span>
            <span style={{ color: "#FFD700", fontWeight: 800 }}>{raiseAmount} U</span>
          </div>
          <input
            type="range"
            className="raise-slider"
            min={minRaise}
            max={maxRaise}
            step={state.bigBlind || 10}
            value={raiseAmount}
            onChange={e => setRaiseAmount(Number(e.target.value))}
          />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#555" }}>
            <span>Min {minRaise}</span>
            <span>All-in {maxRaise}</span>
          </div>
          <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
            {[2, 3, 5].map(mult => {
              const amt = Math.min((state.bigBlind || 10) * mult + (state.currentBet || 0), maxRaise);
              return (
                <button key={mult} onClick={() => setRaiseAmount(amt)} style={{
                  flex: 1, background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.2)",
                  borderRadius: "8px", padding: "6px 4px", color: "#FFD700", fontSize: "11px",
                  fontWeight: 700, cursor: "pointer",
                }}>{mult}x</button>
              );
            })}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: "8px" }}>
        <button className="action-btn action-btn-fold"
          onClick={() => { setShowRaise(false); onAction("FOLD", 0); }}>
          棄牌
        </button>

        {canCheck ? (
          <button className="action-btn action-btn-check"
            onClick={() => { setShowRaise(false); onAction("CHECK", 0); }}>
            過牌
          </button>
        ) : (
          <button className="action-btn action-btn-call"
            onClick={() => { setShowRaise(false); onAction("CALL", 0); }}>
            跟注{callAmount > 0 ? ` +${callAmount}` : ""}
          </button>
        )}

        <button className="action-btn action-btn-raise"
          onClick={() => {
            if (showRaise) { onAction("RAISE", raiseAmount); setShowRaise(false); }
            else { setShowRaise(true); }
          }}>
          {showRaise ? `確認 ${raiseAmount}U` : "加注"}
        </button>

        <button className="action-btn action-btn-allin"
          onClick={() => { setShowRaise(false); onAction("ALL_IN", 0); }}>
          全押
        </button>
      </div>
    </div>
  );
}

// ─── Showdown Overlay ─────────────────────────────────────────────────────────
function ShowdownOverlay({ showdown, winners, community, onClose }) {
  if (!showdown) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
      zIndex: 800, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "20px",
    }}>
      <div style={{ fontWeight: 900, fontSize: "22px", color: "#FFD700", marginBottom: "16px", textShadow: "0 0 20px rgba(255,215,0,0.5)" }}>🏆 攤牌</div>
      <div style={{ display: "flex", gap: "6px", marginBottom: "20px" }}>
        {(community || []).map((c, i) => (
          <PokerCard key={i} card={c} index={i} delay={i * 80} size="community" showdown />
        ))}
      </div>
      <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "10px" }}>
        {showdown.map((result, i) => {
          const isWinner = winners?.some(w => w.playerId === result.playerId);
          return (
            <div key={i} style={{
              background: isWinner ? "rgba(255,215,0,0.1)" : "rgba(255,255,255,0.03)",
              border: `1px solid ${isWinner ? "rgba(255,215,0,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: "12px", padding: "12px 14px",
              display: "flex", alignItems: "center", gap: "12px",
              animation: `slideUp 0.3s ease-out ${i * 100}ms both`,
            }}>
              <div style={{ fontSize: "20px" }}>{result.playerId?.startsWith("bot") ? "🤖" : "👤"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "14px", color: isWinner ? "#FFD700" : "#fff" }}>{result.name}</div>
                <div style={{ fontSize: "11px", color: "#999" }}>{result.handName}</div>
              </div>
              <div style={{ display: "flex", gap: "3px" }}>
                {(result.cards || []).map((c, ci) => (
                  <PokerCard key={ci} card={c} index={ci} delay={ci * 80 + i * 150} size="hole" showdown />
                ))}
              </div>
              {isWinner && (
                <div style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)", color: "#000", fontWeight: 900, fontSize: "11px", padding: "4px 10px", borderRadius: "8px", whiteSpace: "nowrap" }}>
                  +{safeFixed(result.won, 2)} U
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button onClick={onClose} style={{ marginTop: "20px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "12px", padding: "12px 32px", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}>
        繼續
      </button>
    </div>
  );
}

// ─── Main Table Content ───────────────────────────────────────────────────────
function PokerTableContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading } = useTelegramAuth();

  const roomId = params.get("roomId") || "room-beginner";
  const buyIn  = parseFloat(params.get("buyIn") || "100");

  const [gameState,    setGameState]    = useState(null);
  const [connected,    setConnected]    = useState(false);
  const [status,       setStatus]       = useState("連接中...");
  const [showShowdown, setShowShowdown] = useState(false);
  const [timeLeft,     setTimeLeft]     = useState(30);
  const [totalTime,    setTotalTime]    = useState(30);
  const [actionLog,    setActionLog]    = useState([]);
  const [heroId,       setHeroId]       = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const [showRebuy,    setShowRebuy]    = useState(false);
  const [rebuyMsg,     setRebuyMsg]     = useState(null);

  const socketRef  = useRef(null);
  const timerRef   = useRef(null);
  const heroIdRef  = useRef(null); // ref copy so socket handlers always see latest value

  // Keep heroIdRef in sync
  useEffect(() => { heroIdRef.current = heroId; }, [heroId]);

  // ── Connect to game server ──────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !user) return;

    let socket;
    const initSocket = async () => {
      try {
        const { io } = await import("socket.io-client");
        socket = io(`${GAME_SERVER_WS}/poker`, {
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 5,
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          setConnected(true);
          setStatus("已連接");
          const userId   = resolveUserId(user);
          const userName = user.first_name || user.username || "玩家";
          heroIdRef.current = userId;
          setHeroId(userId);
          // Always emit JOIN_ROOM — backend handles reconnect vs new join
          socket.emit("JOIN_ROOM", { roomId, userId, userName, buyIn });
        });

        socket.on("reconnect", () => {
          setConnected(true);
          setStatus("重新連接中...");
          const userId   = resolveUserId(user);
          const userName = user.first_name || user.username || "玩家";
          // Re-emit JOIN_ROOM — backend will detect existing player and restore state
          socket.emit("JOIN_ROOM", { roomId, userId, userName, buyIn });
        });

        socket.on("disconnect", () => {
          setConnected(false);
          setStatus("連接斷開");
        });

        socket.on("JOIN_SUCCESS", ({ state, reconnected, walletBalance: wb }) => {
          setGameState(state);
          if (wb != null) setWalletBalance(wb);
          if (reconnected) {
            setStatus(state?.phase && state.phase !== "WAITING" ? "遊戲進行中" : "等待開局");
          } else {
            setStatus("等待開局");
          }
        });

        socket.on("JOIN_ERROR", ({ error }) => setStatus(`錯誤: ${error}`));

        socket.on("START_GAME", (state) => {
          setGameState(state);
          setStatus("遊戲開始");
          setShowShowdown(false);
        });

        socket.on("DEAL", (state) => {
          setGameState(state);
          setStatus("發牌中");
        });

        socket.on("MATCH_UPDATE", (state) => {
          setGameState(state);
        });

        socket.on("ACTION", ({ playerId, action, amount }) => {
          setGameState(prev => {
            if (!prev) return prev;
            const playerName = prev.players?.find(p => p && p.id === playerId)?.name || playerId;
            const actionLabel = { FOLD: "棄牌", CALL: "跟注", RAISE: "加注", CHECK: "過牌", ALL_IN: "全押" }[action] || action;
            setActionLog(logs => [{
              id: Date.now(),
              text: `${playerName} ${actionLabel}${amount > 0 ? ` ${amount}U` : ""}`,
              ts: Date.now(),
            }, ...logs.slice(0, 9)]);
            return prev;
          });
        });

        socket.on("TURN", ({ playerId, timeoutMs }) => {
          const secs = Math.floor((timeoutMs || 30000) / 1000);
          setTotalTime(secs);
          setTimeLeft(secs);
          clearInterval(timerRef.current);
          timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
              if (prev <= 1) { clearInterval(timerRef.current); return 0; }
              return prev - 1;
            });
          }, 1000);
        });

        socket.on("FLOP", ({ cards }) => {
          setStatus("翻牌");
          setGameState(prev => prev ? { ...prev, community: cards } : prev);
        });

        socket.on("TURN_CARD", ({ card }) => {
          setStatus("轉牌");
          setGameState(prev => prev ? { ...prev, community: [...(prev.community || []), card] } : prev);
        });

        socket.on("RIVER", ({ card }) => {
          setStatus("河牌");
          setGameState(prev => prev ? { ...prev, community: [...(prev.community || []), card] } : prev);
        });

        socket.on("SHOWDOWN", ({ community, showdown, winners }) => {
          setStatus("攤牌");
          setGameState(prev => prev ? { ...prev, community, showdown, winners, phase: "SHOWDOWN" } : prev);
          setTimeout(() => setShowShowdown(true), 800);
        });

        socket.on("SETTLE", () => {
          setStatus("結算中");
          setGameState(prev => prev ? { ...prev, phase: "SETTLE" } : prev);
        });

        socket.on("BALANCE_UPDATE", ({ chips, walletBalance: wb }) => {
          if (wb != null) setWalletBalance(wb);
          setGameState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.map(p =>
                p && String(p.id) === String(heroIdRef.current) ? { ...p, chips } : p
              ),
            };
          });
        });

        socket.on("REBUY_SUCCESS", ({ chips, amount, walletBalance: wb }) => {
          if (wb != null) setWalletBalance(wb);
          setRebuyMsg({ type: "success", text: `加購 ${amount} U 成功！籌碼：${chips} U` });
          setTimeout(() => setRebuyMsg(null), 3000);
          setShowRebuy(false);
          setGameState(prev => {
            if (!prev) return prev;
            return {
              ...prev,
              players: prev.players.map(p =>
                p && String(p.id) === String(heroIdRef.current) ? { ...p, chips } : p
              ),
            };
          });
        });

        socket.on("REBUY_ERROR", ({ error }) => {
          setRebuyMsg({ type: "error", text: error });
          setTimeout(() => setRebuyMsg(null), 4000);
        });

      } catch (err) {
        console.error("Socket init error:", err);
        setStatus("連接失敗 — 演示模式");
        initDemoMode();
      }
    };

    initSocket();
    return () => {
      clearInterval(timerRef.current);
      if (socket) socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, roomId, buyIn]);

  // ── Demo mode ───────────────────────────────────────────────────────────────
  function initDemoMode() {
    const userId = resolveUserId(user);
    heroIdRef.current = userId;
    setHeroId(userId);
    setConnected(true);
    setStatus("演示模式");
    setTotalTime(30);
    setTimeLeft(30);
    // Start demo timer
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
    setGameState({
      roomId,
      phase: "PREFLOP",
      pot: 15,
      community: [],
      currentBet: 10,
      minRaise: 10,
      bigBlind: 10,
      dealerIndex: 0,
      // currentPlayerIndex = 0 means players[0] = hero is acting
      currentPlayerIndex: 0,
      players: [
        { id: userId,  name: user?.first_name || "你",  chips: buyIn - 10, bet: 10, folded: false, allIn: false, isActive: true, seatIndex: 0, isBot: false, cards: ["Ah", "Kd"], lastAction: null },
        { id: "bot-1", name: "機器鯊", chips: 290, bet: 5,  folded: false, allIn: false, isActive: true, seatIndex: 1, isBot: true, cards: ["??","??"], lastAction: null },
        { id: "bot-2", name: "AI Pro", chips: 480, bet: 0,  folded: false, allIn: false, isActive: true, seatIndex: 2, isBot: true, cards: ["??","??"], lastAction: null },
        { id: "bot-3", name: "算牌王", chips: 350, bet: 0,  folded: true,  allIn: false, isActive: true, seatIndex: 3, isBot: true, cards: ["??","??"], lastAction: "FOLD" },
        null,
        null,
      ],
    });
  }

  // ── Handle player action ────────────────────────────────────────────────────
  function handleAction(action, amount) {
    console.log("[Poker] handleAction", { action, amount, heroId: heroIdRef.current, hasSocket: !!socketRef.current });

    if (socketRef.current) {
      // Server reads userId from socket.data (set during JOIN_ROOM), not from payload.
      // Only emit "ACTION" — that is the only event the backend listens to.
      socketRef.current.emit("ACTION", { roomId, action, amount });
    } else {
      // No socket at all — demo / offline fallback
      clearInterval(timerRef.current);
      setGameState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          phase: "WAITING",
          pot: 0,
          community: [],
          players: prev.players.map(p => p ? { ...p, bet: 0, lastAction: null } : p),
        };
      });
    }
  }

  const hero = gameState?.players?.find(p => p && String(p.id) === String(heroId));
  const isShowdown = gameState?.phase === "SHOWDOWN" || gameState?.phase === "SETTLE";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    // Full-page column layout: top bar → table → action panel → (bottom nav below)
    <div style={{
      minHeight: "100vh",
      background: "#000",
      color: "#fff",
      userSelect: "none",
      display: "flex",
      flexDirection: "column",
      // Offset for the global fixed bottom nav (70px) + safe area
      paddingBottom: "calc(70px + env(safe-area-inset-bottom, 0px))",
    }}>

      {/* ── Fixed top bar ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px",
        background: "rgba(0,0,0,0.9)",
        borderBottom: "1px solid rgba(255,215,0,0.1)",
        position: "sticky", top: 0, zIndex: 200,
        flexShrink: 0,
      }}>
        <button
          onClick={() => { socketRef.current?.emit("LEAVE_ROOM", { roomId }); router.push("/game/poker"); }}
          style={{ background: "none", border: "none", color: "#FFD700", fontSize: "18px", cursor: "pointer", padding: "4px 8px" }}
        >←</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 900, fontSize: "14px", color: "#FFD700" }}>♠ 德州撲克</div>
          <div style={{ fontSize: "10px", color: connected ? "#00BFFF" : "#FF6B6B" }}>
            {connected ? "● " : "○ "}{status}
          </div>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px" }}>
          <div style={{ fontSize: "10px", color: "#666" }}>籌碼 / 錢包</div>
          <div style={{ fontSize: "13px", fontWeight: 800, color: "#FFD700" }}>
            {hero ? `${safeFixed(hero.chips, 0)} U` : "—"}
            {walletBalance != null && (
              <span style={{ fontSize: "10px", color: "#888", marginLeft: "4px" }}>/ {safeFixed(walletBalance, 0)} U</span>
            )}
          </div>
          {/* Rebuy button — only show when seated and not in action */}
          {hero && !isShowdown && (
            <button
              onClick={() => setShowRebuy(prev => !prev)}
              style={{ fontSize: "10px", background: "rgba(255,215,0,0.1)", border: "1px solid rgba(255,215,0,0.3)", borderRadius: "8px", padding: "2px 8px", color: "#FFD700", cursor: "pointer", fontWeight: 700 }}
            >
              + 加購
            </button>
          )}
        </div>
      </div>

      {/* ── Rebuy panel ── */}
      {showRebuy && hero && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
          zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center",
        }} onClick={() => setShowRebuy(false)}>
          <div style={{
            background: "#0d0d0d", border: "1px solid rgba(255,215,0,0.3)",
            borderRadius: "20px", padding: "24px", width: "300px", maxWidth: "90vw",
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontWeight: 900, fontSize: "16px", color: "#FFD700", marginBottom: "16px", textAlign: "center" }}>加購籌碼</div>
            {walletBalance != null && (
              <div style={{ fontSize: "12px", color: "#888", textAlign: "center", marginBottom: "12px" }}>錢包餘額：{safeFixed(walletBalance, 2)} U</div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[50, 100, 200, 300].map(amt => (
                <button key={amt} onClick={() => {
                  socketRef.current?.emit("REBUY", { roomId, amount: amt });
                }} style={{
                  background: "rgba(255,215,0,0.08)", border: "1px solid rgba(255,215,0,0.25)",
                  borderRadius: "12px", padding: "12px", color: "#FFD700",
                  fontWeight: 800, fontSize: "14px", cursor: "pointer",
                }}>
                  + {amt} U
                </button>
              ))}
            </div>
            <button onClick={() => setShowRebuy(false)} style={{
              marginTop: "16px", width: "100%", background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px",
              padding: "10px", color: "#888", cursor: "pointer", fontSize: "13px",
            }}>取消</button>
          </div>
        </div>
      )}

      {/* ── Rebuy message toast ── */}
      {rebuyMsg && (
        <div style={{
          position: "fixed", top: "80px", left: "50%", transform: "translateX(-50%)",
          background: rebuyMsg.type === "success" ? "rgba(0,200,100,0.9)" : "rgba(255,80,80,0.9)",
          color: "#fff", fontWeight: 700, fontSize: "13px",
          padding: "10px 20px", borderRadius: "12px", zIndex: 600,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
        }}>
          {rebuyMsg.text}
        </div>
      )}

      {/* ── Scrollable game area ── */}
      <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>

        {/* Oval table */}
        <div style={{
          position: "relative",
          width: "100%",
          maxWidth: "480px",
          margin: "0 auto",
          height: "320px",
        }}>
          {/* Table felt */}
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80%", height: "55%",
            background: "radial-gradient(ellipse at center, #1a4a2e 0%, #0d3320 60%, #0a2a1a 100%)",
            borderRadius: "50%",
            border: "3px solid rgba(255,215,0,0.25)",
            boxShadow: "0 0 40px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.4), 0 0 20px rgba(255,215,0,0.05)",
          }}>
            <div style={{ position: "absolute", inset: "8px", borderRadius: "50%", border: "1px solid rgba(255,215,0,0.1)" }} />
            <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
              <div style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", marginBottom: "2px" }}>底池</div>
              <div className="pot-display" style={{ fontSize: "18px", fontWeight: 900, color: "#FFD700" }}>
                {safeFixed(gameState?.pot, 2)} U
              </div>
              <div style={{ fontSize: "10px", color: "#00BFFF", marginTop: "4px", background: "rgba(0,191,255,0.1)", border: "1px solid rgba(0,191,255,0.2)", borderRadius: "6px", padding: "1px 8px", display: "inline-block" }}>
                {gameState?.phase === "PREFLOP" ? "翻牌前" : gameState?.phase === "FLOP" ? "翻牌" : gameState?.phase === "TURN" ? "轉牌" : gameState?.phase === "RIVER" ? "河牌" : gameState?.phase === "SHOWDOWN" ? "攤牌" : gameState?.phase === "SETTLE" ? "結算" : "等待"}
              </div>
            </div>
          </div>

          {/* Community cards */}
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -20%)", display: "flex", gap: "5px", zIndex: 10 }}>
            {Array.from({ length: 5 }).map((_, i) => {
              const card = gameState?.community?.[i];
              return (
                <div key={i}>
                  {card ? (
                    <PokerCard card={card} index={i} delay={i * 120} size="community" showdown={isShowdown} />
                  ) : (
                    <div style={{ width: 46, height: 65, borderRadius: "7px", border: "1px dashed rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Player seats */}
          {SEAT_POSITIONS.map((pos, seatIdx) => {
            const player    = gameState?.players?.[seatIdx] || null;
            const isDealer  = gameState?.dealerIndex === seatIdx;
            const isHero    = player ? String(player.id) === String(heroId) : false;
            // isCurrentTurn per-seat: use same multi-convention logic
            const isCurrentTurn = player ? calcIsMyTurn(gameState, player.id) : false;
            return (
              <div key={seatIdx} style={{ position: "absolute", ...pos, zIndex: 20 }}>
                <PlayerSeat
                  player={player}
                  isHero={isHero}
                  isDealer={isDealer}
                  isCurrentTurn={isCurrentTurn}
                  phase={gameState?.phase}
                  showdown={isShowdown}
                />
              </div>
            );
          })}
        </div>

        {/* Action log */}
        <div style={{ maxWidth: "480px", margin: "0 auto", padding: "4px 16px", minHeight: "40px" }}>
          {actionLog.slice(0, 3).map((item, i) => (
            <div key={item.id} style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", padding: "2px 0", opacity: 1 - i * 0.25 }}>
              {item.text}
            </div>
          ))}
        </div>

        {/* ── INLINE Action Panel — directly below table, above bottom nav ── */}
        <ActionPanel
          state={gameState}
          heroId={heroId}
          onAction={handleAction}
          timeLeft={timeLeft}
          totalTime={totalTime}
        />

      </div>{/* end scrollable area */}

      {/* Showdown overlay */}
      {showShowdown && isShowdown && gameState?.showdown && (
        <ShowdownOverlay
          showdown={gameState.showdown}
          winners={gameState.winners}
          community={gameState.community || []}
          onClose={() => setShowShowdown(false)}
        />
      )}

      {/* Waiting overlay */}
      {(!gameState || gameState.phase === "WAITING") && !showShowdown && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          zIndex: 300,
        }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>🃏</div>
          <div style={{ fontWeight: 800, fontSize: "18px", color: "#FFD700", marginBottom: "8px" }}>等待玩家加入</div>
          <div style={{ fontSize: "13px", color: "#999" }}>系統正在為您配桌...</div>
          <div style={{ marginTop: "16px", display: "flex", gap: "6px" }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#FFD700", animation: `neonPulse 1.2s ease-in-out ${i * 0.4}s infinite` }} />
            ))}
          </div>
          <button
            onClick={() => { socketRef.current?.emit("LEAVE_ROOM", { roomId }); router.push("/game/poker"); }}
            style={{ marginTop: "24px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "12px", padding: "12px 32px", color: "#fff", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
          >
            ← 返回大廳
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Default export: Suspense + Error Boundary ────────────────────────────────
export default function PokerTablePage() {
  return (
    <PokerTableErrorBoundary>
      <Suspense fallback={
        <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "#FFD700", fontSize: "18px" }}>
          載入中...
        </div>
      }>
        <PokerTableContent />
      </Suspense>
    </PokerTableErrorBoundary>
  );
}
