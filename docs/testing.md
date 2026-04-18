# Testing

## Overview

Tests currently exist for the **server engine only**. The React Native app has no test suite yet. All server tests use [Vitest](https://vitest.dev/).

```
forty-two tests · 4 suites · 100% pass rate
```

---

## Running Tests

```bash
cd fifty-six-server

# Single run
npm test

# Watch mode
npm run test:watch

# With coverage report
npm run test:coverage
```

Add the coverage script to `fifty-six-server/package.json` if not present:

```json
"test:coverage": "vitest run --coverage"
```

---

## Coverage (as of initial MVP commit)

```
-------------------|---------|----------|---------|---------|
File               | % Stmts | % Branch | % Funcs | % Lines |
-------------------|---------|----------|---------|---------|
All files          |   21.01 |    77.19 |   57.57 |   21.01 |
 src/engine        |   56.23 |    84.04 |   83.33 |   56.23 |
  BiddingEngine.ts |  100.00 |   90.00  |  100.00 |  100.00 |
  Dealer.ts        |   50.00 |  100.00  |   33.33 |   50.00 |
  GameEngine.ts    |    0.00 |    0.00  |    0.00 |    0.00 |
  ScoringEngine.ts |  100.00 |   79.16  |  100.00 |  100.00 |
  TrickEngine.ts   |   96.20 |   84.21  |  100.00 |   96.20 |
 src/models        |  100.00 |  100.00  |  100.00 |  100.00 |
  Card.ts          |  100.00 |  100.00  |  100.00 |  100.00 |
  Deck.ts          |  100.00 |  100.00  |  100.00 |  100.00 |
 src/ai            |    0.00 |    0.00  |    0.00 |    0.00 |
 src/rooms         |    0.00 |    0.00  |    0.00 |    0.00 |
 src/sockets       |    0.00 |    0.00  |    0.00 |    0.00 |
-------------------|---------|----------|---------|---------|
```

The headline 21% is misleading — the zero-coverage files are infrastructure layers (sockets, rooms, server entry) that require integration harnesses. The **pure game engine**, which contains all the critical logic, sits at **~84% branch coverage**.

---

## Test Suites

### `Deck.test.ts` — 8 tests · 100% coverage

Tests the card deck builder and shuffle utility.

| Test | Verifies |
|---|---|
| builds 24 cards for 4-player game | 4-player deck = 9,10,J,Q,K,A × 4 suits |
| builds 24 cards for 6-player game | Same 24-card set |
| builds 32 cards for 8-player game | Adds 7 and 8 ranks |
| 4-player deck contains no 7s or 8s | Low cards excluded for 4/6-player |
| 8-player deck contains 7s and 8s | Low cards included for 8-player |
| assigns correct point values | J=3, 9=2, A=1, 10=1, others=0 |
| returns same number of cards | Shuffle is non-destructive in length |
| does not modify the original deck | Shuffle returns a new array |

---

### `BiddingEngine.test.ts` — 11 tests · 100% stmt, 90% branch

Tests bid validation, application, turn advancement, and completion logic.

| Test | Verifies |
|---|---|
| rejects bid when not your turn | Turn enforcement |
| accepts minimum bid of 28 | Lower bound |
| rejects bid below current high bid | Must outbid or pass |
| rejects bid below minimum 28 | Floor enforcement |
| rejects bid above maximum 56 | Ceiling enforcement |
| rejects double when no current bid | Double pre-condition |
| rejects redouble when not doubled | Redouble pre-condition |
| completes bidding after 3 consecutive passes following a bid | N−1 passes needed after a bid |
| advances bidder anticlockwise | Seat order |
| returns current high bid when present | State query |
| returns forced minimum bid when all passed | All-pass fallback = 28 no-trumps for dealer |

**Uncovered branches:** the three lines handling the `conventionId` default path (line 41, 45, 53).

---

### `TrickEngine.test.ts` — 11 tests · 96% stmt, 84% branch

Tests card play validation, trick resolution, legal card filtering, and the lowest-card helper.

| Test | Verifies |
|---|---|
| rejects play when not your turn | Turn enforcement |
| rejects card not in hand | Hand membership check |
| rejects off-suit when player can follow | Suit-following rule |
| allows any card when void in led suit | Freedom when void |
| trump beats led suit | Trump wins over led suit regardless of rank |
| highest card of led suit wins when no trump played | Standard trick resolution |
| Jack beats 9 beats Ace | Rank order: J(7) > 9(6) > A(5) |
| calculates trick points correctly | Point sum per trick |
| returns only led-suit cards when player has them | `getLegalCards` — has suit |
| returns all cards when void in led suit | `getLegalCards` — void |
| returns lowest point value card | `lowestLegalCard` helper |

**Uncovered:** lines 59–61 — the branch where a player leads with a trump card into an already-won trick (multi-trump scenario).

---

### `ScoringEngine.test.ts` — 12 tests · 100% stmt, 79% branch

Tests round outcome calculation, tables delta, win condition detection, and zero-floor protection.

| Test | Verifies |
|---|---|
| marks as success when bid team meets their bid | Bid success condition |
| marks as failure when bid team falls short | Bid failure condition |
| bid 28–39 results in 1 table change | Tables band: low bids |
| bid 40–47 results in 2 tables change | Tables band: mid bids |
| bid 56 results in 4 tables change | Maximum bid reward |
| doubled bid doubles the payout | Double multiplier |
| returns B when A has zero tables | Win condition A→0 |
| returns A when B has zero tables | Win condition B→0 |
| returns null when both teams have tables | Game ongoing |
| opponent loses tables on bid success | Correct team debited |
| bid team loses tables on failure | Failure penalty |
| tables do not go below zero | Zero floor |

**Uncovered branches:** bid bands 48–55 (3-table range) not explicitly tested; redoubled scoring path not tested.

---

## Coverage Gaps

### `GameEngine.ts` — 0% (priority: high)

The integration layer that chains Dealer → BiddingEngine → TrickEngine → ScoringEngine into a full round. Needs tests for:

- Full round lifecycle: `createGame` → `startBidding` → `placeBid` (× N) → `playCard` (× tricks) → `scoreRoundAndAdvance`
- Phase transition guards (e.g. playing a card in bidding phase)
- Multi-round game progressing to completion
- All-pass bidding scenario wired through `GameEngine`

### `AIPlayer.ts` — 0% (priority: medium)

- `decideBid`: verify hand-strength scoring assigns sensible bid amounts and suit selection
- `decidePlay`: verify partner-winning detection, lowest-winning-card heuristic, trump conservation

### `GameRoom.ts` / `RoomManager.ts` — 0% (priority: medium)

Integration tests requiring a mocked Socket.io `Server`. Recommended approach: extract pure room logic into a separate class and test it independently of Socket.io (similar to how `LocalGameRoom` works in the app's offline module).

### React Native App — no test framework (priority: medium)

No Jest or React Native Testing Library setup yet. Recommended additions:

```bash
cd fifty-six-app
npx expo install jest-expo @testing-library/react-native @testing-library/jest-native
```

Priority test targets:
- **Store slices** (`gameSlice`, `lobbySlice`, `uiSlice`) — pure Zustand state reducers, easy to unit test
- **`useSocket` hook** — verify correct event subscriptions and store updates
- **`OfflineTransport`** / **`LocalGameRoom`** — end-to-end offline game flow (the engine is already tested server-side, but the wiring deserves a smoke test)
- **`CardView`, `Button`** — snapshot + interaction tests

---

## Adding New Tests

Place server tests in `fifty-six-server/src/tests/`. The naming convention is `<ModuleName>.test.ts`.

Vitest config inherits from `tsconfig.json` — no separate config file needed for basic cases. For coverage configuration, add to `package.json`:

```json
"vitest": {
  "coverage": {
    "provider": "v8",
    "include": ["src/engine/**", "src/models/**", "src/ai/**"],
    "exclude": ["src/index.ts", "src/sockets/**"]
  }
}
```

This scopes coverage to the pure logic layers and avoids inflating zero-coverage numbers from infrastructure files.
