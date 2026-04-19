# 56 Card Game — Server

Node.js/TypeScript game server for the 56 card game (South Asian trick-taking game). Uses Socket.io for real-time multiplayer and a pure-function engine layer for all game logic.

## Stack

- **Runtime**: Node.js with TypeScript (`tsx` for development)
- **Transport**: Socket.io
- **Logging**: Pino with pino-pretty (structured, child loggers per room/socket)
- **Testing**: Vitest with V8 coverage
- **Validation**: Zod on all socket payloads

## Game Rules Summary

| Players | Decks | Cards dealt | Tricks | Bid range |
|---------|-------|-------------|--------|-----------|
| 4       | 1     | 6 each      | 6      | 14 – 28   |
| 6       | 2     | 8 each      | 8      | 28 – 56   |
| 8       | 2     | 6 each      | 6      | 28 – 56   |

- Teams of 2 (4p) or 3 (6/8p): Team A vs Team B
- Bidding is anticlockwise; winner names trump and leads the first trick
- Rank order: J (highest) > 9 > A > 10 > K > Q (lowest)
- Point values: J = 3 pts, 9 = 2 pts, A = 1 pt, 10 = 1 pt, K/Q = 0 pts
- Total points per deck: 28 (4p), 56 (6p/8p)
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

### Test Results (2026-04-18)

```
 Test Files  7 passed (7)
      Tests  130 passed (130)
   Duration  ~724ms
```

| Test file             | Tests | What is covered |
|-----------------------|-------|-----------------|
| BiddingEngine.test.ts | 24    | Bid range (4p/6p), turn order, raise/double/redouble, all-pass completion |
| ScoringEngine.test.ts | 15    | Success/failure, table tiers, doubles, finalTeamPoints snapshot |
| TrickEngine.test.ts   | 11    | Play validation, trump resolution, rank order, point calculation |
| Deck.test.ts          | 11    | 1-deck/2-deck build, unique IDs, point totals, shuffle immutability |
| Dealer.test.ts        | 16    | Hand distribution per player count, firstBidderSeatIndex, nextAnticlockwise |
| AIPlayer.test.ts      | 12    | decideBid range (4p 14–28 / 6p 28–56), trump selection, decidePlay strategy |
| GameEngine.test.ts    | 36    | createGame → startBidding → placeBid → playCard → scoreRoundAndAdvance |
| **Total**             | **130** | |

### Coverage Report (2026-04-18)

```
-------------------|---------|----------|---------|---------|--------------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered lines
-------------------|---------|----------|---------|---------|--------------------------
All files          |   39.66 |    85.76 |   77.27 |   39.66 |
 src/ai            |         |          |         |         |
  AIPersonas.ts    |    0.00 |     0.00 |    0.00 |    0.00 | 1-38 (runtime only)
  AIPlayer.ts      |   97.50 |    85.71 |  100.00 |   97.50 | 91, 105, 114
 src/engine        |  100.00 |    89.94 |  100.00 |  100.00 |
  BiddingEngine.ts |  100.00 |    95.00 |  100.00 |  100.00 | 42, 46
  Dealer.ts        |  100.00 |   100.00 |  100.00 |  100.00 |
  GameEngine.ts    |  100.00 |    87.27 |  100.00 |  100.00 | 69, 78, 95, 104, 113, 116-129
  ScoringEngine.ts |  100.00 |    85.18 |  100.00 |  100.00 | 21-30, 46
  TrickEngine.ts   |  100.00 |    90.69 |  100.00 |  100.00 | 14, 38, 67, 76
 src/models        |  100.00 |   100.00 |  100.00 |  100.00 |
  Card.ts          |  100.00 |   100.00 |  100.00 |  100.00 |
  Deck.ts          |  100.00 |   100.00 |  100.00 |  100.00 |
 src/rooms         |    0.00 |     0.00 |    0.00 |    0.00 | (integration only)
  GameRoom.ts      |    0.00 |     0.00 |    0.00 |    0.00 | 1-510
  RoomManager.ts   |    0.00 |     0.00 |    0.00 |    0.00 | 1-66
 src/sockets       |    0.00 |     0.00 |    0.00 |    0.00 | (integration only)
  gameHandlers.ts  |    0.00 |     0.00 |    0.00 |    0.00 | 1-182
  roomHandlers.ts  |    0.00 |     0.00 |    0.00 |    0.00 | 1-92
  socketServer.ts  |    0.00 |     0.00 |    0.00 |    0.00 | 1-34
  eventNames.ts    |    0.00 |     0.00 |    0.00 |    0.00 | 1-34
 src/utils         |    0.00 |     0.00 |    0.00 |    0.00 |
  logger.ts        |    0.00 |     0.00 |    0.00 |    0.00 | 1-8 (runtime only)
-------------------|---------|----------|---------|---------|--------------------------
```

**Engine + model layer: 100% statement coverage, 87–100% branch coverage.**

The overall 39.66% figure reflects the socket/room layer which requires a live Socket.io
server and cannot be exercised by unit tests. All pure game logic is fully covered.

#### Uncovered branches (engine layer)

| File | Lines | Reason |
|------|-------|--------|
| BiddingEngine.ts | 42, 46 | `BIDDING_COMPLETE` guard and `amount ?? 0` fallback — unreachable via `GameEngine` which validates phase first |
| GameEngine.ts | 69, 78, 95, 104 | `dealer?.id ?? fallback` and `bidder?.seatIndex ?? fallback` — players always present after `createGame` |
| GameEngine.ts | 113, 116–129 | `winner` null-guard inside trick resolution — winner is always found when trick cards equal playerCount |
| ScoringEngine.ts | 21–30, 46 | `bidder?.teamId ?? 'A'` fallback and `roundPoints: 0` reset path in success branch |
| TrickEngine.ts | 14, 38, 67, 76 | Optional-chaining guards on always-present trick/player fields |
| AIPlayer.ts | 91, 105, 114 | `decidePlay` fallback paths when trick has no cards yet (only called mid-trick) |

> Socket/room layer (`src/rooms`, `src/sockets`) requires a live Socket.io server and is excluded from unit coverage.

## Key Design Decisions

### Engine is pure functions
All game logic lives in `src/engine/`. Every function takes state in, returns new state out — no mutation, no I/O. This makes the engine trivially testable and the room layer just a thin coordinator.

### Bid range is player-count-aware
`BiddingEngine` uses `minBid(playerCount)` / `maxBid(playerCount)` helpers so the same code path handles both 4-player (14–28) and 6/8-player (28–56) games. The Zod schema in `gameHandlers.ts` uses `min(14)` to not gate-keep valid 4-player bids.

### Two-deck uniqueness
6/8-player games use two copies of the deck. The second copy gets an `_2` suffix on card IDs (`J_spades_2`) so IDs stay unique without changing the card model.

### finalTeamPoints snapshot
`scoreRound` captures `finalTeamPoints: { A, B }` before `applyRoundResult` resets them. The client reads from `roundSummary.finalTeamPoints` so the round-points display is always correct, even though the server broadcasts zeroed state immediately after.
