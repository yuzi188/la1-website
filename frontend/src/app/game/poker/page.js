"use client";
import { useState, useEffect, Component } from "react";
import { useRouter } from "next/navigation";
import { useTelegramAuth } from "../../../hooks/useTelegramAuth";

const GAME_SERVER = process.env.NEXT_PUBLIC_POKER_SERVER_URL || "https://la1-backend-production.up.railway.app";

const ROOM_TIER_STYLES = {
  "初級桌": { color: "#00BFFF", glow: "rgba(0,191,255,0.4)", icon: "♠", badge: "BEGINNER" },
  "中級桌": { color: "#FFD700", glow: "rgba(255,215,0,0.4)", icon: "♦", badge: "INTERMEDIATE" },
  "高級桌": { color: "#FF6B6B", glow: "rgba(255,107,107,0.4)", icon: "♥", badge: "VIP" },
};

// ─── Error Boundary ───────────────────────────────────────────────────────────
class PokerErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[PokerLobby] Runtime error:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: "100vh", background: "#000", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🃏</div>
          <div style={{ fontSize: "18px", fontWeight: "800", color: "#FFD700", marginBottom: "8px" }}>遊戲載入失敗</div>
          <div style={{ fontSize: "13px", color: "#999", marginBottom: "24px", maxWidth: "300px" }}>
            {this.state.error?.message || "發生未知錯誤，請重新整理頁面"}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{ background: "linear-gradient(135deg,#FFD700,#FFA500)", border: "none", borderRadius: "12px", padding: "12px 28px", color: "#000", fontWeight: "800", fontSize: "14px", cursor: "pointer" }}
          >
            重新載入
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Safe number helper ───────────────────────────────────────────────────────
function safeFixed(value, digits = 2) {
  const n = parseFloat(value);
  if (isNaN(n)) return "0." + "0".repeat(digits);
  return n.toFixed(digits);
}

