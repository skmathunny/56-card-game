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
   Duration  ~700ms
```

| Test file              | Tests | Covers |
|------------------------|-------|--------|
| BiddingEngine.test.ts  | 24    | BiddingEngine |
| Deck.test.ts           | 11    | Deck model |
| TrickEngine.test.ts    | 11    | TrickEngine |
| ScoringEngine.test.ts  | 15    | ScoringEngine |
| Dealer.test.ts         | 16    | Dealer |
| AIPlayer.test.ts       | 12    | AIPlayer (decideBid, decidePlay) |
| GameEngine.test.ts     | 36    | GameEngine (full lifecycle) |
| **Total**              | **130** | |

### Coverage (engine + model layer)

```
File               | % Stmts | % Branch | % Funcs | % Lines
-------------------|---------|----------|---------|---------
src/engine         |   100   |   89.94  |   100   |   100
  BiddingEngine.ts |   100   |   95.00  |   100   |   100
  Dealer.ts        |   100   |  100.00  |   100   |   100
  GameEngine.ts    |   100   |   87.27  |   100   |   100
  ScoringEngine.ts |   100   |   85.18  |   100   |   100
  TrickEngine.ts   |   100   |   90.69  |   100   |   100
src/models         |   100   |  100.00  |   100   |   100
  Card.ts          |   100   |  100.00  |   100   |   100
  Deck.ts          |   100   |  100.00  |   100   |   100
src/ai/AIPlayer.ts |  97.50  |   85.71  |   100   |  97.50
```

> Socket/room layer (`src/rooms`, `src/sockets`) is integration-only and excluded from unit coverage — it requires a live Socket.io server.

## Key Design Decisions

### Engine is pure functions
All game logic lives in `src/engine/`. Every function takes state in, returns new state out — no mutation, no I/O. This makes the engine trivially testable and the room layer just a thin coordinator.

### Bid range is player-count-aware
`BiddingEngine` uses `minBid(playerCount)` / `maxBid(playerCount)` helpers so the same code path handles both 4-player (14–28) and 6/8-player (28–56) games. The Zod schema in `gameHandlers.ts` uses `min(14)` to not gate-keep valid 4-player bids.

### Two-deck uniqueness
6/8-player games use two copies of the deck. The second copy gets an `_2` suffix on card IDs (`J_spades_2`) so IDs stay unique without changing the card model.

### finalTeamPoints snapshot
`scoreRound` captures `finalTeamPoints: { A, B }` before `applyRoundResult` resets them. The client reads from `roundSummary.finalTeamPoints` so the round-points display is always correct, even though the server broadcasts zeroed state immediately after.
