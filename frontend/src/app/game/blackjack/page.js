"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import "./blackjack.css";

const API = process.env.NEXT_PUBLIC_BACKEND_URL || "https://la1-backend-production.up.railway.app";
const BET_OPTIONS = [5, 10, 25, 50, 100];

// ─── Card Component ───
function Card({ card, index, hidden, delay = 0, flipping = false, busted = false }) {
  const [dealt, setDealt] = useState(false);
  const [flipped, setFlipped] = useState(hidden);

  useEffect(() => {
    const t = setTimeout(() => setDealt(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  useEffect(() => {
    if (flipping && !hidden) {
      const t = setTimeout(() => setFlipped(false), 300);
      return () => clearTimeout(t);
    }
    setFlipped(hidden);
  }, [hidden, flipping]);

  const isRed = card && (card.suit === "hearts" || card.suit === "diamonds");
  const suitSymbol = {
    spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣",
    hidden: ""
  }[card?.suit] || "";

  const rankDisplay = card?.rank === "hidden" ? "" : card?.rank;

  return (
    <div
      className="bj-card-wrapper"
      style={{
        transform: dealt ? "translateY(0) scale(1)" : "translateY(-120px) scale(0.5)",
        opacity: dealt ? 1 : 0,
        transition: `all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${delay}ms`,
        zIndex: index,
        marginLeft: index > 0 ? "-30px" : "0",
      }}
    >
      <div
        className={`bj-card ${flipped ? "bj-card-flipped" : ""} ${busted ? "bj-card-busted" : ""}`}
        style={{ perspective: "600px" }}
      >
        <div className="bj-card-inner">
          {/* Front */}
          <div className="bj-card-front">
            <div className={`bj-card-rank ${isRed ? "red" : "black"}`}>
              {rankDisplay}
            </div>
            <div className={`bj-card-suit ${isRed ? "red" : "black"}`}>
              {suitSymbol}
            </div>
            <div className={`bj-card-center-suit ${isRed ? "red" : "black"}`}>
              {suitSymbol}
            </div>
            <div className={`bj-card-rank bj-card-rank-bottom ${isRed ? "red" : "black"}`}>
              {rankDisplay}
            </div>
            <div className={`bj-card-suit bj-card-suit-bottom ${isRed ? "red" : "black"}`}>
              {suitSymbol}
            </div>
          </div>
          {/* Back */}
          <div className="bj-card-back">
            <div className="bj-card-back-pattern" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Gold Coin Particle ───
function GoldCoins({ show }) {
  const [coins, setCoins] = useState([]);

  useEffect(() => {
    if (show) {
      const newCoins = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1000,
        duration: 1500 + Math.random() * 1500,
        size: 12 + Math.random() * 16,
      }));
      setCoins(newCoins);
      const t = setTimeout(() => setCoins([]), 4000);
      return () => clearTimeout(t);
    }
  }, [show]);

  return (
    <div className="bj-coins-container">
      {coins.map(c => (
        <div
          key={c.id}
          className="bj-coin"
          style={{
            left: `${c.left}%`,
            animationDelay: `${c.delay}ms`,
            animationDuration: `${c.duration}ms`,
            width: `${c.size}px`,
            height: `${c.size}px`,
          }}
        >
          💰
        </div>
      ))}
    </div>
  );
}

// ─── Blackjack Celebration ───
function BlackjackCelebration({ show }) {
  if (!show) return null;
  return (
    <div className="bj-celebration">
      <div className="bj-celebration-text">
        <span className="bj-celebration-bj">BLACKJACK!</span>
        <span className="bj-celebration-sub">3:2 PAYOUT</span>
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function BlackjackPage() {
  const router = useRouter();
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState(null);
  const [phase, setPhase] = useState("betting"); // betting, playing, settled
  const [selectedBet, setSelectedBet] = useState(10);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [msg, setMsg] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showCoins, setShowCoins] = useState(false);
  const [showBJCelebration, setShowBJCelebration] = useState(false);
  const [dealerRevealing, setDealerRevealing] = useState(false);
  const [showInsurancePrompt, setShowInsurancePrompt] = useState(false);
  const tableRef = useRef(null);

  // ─── Auth ───
  useEffect(() => {
    const tryLogin = async () => {
      let tk = localStorage.getItem("la1_token");
      if (tk) {
        setToken(tk);
        await fetchUser(tk);
        await checkActiveGame(tk);
        setLoading(false);
        return;
      }
      const tg = typeof window !== "undefined" && window.Telegram?.WebApp;
      if (tg && tg.initData && tg.initData.length > 0) {
        tg.ready();
        tg.expand();
        try {
          const res = await fetch(`${API}/tg-login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData: tg.initData }),
          });
          const data = await res.json();
          if (data.token) {
            localStorage.setItem("la1_token", data.token);
            localStorage.setItem("la1_user", JSON.stringify(data.user));
            setToken(data.token);
            setUser(data.user);
            await checkActiveGame(data.token);
          }
        } catch (e) {}
      }
      setLoading(false);
    };
    tryLogin();
  }, []);

  async function fetchUser(tk) {
    try {
      const res = await fetch(`${API}/me`, { headers: { Authorization: `Bearer ${tk}` } });
      const data = await res.json();
      if (data && !data.error) {
        setUser(data);
        localStorage.setItem("la1_user", JSON.stringify(data));
      }
    } catch (e) {}
  }

  async function checkActiveGame(tk) {
    try {
      const res = await fetch(`${API}/game/blackjack/state`, { headers: { Authorization: `Bearer ${tk}` } });
      const data = await res.json();
      if (data.active && data.state) {
        setGameState(data.state);
        setPhase("playing");
        if (data.state.can_insurance) {
          setShowInsurancePrompt(true);
        }
      }
    } catch (e) {}
  }

  async function fetchHistory(tk) {
    try {
      const res = await fetch(`${API}/game/blackjack/history`, { headers: { Authorization: `Bearer ${tk}` } });
      const data = await res.json();
      if (Array.isArray(data)) setHistory(data);
    } catch (e) {}
  }

  // ─── Game Actions ───
  const startGame = useCallback(async () => {
    if (!token || actionLoading) return;
    setActionLoading(true);
    setMsg("");
    setShowCoins(false);
    setShowBJCelebration(false);
    setDealerRevealing(false);
    setShowInsurancePrompt(false);
    try {
      const res = await fetch(`${API}/game/blackjack/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ bet_amount: selectedBet }),
      });
      const data = await res.json();
      if (data.error) {
        setMsg(data.error);
        if (data.state) {
          setGameState(data.state);
          setPhase("playing");
        }
      } else if (data.ok) {
        setGameState(data.state);
        if (data.state.status === "settled") {
          handleSettled(data.state);
        } else {
          setPhase("playing");
          if (data.state.can_insurance) {
            setTimeout(() => setShowInsurancePrompt(true), 800);
          }
        }
        fetchUser(token);
      }
    } catch (e) {
      setMsg("網路錯誤");
    }
    setActionLoading(false);
  }, [token, selectedBet, actionLoading]);

  const doAction = useCallback(async (action) => {
    if (!token || actionLoading) return;
    setActionLoading(true);
    setMsg("");
    setShowInsurancePrompt(false);
    try {
      const res = await fetch(`${API}/game/blackjack/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.error) {
        setMsg(data.error);
      } else if (data.ok) {
        setGameState(data.state);
        if (data.state.status === "settled") {
          setDealerRevealing(true);
          setTimeout(() => handleSettled(data.state), 600);
        } else {
          if (data.state.can_insurance && !data.state.insurance_bet) {
            setShowInsurancePrompt(true);
          }
        }
        fetchUser(token);
      }
    } catch (e) {
      setMsg("網路錯誤");
    }
    setActionLoading(false);
  }, [token, actionLoading]);

  function handleSettled(state) {
    setPhase("settled");
    setDealerRevealing(true);
    const result = state.result;
    if (result === "blackjack") {
      setShowBJCelebration(true);
      setShowCoins(true);
      setTimeout(() => setShowBJCelebration(false), 3000);
    } else if (result === "win") {
      setShowCoins(true);
    }
    setTimeout(() => setShowCoins(false), 3500);
    fetchHistory(token);
  }

  const newGame = () => {
    setPhase("betting");
    setGameState(null);
    setMsg("");
    setShowCoins(false);
    setShowBJCelebration(false);
    setDealerRevealing(false);
    setShowInsurancePrompt(false);
    fetchUser(token);
  };

  // ─── Render ───
  if (loading) {
    return (
      <div className="bj-page">
        <div className="bj-loading">
          <div className="bj-loading-spinner" />
          <div style={{ marginTop: 12, color: "#FFD700" }}>載入中...</div>
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return (
      <div className="bj-page">
        <div className="bj-login-prompt">
          <div style={{ fontSize: 48, marginBottom: 16 }}>🃏</div>
          <h2 style={{ color: "#FFD700", marginBottom: 8 }}>21 點</h2>
          <p style={{ color: "#888", marginBottom: 20 }}>請先登入以開始遊戲</p>
          <a href="/login" className="bj-btn bj-btn-gold" style={{ textDecoration: "none", display: "inline-block" }}>
            前往登入
          </a>
        </div>
      </div>
    );
  }

  const balance = user?.balance ?? 0;
  const activeHand = gameState?.hands?.[gameState?.active_hand];

  const resultLabel = {
    blackjack: "🎉 BLACKJACK!",
    win: "🏆 你贏了！",
    push: "🤝 平手",
    lose: "💀 莊家贏",
    bust: "💥 爆牌！",
    surrender: "🏳️ 投降",
  };

  const resultColor = {
    blackjack: "#FFD700",
    win: "#00E676",
    push: "#FFD700",
    lose: "#FF5252",
    bust: "#FF5252",
    surrender: "#FF9800",
  };

  return (
    <div className="bj-page">
      <GoldCoins show={showCoins} />
      <BlackjackCelebration show={showBJCelebration} />

      {/* ── Header ── */}
      <header className="bj-header">
        <button onClick={() => router.push("/")} className="bj-back-btn">
          ← 返回
        </button>
        <div className="bj-title">🃏 21 點</div>
        <div className="bj-balance">
          <span className="bj-balance-label">餘額</span>
          <span className="bj-balance-value">$ {balance.toFixed(2)}</span>
        </div>
      </header>

      {/* ── Table ── */}
      <div className="bj-table" ref={tableRef}>
        <div className="bj-table-felt">
          {/* Decorative elements */}
          <div className="bj-table-logo">BLACKJACK PAYS 3 TO 2</div>
          <div className="bj-table-subtitle">DEALER MUST STAND ON 17 AND DRAW TO 16</div>

          {/* Dealer Area */}
          <div className="bj-area bj-dealer-area">
            <div className="bj-area-label">
              莊家
              {gameState && (
                <span className="bj-value-badge">
                  {phase === "settled" || dealerRevealing
                    ? gameState.dealer_value
                    : gameState.dealer_cards?.[0]?.rank !== "hidden"
                      ? `${gameState.dealer_value}`
                      : "?"}
                  {phase === "settled" && gameState.dealer_value > 21 && (
                    <span className="bj-bust-tag">BUST</span>
                  )}
                </span>
              )}
            </div>
            <div className="bj-cards-row">
              {gameState?.dealer_cards?.map((card, i) => (
                <Card
                  key={`d-${i}-${card.rank}-${card.suit}`}
                  card={card}
                  index={i}
                  hidden={card.rank === "hidden"}
                  delay={i * 200}
                  flipping={dealerRevealing && i === 1}
                  busted={phase === "settled" && gameState.dealer_value > 21}
                />
              ))}
            </div>
          </div>

          {/* VS Divider */}
          {gameState && (
            <div className="bj-vs">
              {phase === "settled" ? (
                <div
                  className="bj-result-badge"
                  style={{ background: resultColor[gameState.result] || "#666" }}
                >
                  {resultLabel[gameState.result] || gameState.result}
                  {gameState.total_win > 0 && (
                    <div className="bj-win-amount">+{gameState.total_win.toFixed(2)} USDT</div>
                  )}
                </div>
              ) : (
                <div className="bj-vs-text">VS</div>
              )}
            </div>
          )}

          {/* Player Hands */}
          {gameState?.hands?.map((hand, hi) => (
            <div
              key={hi}
              className={`bj-area bj-player-area ${gameState.active_hand === hi && phase === "playing" ? "bj-active-hand" : ""}`}
            >
              <div className="bj-area-label">
                {gameState.hands.length > 1 ? `手牌 ${hi + 1}` : "玩家"}
                <span className="bj-value-badge">
                  {hand.value}
                  {hand.is_blackjack && <span className="bj-bj-tag">BJ!</span>}
                  {hand.is_busted && <span className="bj-bust-tag">BUST</span>}
                </span>
                {hand.bet && (
                  <span className="bj-bet-tag">下注: {hand.bet} USDT</span>
                )}
              </div>
              <div className="bj-cards-row">
                {hand.cards.map((card, ci) => (
                  <Card
                    key={`p${hi}-${ci}-${card.rank}-${card.suit}`}
                    card={card}
                    index={ci}
                    hidden={false}
                    delay={ci * 200 + 100}
                    busted={hand.is_busted}
                  />
                ))}
              </div>
              {phase === "settled" && hand.result && (
                <div
                  className="bj-hand-result"
                  style={{ color: resultColor[hand.result] || "#fff" }}
                >
                  {hand.result === "blackjack" ? "BLACKJACK!" :
                   hand.result === "win" ? "贏" :
                   hand.result === "push" ? "平手" :
                   hand.result === "lose" ? "輸" :
                   hand.result === "bust" ? "爆牌" :
                   hand.result === "surrender" ? "投降" : hand.result}
                  {hand.win_amount > 0 && ` +${hand.win_amount.toFixed(2)}`}
                </div>
              )}
            </div>
          ))}

          {/* No game state - show empty table */}
          {!gameState && (
            <div className="bj-empty-table">
              <div className="bj-empty-icon">🃏</div>
              <div className="bj-empty-text">選擇下注金額開始遊戲</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Insurance Prompt ── */}
      {showInsurancePrompt && phase === "playing" && (
        <div className="bj-insurance-overlay">
          <div className="bj-insurance-modal">
            <div className="bj-insurance-title">🛡️ 購買保險？</div>
            <div className="bj-insurance-desc">
              莊家明牌為 A，您可以購買保險（{(gameState?.bet_amount / 2).toFixed(0)} USDT）。
              <br />若莊家為 Blackjack，保險賠率 2:1。
            </div>
            <div className="bj-insurance-btns">
              <button
                className="bj-btn bj-btn-gold"
                onClick={() => doAction("insurance")}
                disabled={actionLoading}
              >
                購買保險 ({(gameState?.bet_amount / 2).toFixed(0)} USDT)
              </button>
              <button
                className="bj-btn bj-btn-outline"
                onClick={() => doAction("decline_insurance")}
                disabled={actionLoading}
              >
                不買
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Controls ── */}
      <div className="bj-controls">
        {msg && <div className="bj-msg">{msg}</div>}

        {phase === "betting" && (
          <>
            <div className="bj-bet-section">
              <div className="bj-bet-label">選擇下注金額</div>
              <div className="bj-bet-chips">
                {BET_OPTIONS.map(amt => (
                  <button
                    key={amt}
                    className={`bj-chip ${selectedBet === amt ? "bj-chip-active" : ""} ${balance < amt ? "bj-chip-disabled" : ""}`}
                    onClick={() => balance >= amt && setSelectedBet(amt)}
                    disabled={balance < amt}
                  >
                    <span className="bj-chip-value">{amt}</span>
                    <span className="bj-chip-unit">USDT</span>
                  </button>
                ))}
              </div>
            </div>
            <button
              className="bj-btn bj-btn-deal"
              onClick={startGame}
              disabled={actionLoading || balance < selectedBet}
            >
              {actionLoading ? "發牌中..." : `發牌 (${selectedBet} USDT)`}
            </button>
          </>
        )}

        {phase === "playing" && !showInsurancePrompt && (
          <div className="bj-action-btns">
            {activeHand?.can_hit && (
              <button className="bj-btn bj-btn-action bj-btn-hit" onClick={() => doAction("hit")} disabled={actionLoading}>
                <span className="bj-btn-icon">👆</span> 要牌
              </button>
            )}
            {activeHand?.can_stand && (
              <button className="bj-btn bj-btn-action bj-btn-stand" onClick={() => doAction("stand")} disabled={actionLoading}>
                <span className="bj-btn-icon">✋</span> 停牌
              </button>
            )}
            {activeHand?.can_double && (
              <button className="bj-btn bj-btn-action bj-btn-double" onClick={() => doAction("double")} disabled={actionLoading}>
                <span className="bj-btn-icon">⏫</span> 加倍
              </button>
            )}
            {activeHand?.can_split && (
              <button className="bj-btn bj-btn-action bj-btn-split" onClick={() => doAction("split")} disabled={actionLoading}>
                <span className="bj-btn-icon">✌️</span> 分牌
              </button>
            )}
            {activeHand?.can_surrender && (
              <button className="bj-btn bj-btn-action bj-btn-surrender" onClick={() => doAction("surrender")} disabled={actionLoading}>
                <span className="bj-btn-icon">🏳️</span> 投降
              </button>
            )}
          </div>
        )}

        {phase === "settled" && (
          <div className="bj-settled-controls">
            <button className="bj-btn bj-btn-deal" onClick={newGame}>
              再來一局
            </button>
          </div>
        )}

        {/* History Toggle */}
        <button
          className="bj-history-toggle"
          onClick={() => {
            if (!showHistory) fetchHistory(token);
            setShowHistory(!showHistory);
          }}
        >
          {showHistory ? "隱藏戰績" : "📊 歷史戰績"}
        </button>

        {showHistory && (
          <div className="bj-history">
            <div className="bj-history-title">最近 20 局</div>
            {history.length === 0 ? (
              <div className="bj-history-empty">暫無記錄</div>
            ) : (
              <div className="bj-history-list">
                {history.map((h, i) => (
                  <div key={h.id} className="bj-history-item">
                    <div className="bj-history-left">
                      <span className={`bj-history-result bj-history-${h.result}`}>
                        {h.result === "blackjack" ? "BJ!" :
                         h.result === "win" ? "贏" :
                         h.result === "push" ? "平" :
                         h.result === "lose" ? "輸" :
                         h.result === "bust" ? "爆" :
                         h.result === "surrender" ? "降" : h.result}
                      </span>
                      <span className="bj-history-bet">下注 {h.bet_amount}</span>
                    </div>
                    <div className="bj-history-right">
                      <span className={`bj-history-win ${h.win_amount > h.bet_amount ? "positive" : h.win_amount > 0 ? "neutral" : "negative"}`}>
                        {h.win_amount > 0 ? `+${h.win_amount.toFixed(2)}` : "0.00"}
                      </span>
                      <span className="bj-history-time">
                        {new Date(h.created_at).toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
