# 56 Card Game — Server

Node.js/TypeScript game server for the 56 card game (South Asian trick-taking game). Uses Socket.io for real-time multiplayer and a pure-function engine layer for all game logic.

## Stack

- **Runtime**: Node.js with TypeScript (`tsx` for development)
- **Transport**: Socket.io
- **Logging**: Pino with pino-pretty (structured, child loggers per room/socket)
- **Testing**: Vitest with V8 coverage
- **Validation**: Zod on all socket payloads

## Game Rules Summary

| Players | Decks | Ranks used          | Cards dealt | Tricks | Bid range |
|---------|-------|---------------------|-------------|--------|-----------|
| 4       | 1     | J 9 A 10 K Q        | 6 each      | 6      | 14 – 28   |
| 6       | 2     | J 9 A 10 K Q        | 8 each      | 8      | 28 – 56   |
| 8       | 2     | J 9 A 10 K Q 8 7    | 8 each      | 8      | 28 – 56   |

- Teams of 2 (4p) or 3 (6/8p): Team A vs Team B
- Bidding is anticlockwise; winner names trump and leads the first trick
- Rank order: J (highest) > 9 > A > 10 > K > Q > 8 > 7 (lowest)
- Point values: J = 3 pts, 9 = 2 pts, A = 1 pt, 10 = 1 pt, K/Q/8/7 = 0 pts
- Total points per round: 28 (4p, 1 deck) · 56 (6p/8p, 2 decks)
- 7 and 8 are zero-point cards included only in 8-player games to fill 64 cards (8 ranks × 4 suits × 2 decks)
- Double/Redouble multiplies table stakes by ×2 / ×4
- All-pass: dealer is forced to play at minimum bid with no-trumps
- Tables won/lost per round depend on bid amount (see `ScoringEngine.ts`)

## Project Structure

```
src/
  ai/             AI player logic (decideBid, decidePlay)
  engine/         Pure game logic — no I/O, no side effects
    BiddingEngine.ts    Bid validation, state transitions, resolveWinningBid
    Dealer.ts           Hand dealing, seat index arithmetic
    GameEngine.ts       Top-level orchestrator (createGame → startBidding → placeBid → playCard → scoreRoundAndAdvance)
    ScoringEngine.ts    Round scoring, table calculation, winner detection
    TrickEngine.ts      Card play validation, trick resolution, point counting
  models/         Shared data types (Card, Deck, Player, GameState, …)
  rooms/          GameRoom (stateful room, schedules AI turns)
  sockets/        Socket.io handler registration, Zod schema validation
  utils/          Logger setup
  tests/          Unit test suite (Vitest)
```

## Running

```bash
npm install
npm run dev        # tsx watch mode
npm run build      # tsc compile
npm start          # run compiled output
```

## Testing

```bash
npm test                        # run all tests
npm test -- --reporter=verbose  # verbose per-test output
npm test -- --coverage          # with V8 coverage report
```

### Test Results (2026-04-19)

```
 Test Files  7 passed (7)
      Tests  192 passed (192)
   Duration  ~850ms
```

| Test file             | Tests | What is covered |
|-----------------------|-------|-----------------|
|-----------------------|-------|-----------------|
| BiddingEngine.test.ts | 38    | Bid range (4p/6p/8p), turn order, raise/double/redouble, all-pass completion, 6p/8p completion, bid amount preservation on double/redouble |
| ScoringEngine.test.ts | 32    | Success/failure, table tiers, doubles/redoubles, failure formula, B-bids, table clamping, roundPoints reset, checkWinner edge cases |
| TrickEngine.test.ts   | 11    | Play validation, trump resolution, rank order, point calculation |
| Deck.test.ts          | 17    | 1-deck/2-deck build, 8p 8-rank deck (64 cards), unique IDs, point totals, shuffle |
| Dealer.test.ts        | 16    | Hand distribution per player count, firstBidderSeatIndex, nextAnticlockwise |
| AIPlayer.test.ts      | 12    | decideBid range (4p 14–28 / 6p 28–56), trump selection, decidePlay strategy |
| GameEngine.test.ts    | 66    | createGame (4p/6p/8p), bidding, playing, end game (A/B wins, double/56 wipe-out, phase lock, winner persistence), new game reset, double/redouble validation |
| **Total**             | **192** | |

### Recent Changes (2026-04-19)

**Features**
- Play timer configuration: `playTimerSeconds` added to `CreateRoomSchema` and `RoomSettings` interface with 10-120 second range (30 s default)
- Host migration on disconnection: modified `handleDisconnect()` to immediately transfer host role to next available player; emits `HOST_MIGRATED` event with new host ID and name
- New server event: `HOST_MIGRATED` added to `eventNames.ts` for real-time host role notifications

**Testing**
- Added 6 new tests to `GameEngine.test.ts` for double/redouble validation and bid preservation
- All 192 tests passing with 100% engine layer coverage


## Key Design Decisions

### Engine is pure functions
All game logic lives in `src/engine/`. Every function takes state in, returns new state out — no mutation, no I/O. This makes the engine trivially testable and the room layer just a thin coordinator.

### Bid range is player-count-aware
`BiddingEngine` uses `minBid(playerCount)` / `maxBid(playerCount)` helpers so the same code path handles both 4-player (14–28) and 6/8-player (28–56) games. The Zod schema in `gameHandlers.ts` uses `min(14)` to not gate-keep valid 4-player bids.

### Two-deck uniqueness
6/8-player games use two copies of the deck. The second copy gets an `_2` suffix on card IDs (`J_spades_2`) so IDs stay unique without changing the card model.

### finalTeamPoints snapshot
`scoreRound` captures `finalTeamPoints: { A, B }` before `applyRoundResult` resets them. The client reads from `roundSummary.finalTeamPoints` so the round-points display is always correct, even though the server broadcasts zeroed state immediately after.
