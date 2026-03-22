/**
 * WebSocket Entry — Socket.IO event handlers
 *
 * Events (client → server):
 *   JOIN_ROOM   { roomId, userId, userName, buyIn, token }
 *   ACTION      { roomId, action, amount }
 *   LEAVE_ROOM  { roomId }
 *
 * Events (server → client):
 *   MATCH_UPDATE, START_GAME, DEAL
 *   FLOP, TURN_CARD, RIVER
 *   SHOWDOWN, SETTLE, BALANCE_UPDATE
 *   TURN, TURN_WARNING, ACTION, ACTION_ERROR
 *   ROOM_LIST, JOIN_SUCCESS, JOIN_ERROR
 */

const { joinRoom, leaveRoom, getRoomList, sanitizeState, rooms } = require("./room");
const { startTurnTimer, processTurnAction } = require("./turn");

module.exports = (io) => {
  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    // ── Lobby: fetch room list ─────────────────────────────────────────────
    socket.on("GET_ROOMS", async () => {
      try {
        const list = await getRoomList();
        socket.emit("ROOM_LIST", list);
      } catch (err) {
        socket.emit("ERROR", { message: err.message });
      }
    });

    // ── Join a room ────────────────────────────────────────────────────────
    socket.on("JOIN_ROOM", async (data) => {
      try {
        const { roomId, userId, userName, buyIn } = data;
        if (!roomId || !userId || !userName || !buyIn) {
          return socket.emit("JOIN_ERROR", { error: "Missing required fields" });
        }

        const { state, player } = await joinRoom(roomId, userId, userName, buyIn);

        // Track socket ↔ player mapping
        player.socketId = socket.id;
        socket.join(roomId);
        socket.data = { roomId, userId };

        socket.emit("JOIN_SUCCESS", {
          player,
          state: sanitizeState(state, userId),
        });

        // Notify others
        socket.to(roomId).emit("MATCH_UPDATE", sanitizeState(state, null));

        // Try to start if enough players
        const { tryStartRound } = require("./room");
        await tryStartRound(roomId, io);

      } catch (err) {
        socket.emit("JOIN_ERROR", { error: err.message });
      }
    });

    // ── Player action ──────────────────────────────────────────────────────
    socket.on("ACTION", async (data) => {
      try {
        const { roomId, action, amount } = data;
        const userId = socket.data?.userId;
        if (!roomId || !userId || !action) {
          console.log(`[WS] ACTION rejected: missing roomId=${roomId} userId=${userId} action=${action}`);
          return;
        }

        console.log(`[WS] ACTION received: userId=${userId}, action=${action}, amount=${amount}, room=${roomId}`);
        await processTurnAction(io, roomId, String(userId), action, amount || 0);
      } catch (err) {
        socket.emit("ACTION_ERROR", { error: err.message });
      }
    });

    // ── Leave room ─────────────────────────────────────────────────────────
    socket.on("LEAVE_ROOM", async (data) => {
      const { roomId } = data || {};
      const userId = socket.data?.userId;
      if (roomId && userId) {
        await leaveRoom(roomId, userId);
        socket.leave(roomId);
        io.to(roomId).emit("MATCH_UPDATE", sanitizeState(rooms.get(roomId), null));
      }
    });

    // ── Disconnect ─────────────────────────────────────────────────────────
    socket.on("disconnect", async () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
      const { roomId, userId } = socket.data || {};
      if (roomId && userId) {
        await leaveRoom(roomId, userId);
        const state = rooms.get(roomId);
        if (state) io.to(roomId).emit("MATCH_UPDATE", sanitizeState(state, null));
      }
    });
  });
};
