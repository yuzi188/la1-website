# LA1 Poker Game Server

Texas Hold'em game server for the LA1 entertainment platform.

## Architecture

```
game-server/
├── config/
│   └── gameConfig.js       # Default values (env-driven, never hard-coded)
├── core/
│   ├── engine.js           # Hand evaluation (straight/flush/etc.)
│   ├── state.js            # Game state machine & deck
│   ├── dealer.js           # Round flow: deal → flop → turn → river → showdown
│   ├── actions.js          # Betting logic (fold/call/raise/all-in)
│   ├── sidepot.js          # Side-pot calculation & distribution
│   ├── rake.js             # Rake system (DB-configurable %)
│   └── matchmaking.js      # Bot fill strategy (DB-configurable)
├── socket/
│   ├── index.js            # Socket.IO event handlers
│   ├── room.js             # Room lifecycle management
│   └── turn.js             # Turn timer & auto-fold
├── bot/
│   ├── brain.js            # Bot decision model
│   └── memory.js           # Opponent tendency tracking
├── wallet/
│   ├── adapter.js          # LA1 wallet API bridge
│   └── security.js         # HMAC signature
├── db/
│   ├── schema.sql          # PostgreSQL schema (run once)
│   └── index.js            # DB connection + config loaders
├── cache/
│   └── redis.js            # Redis state cache (in-memory fallback)
└── server.js               # Express + Socket.IO entry point
```

## Dynamic Configuration

**All operational parameters are stored in the database — no redeployment needed.**

### Room configs (`room_configs` table)
| Column | Description |
|--------|-------------|
| `small_blind` / `big_blind` | Blind amounts |
| `min_buyin` / `max_buyin` | Buy-in range |
| `rake_percent` / `rake_cap` | Per-room rake override |
| `enable_bot` / `bot_fill_target` | Bot strategy per room |

### System configs (`system_configs` table)
| Key | Default | Description |
|-----|---------|-------------|
| `rake_percent` | `0.05` | Global rake % |
| `rake_cap` | `10` | Global rake cap (U) |
| `bot_enabled` | `true` | Global bot toggle |
| `bot_think_min_ms` | `800` | Bot min think time |
| `bot_think_max_ms` | `3000` | Bot max think time |
| `turn_timeout_seconds` | `30` | Action timeout |
| `mm_min_players` | `2` | Min players to start |
| `mm_wait_seconds` | `15` | Wait time for 2nd human |

To update live: `UPDATE system_configs SET value='0.03' WHERE key='rake_percent';`  
Then call `POST /api/system-configs/refresh` to clear the 60-second cache.

## Bot Fill Strategy

| Human players | Bots added | Notes |
|---------------|-----------|-------|
| < 2 | 0 | Round not started |
| 2 | fill to `bot_fill_target` (default 4) | |
| 3 | fill to `bot_fill_target` | |
| 4+ | 0 | No bots needed |
| Advanced table | 0 | `enable_bot = false` |

## WebSocket Events

### Client → Server
| Event | Payload |
|-------|---------|
| `GET_ROOMS` | — |
| `JOIN_ROOM` | `{ roomId, userId, userName, buyIn }` |
| `ACTION` | `{ roomId, action, amount }` |
| `LEAVE_ROOM` | `{ roomId }` |

### Server → Client
| Event | Payload |
|-------|---------|
| `ROOM_LIST` | Array of room summaries |
| `JOIN_SUCCESS` | `{ player, state }` |
| `START_GAME` | Full game state |
| `DEAL` | State with private cards |
| `TURN` | `{ playerId, timeoutMs }` |
| `TURN_WARNING` | `{ playerId, remainingMs }` |
| `ACTION` | `{ playerId, action, amount, pot }` |
| `MATCH_UPDATE` | Full game state |
| `FLOP` | `{ cards: [c1,c2,c3] }` |
| `TURN_CARD` | `{ card }` |
| `RIVER` | `{ card }` |
| `SHOWDOWN` | `{ community, showdown, winners }` |
| `SETTLE` | `{ winners, rake }` |
| `BALANCE_UPDATE` | `{ chips }` |

## Setup

```bash
cp .env.example .env
# Edit .env with your DB/Redis/Wallet credentials

npm install
npm run db:migrate   # Run schema.sql
npm start
```