// ─── Lobby Inner ─────────────────────────────────────────────────────────────
function PokerLobbyInner() {
  const router = useRouter();
  const { user, loading } = useTelegramAuth();
  const [rooms, setRooms] = useState([]);
  const [fetching, setFetching] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [buyIn, setBuyIn] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  // Fetch room list
  useEffect(() => {
    async function fetchRooms() {
      try {
        const res = await fetch(`${GAME_SERVER}/api/rooms`);
        if (res.ok) {
          const data = await res.json();
          setRooms(Array.isArray(data) ? data : []);
        }
      } catch {
        // Fallback to default rooms if server not available
        setRooms([
          { id: "room-beginner",     name: "初級桌", smallBlind: 1,  bigBlind: 2,  minBuyIn: 100,  maxBuyIn: 300,   maxPlayers: 6, playerCount: 0, phase: "WAITING" },
          { id: "room-intermediate", name: "中級桌", smallBlind: 5,  bigBlind: 10, minBuyIn: 500,  maxBuyIn: 2000,  maxPlayers: 6, playerCount: 0, phase: "WAITING" },
          { id: "room-advanced",     name: "高級桌", smallBlind: 10, bigBlind: 20, minBuyIn: 2000, maxBuyIn: 20000, maxPlayers: 6, playerCount: 0, phase: "WAITING" },
        ]);
      } finally {
        setFetching(false);
      }
    }
    fetchRooms();
    const interval = setInterval(fetchRooms, 10000);
    return () => clearInterval(interval);
  }, []);

  function openBuyInModal(room) {
    setSelectedRoom(room);
    setBuyIn(String(room.minBuyIn));
    setError("");
  }

  function closeBuyInModal() {
    setSelectedRoom(null);
    setBuyIn("");
    setError("");
  }

  async function handleJoin() {
    if (!user) { setError("請先登入"); return; }
    const amount = parseFloat(buyIn);
    if (isNaN(amount) || amount < selectedRoom.minBuyIn || amount > selectedRoom.maxBuyIn) {
      setError(`買入金額需在 ${selectedRoom.minBuyIn}–${selectedRoom.maxBuyIn} U 之間`);
      return;
    }
    setJoining(true);
    router.push(`/game/poker/table?roomId=${selectedRoom.id}&buyIn=${amount}`);
  }

  // Safe balance: handle string, number, null, undefined
  const balance = safeFixed(user?.balance ?? 0, 2);

  return (
    <div style={{ minHeight: "100vh", background: "#000", color: "#fff", padding: "16px", maxWidth: "480px", margin: "0 auto" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
        <button
          onClick={() => router.push("/")}
          style={{ background: "none", border: "none", color: "#FFD700", fontSize: "20px", cursor: "pointer", padding: "4px" }}
        >←</button>
        <div>
          <h1 style={{ fontSize: "20px", fontWeight: "900", background: "linear-gradient(135deg,#FFD700,#FFA500)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", margin: 0 }}>
            ♠ 德州撲克
          </h1>
          <div style={{ fontSize: "11px", color: "#666" }}>Texas Hold&apos;em</div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ fontSize: "11px", color: "#666" }}>餘額</div>
          <div style={{ fontSize: "16px", fontWeight: "800", color: "#FFD700" }}>
            {loading ? "..." : `${balance} U`}
          </div>
        </div>
      </div>

      {/* Quick Match Banner */}
      <div style={{
        background: "linear-gradient(135deg, rgba(255,215,0,0.08), rgba(0,191,255,0.05))",
        border: "1px solid rgba(255,215,0,0.2)",
        borderRadius: "16px",
        padding: "16px",
        marginBottom: "20px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
        <div style={{ fontSize: "36px" }}>🃏</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: "800", fontSize: "15px", color: "#FFD700" }}>快速配桌</div>
          <div style={{ fontSize: "12px", color: "#999", marginTop: "2px" }}>系統自動為您匹配最佳桌位</div>
        </div>
        <button
          onClick={() => rooms.length > 0 && openBuyInModal(rooms[0])}
          style={{
            background: "linear-gradient(135deg, #FFD700, #FFA500)",
            border: "none",
            borderRadius: "12px",
            padding: "10px 18px",
            color: "#000",
            fontWeight: "800",
            fontSize: "13px",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          快速加入
        </button>
      </div>

      {/* Room List */}
      <div style={{ marginBottom: "12px", fontWeight: "800", fontSize: "14px", color: "#FFD700" }}>
        🏠 選擇牌桌
      </div>

      {fetching ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#666" }}>載入中...</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {rooms.map((room) => {
            const style = ROOM_TIER_STYLES[room.name] || ROOM_TIER_STYLES["初級桌"];
            const isFull = (room.playerCount || 0) >= (room.maxPlayers || 6);
            return (
              <div
                key={room.id}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${style.color}33`,
                  borderRadius: "16px",
                  padding: "16px",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* Glow accent */}
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: "2px",
                  background: `linear-gradient(90deg, transparent, ${style.color}, transparent)`,
                }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "22px" }}>{style.icon}</span>
                      <span style={{ fontWeight: "900", fontSize: "17px" }}>{room.name}</span>
                      <span style={{
                        fontSize: "9px", padding: "2px 7px",
                        background: `${style.color}22`,
                        border: `1px solid ${style.color}55`,
                        borderRadius: "8px",
                        color: style.color,
                        fontWeight: "700",
                      }}>{style.badge}</span>
                    </div>

                    {/* Blind info */}
                    <div style={{ display: "flex", gap: "16px", marginBottom: "8px" }}>
                      <div>
                        <div style={{ fontSize: "10px", color: "#666" }}>盲注</div>
                        <div style={{ fontSize: "14px", fontWeight: "800", color: style.color }}>
                          {room.smallBlind}/{room.bigBlind} U
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: "10px", color: "#666" }}>買入</div>
                        <div style={{ fontSize: "13px", fontWeight: "700", color: "#fff" }}>
                          {room.minBuyIn}–{room.maxBuyIn} U
                        </div>
                      </div>
                    </div>

                    {/* Player count */}
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ display: "flex", gap: "3px" }}>
                        {Array.from({ length: room.maxPlayers || 6 }).map((_, i) => (
                          <div key={i} style={{
                            width: "8px", height: "8px", borderRadius: "50%",
                            background: i < (room.playerCount || 0) ? style.color : "rgba(255,255,255,0.1)",
                            boxShadow: i < (room.playerCount || 0) ? `0 0 4px ${style.glow}` : "none",
                          }} />
                        ))}
                      </div>
                      <span style={{ fontSize: "11px", color: "#999" }}>
                        {room.playerCount || 0}/{room.maxPlayers || 6} 人
                      </span>
                      {room.phase && room.phase !== "WAITING" && (
                        <span style={{ fontSize: "10px", color: "#FFA500", marginLeft: "4px" }}>● 進行中</span>
                      )}
                    </div>
                  </div>

                  {/* Join button */}
                  <button
                    onClick={() => !isFull && openBuyInModal(room)}
                    disabled={isFull}
                    style={{
                      background: isFull
                        ? "rgba(255,255,255,0.05)"
                        : `linear-gradient(135deg, ${style.color}, ${style.color}cc)`,
                      border: "none",
                      borderRadius: "12px",
                      padding: "12px 20px",
                      color: isFull ? "#666" : "#000",
                      fontWeight: "800",
                      fontSize: "13px",
                      cursor: isFull ? "not-allowed" : "pointer",
                      minWidth: "72px",
                      alignSelf: "center",
                    }}
                  >
                    {isFull ? "已滿" : "進入"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rules */}
      <div style={{
        marginTop: "24px",
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "12px",
        padding: "14px",
      }}>
        <div style={{ fontWeight: "800", fontSize: "13px", color: "#FFD700", marginBottom: "8px" }}>📜 遊戲規則</div>
        {[
          "標準德州撲克規則，最多 6 人同桌",
          "抽水 5%，封頂 10U（高級桌 4%，封頂 20U）",
          "每回合操作時間 30 秒，逾時自動棄牌",
          "AI Bot 自動補位，保持遊戲流暢",
        ].map((rule, i) => (
          <div key={i} style={{ fontSize: "12px", color: "#999", marginBottom: "4px", paddingLeft: "8px" }}>
            · {rule}
          </div>
        ))}
      </div>

      {/* Buy-in Modal */}
      {selectedRoom && (
        <>
          <div
            onClick={closeBuyInModal}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9998 }}
          />
          <div style={{
            position: "fixed",
            bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: "480px",
            background: "#0a0a0a",
            border: "1px solid rgba(255,215,0,0.2)",
            borderRadius: "24px 24px 0 0",
            padding: "24px 20px 40px",
            zIndex: 9999,
          }}>
            <div style={{ width: "40px", height: "4px", background: "rgba(255,255,255,0.2)", borderRadius: "2px", margin: "0 auto 20px" }} />

            <div style={{ fontWeight: "900", fontSize: "18px", marginBottom: "4px" }}>
              加入 {selectedRoom.name}
            </div>
            <div style={{ fontSize: "12px", color: "#666", marginBottom: "20px" }}>
              盲注 {selectedRoom.smallBlind}/{selectedRoom.bigBlind} U · 買入 {selectedRoom.minBuyIn}–{selectedRoom.maxBuyIn} U
            </div>

            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "13px", color: "#999", marginBottom: "8px" }}>買入金額 (U)</div>
              <input
                type="number"
                value={buyIn}
                onChange={e => setBuyIn(e.target.value)}
                min={selectedRoom.minBuyIn}
                max={selectedRoom.maxBuyIn}
                style={{
                  width: "100%",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,215,0,0.3)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  color: "#fff",
                  fontSize: "18px",
                  fontWeight: "800",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Quick amounts */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
              {[selectedRoom.minBuyIn, selectedRoom.minBuyIn * 2, selectedRoom.maxBuyIn].map(amt => (
                <button
                  key={amt}
                  onClick={() => setBuyIn(String(amt))}
                  style={{
                    flex: 1,
                    background: parseFloat(buyIn) === amt ? "rgba(255,215,0,0.15)" : "rgba(255,255,255,0.04)",
                    border: `1px solid ${parseFloat(buyIn) === amt ? "rgba(255,215,0,0.4)" : "rgba(255,255,255,0.08)"}`,
                    borderRadius: "10px",
                    padding: "10px 4px",
                    color: parseFloat(buyIn) === amt ? "#FFD700" : "#999",
                    fontSize: "13px",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  {amt} U
                </button>
              ))}
            </div>

            {error && (
              <div style={{ color: "#FF6B6B", fontSize: "12px", marginBottom: "12px", textAlign: "center" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleJoin}
              disabled={joining}
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #FFD700, #FFA500)",
                border: "none",
                borderRadius: "14px",
                padding: "16px",
                color: "#000",
                fontWeight: "900",
                fontSize: "16px",
                cursor: joining ? "not-allowed" : "pointer",
                opacity: joining ? 0.7 : 1,
              }}
            >
              {joining ? "進入中..." : "確認入座 →"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Default export wrapped in error boundary ─────────────────────────────────
export default function PokerLobbyPage() {
  return (
    <PokerErrorBoundary>
      <PokerLobbyInner />
    </PokerErrorBoundary>
  );
}
