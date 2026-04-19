# 56 — Fifty-Six Card Game

A real-time multiplayer implementation of the classic South Indian trick-taking card game, built for mobile (iOS & Android) with full offline support.

## Overview

56 is a trick-taking card game for 4, 6, or 8 players in two teams. Players bid on how many points they expect to win, choose a trump suit, then play tricks to meet or beat the bid. Teams win or lose "tables" based on bid success. The game ends when one team runs out of tables.

**Card rank order (highest to lowest):** J → 9 → A → 10 → K → Q

**Point values:** J = 3 pts · 9 = 2 pts · A = 1 pt · 10 = 1 pt · K = 0 · Q = 0

## Repository Structure

```
56-card-game/
├── fifty-six-server/   # Node.js + Socket.io game server
└── fifty-six-app/      # React Native (Expo) mobile app
```

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile app | React Native, Expo (managed workflow) |
| State management | Zustand |
| Navigation | React Navigation (native stack) |
| Game server | Node.js, TypeScript, Express |
| Real-time | Socket.io |
| Validation | Zod |
| Logging | Pino |
| Testing | Vitest (server) |

## Architecture

### GameTransport Abstraction

The app never touches Socket.io directly. All game actions go through a `GameTransport` interface with two implementations:

- **`OnlineTransport`** — delegates to the Socket.io server via ack callbacks
- **`OfflineTransport`** — runs the full game engine in-process via `LocalGameRoom` and a local `EventEmitter`

This means online and offline modes share 100% of the UI code.

### Server Authority

All game logic lives on the server. Clients send *intents* (place bid, play card) and receive full state pushes. Private hands are never broadcast — each socket receives only its own hand alongside the public game state.

### AI Players

Eight named AI personas (Arjun, Priya, Ravi, Meena, …) live entirely on the server. They auto-fill empty seats, follow bidding conventions based on hand strength scoring, and take over from disconnected humans after a 2-minute reconnect window.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Expo CLI: `npm install -g expo-cli`
- (Optional) Expo Go app on your phone for quick device testing

### Server

```bash
cd fifty-six-server
npm install
cp .env.example .env      # set PORT, JWT_SECRET, CLIENT_ORIGIN
npm run dev               # ts-node-dev with hot reload
```

The server starts on `http://localhost:3000` by default.

```bash
npm test                        # run all 130 unit tests
npm test -- --reporter=verbose  # verbose per-test output
npm test -- --coverage          # with V8 coverage report
```

**Test results (2026-04-19): 130 / 130 server · 19 / 19 app — 149 total, 0 failures.**

#### Server (fifty-six-server) — Vitest

| Suite                 | Tests | Covers |
|-----------------------|-------|--------|
| BiddingEngine.test.ts | 24    | Bid range (4p: 14–28, 6p: 28–56), turn order, double/redouble, all-pass |
| ScoringEngine.test.ts | 15    | Success/failure, table changes, doubles, finalTeamPoints snapshot |
| TrickEngine.test.ts   | 11    | Play validation, trump resolution, point calculation |
| Deck.test.ts          | 11    | 1-deck/2-deck, unique IDs, point totals, shuffle immutability |
| Dealer.test.ts        | 16    | Hand distribution, firstBidder, nextAnticlockwise wrapping |
| AIPlayer.test.ts      | 12    | Bid range per playerCount, trump selection, play strategy |
| GameEngine.test.ts    | 36    | Full lifecycle: createGame → bidding → playing → scoring → winner |

#### App (fifty-six-app) — Vitest

```bash
npm test              # run all 19 unit tests
npm run test:coverage # with V8 coverage report
```

| Suite                  | Tests | Covers |
|------------------------|-------|--------|
| deckRegistry.test.ts   | 19    | getDeckTheme fallback, getCardImage _2-suffix stripping, getCardBackImage, DECK_CONFIGS shape |

### Engine Layer Coverage (server)

```
File               | % Stmts | % Branch | % Funcs | % Lines
-------------------|---------|----------|---------|--------
BiddingEngine.ts   |  100.00 |    95.00 |  100.00 | 100.00
Dealer.ts          |  100.00 |   100.00 |  100.00 | 100.00
GameEngine.ts      |  100.00 |    87.27 |  100.00 | 100.00
ScoringEngine.ts   |  100.00 |    85.18 |  100.00 | 100.00
TrickEngine.ts     |  100.00 |    90.69 |  100.00 | 100.00
Card.ts / Deck.ts  |  100.00 |   100.00 |  100.00 | 100.00
AIPlayer.ts        |   97.50 |    85.71 |  100.00 |  97.50
```

### App Deck Registry Coverage

```
File             | % Stmts | % Branch | % Funcs | % Lines
-----------------|---------|----------|---------|--------
deckRegistry.ts  |  100.00 |   100.00 |  100.00 | 100.00
```

> The socket/room layer requires a live Socket.io server; it is excluded from unit coverage. See [fifty-six-server/README.md](fifty-six-server/README.md) for the full coverage table with uncovered line annotations.

### App

```bash
cd fifty-six-app
npm install
```

Create `fifty-six-app/.env`:
```
EXPO_PUBLIC_SERVER_URL=http://localhost:3000
```

```bash
npm start                 # start Expo dev server
# then press 'a' for Android, 'i' for iOS, or scan QR with Expo Go
```

**Offline mode** requires no server — select "Play Offline" on the login screen.

---

## Game Screens

| Screen | Description |
|---|---|
| Splash | Animated logo, auto-routes based on auth token |
| Login | Google / LinkedIn OAuth stubs, guest mode, offline mode |
| Profile Setup | Emoji avatar picker, display name |
| Home | Create Room / Join Room actions |
| Profile | Avatar, name, sign out |
| Create Room | Player count (4/6/8), starting tables, bid timer |
| Join Room | 5-cell room code input with auto-focus |
| Waiting Room | Seat grid by team, AI add/remove, shareable room code |
| Deal & Bid | Animated card deal, scrollable bid history, amount + trump selectors |
| Play | Table layout, fan hand, legal-card highlighting, trick area |
| Round Summary | Result banner, tables change, standings bar, round points |
| End Game | Trophy banner, final standings, game stats, rematch |

### In-Play Overlays

- **Chat panel** — slide-up drawer with real-time messages
- **Trick history panel** — scrollable list of all played tricks (requires unanimous vote)
- **Vote prompt** — modal asking other players to approve a trick history request

---

## Key Engine Rules

| Players | Decks | Cards each | Tricks | Bid range |
|---------|-------|------------|--------|-----------|
| 4       | 1     | 6          | 6      | 14 – 28   |
| 6       | 2     | 8          | 8      | 28 – 56   |
| 8       | 2     | 6          | 6      | 28 – 56   |

- **Bidding:** player-count-aware min/max. All-pass → dealer forced to minimum bid with no-trumps. Consecutive passes required: N−1 after a bid on the table, N for full all-pass.
- **Tricks:** follow-suit enforced; off-suit only legal when void. Trump beats led suit; J > 9 > A > 10 > K > Q within each suit.
- **Scoring:** bid 14–39 → 1 table, 40–47 → 2 tables, 48–55 → 3 tables, 56 → 4 tables. Double ×2, Redouble ×4. Failure: bid team loses (base + 1) × multiplier tables.
- **Winning:** a team wins when the opposing team reaches 0 tables.

---

## User Stories & Issue Tracking

All 33 user stories and ~90 test case issues are tracked on the [GitHub project board](https://github.com/skmathunny/56-card-game/issues).

### MVP Status

| Story | Title | Status |
|---|---|---|
| US01 | Sign in with Google | ✅ Done |
| US02 | Sign in with LinkedIn | ✅ Done |
| US03 | Play as a guest | ✅ Done |
| US04 | Edit display name and avatar | ✅ Done |
| US05 | View lifetime stats | 🔲 Backlog |
| US06 | Create a game room | ✅ Done |
| US07 | Configure room settings | ✅ Done |
| US08 | Join a room using a room code | ✅ Done |
| US09 | Add AI players to fill empty seats | ✅ Done |
| US10 | Choose partner or get auto-assigned | 🔲 Backlog |
| US11 | Leave waiting room with confirmation | ✅ Done |
| US12 | See animated card deal | ✅ Done |
| US13 | See players seated alternately around the table | ✅ Done |
| US14 | Place a bid with number and trump suit | ✅ Done |
| US15 | Pass during bidding | ✅ Done |
| US16 | Double or redouble a bid | ✅ Done |
| US17 | See all bids during bidding round | ✅ Done |
| US18 | Bid timer with auto-pass on expiry | 🔶 Partial (30 s display timer, no auto-pass yet) |
| US19 | Illegal cards are greyed out during play | ✅ Done |
| US20 | Two-tap to play a card | ✅ Done |
| US21 | See trick winning animation | 🔲 Backlog |
| US22 | Request trick history with unanimous vote | ✅ Done |
| US23 | Play timer with auto-play on expiry | 🔲 Backlog |
| US24 | See round summary after each round | ✅ Done |
| US25 | See tables as number and chip visual | ✅ Done |
| US26 | See end game screen with stats | ✅ Done |
| US27 | AI players follow bidding conventions | ✅ Done |
| US28 | AI players have names and avatars | ✅ Done |
| US29 | AI automatically takes over disconnected player | ✅ Done |
| US30 | Host role migrates on host disconnection | 🔲 Backlog |
| US31 | In-game chat between players | ✅ Done |
| US32 | Rematch without returning to lobby | 🔲 Backlog |
| US33 | Play offline against AI | ✅ Done |

**25 of 33 user stories complete** (US18 partially done).

---

## Recent Changes

### 2026-04-19 — Modular card deck system with image support

**Features**
- Image-based card decks: `CardView` and `DealAndBidScreen` render real card images; text/symbol rendering is the automatic fallback on error
- Modular deck registry: `src/decks/deckRegistry.ts` exposes `getCardImage`, `getCardBackImage`, and `getDeckTheme`; image maps use static `require()` to satisfy Metro bundler
- Four decks shipped: **Classic** and **Orthodox** have real card art extracted from spritesheets; **Royal** and **Minimal** use placeholder PNGs (replace files to upgrade without code changes)
- Deck selector in room settings now uses `DECK_CONFIGS` from `deckConfig.json` — add a new deck by editing the JSON and running a script
- `scripts/extract-cards.js` — crops individual card images from a 13×4 or 13×5 spritesheet; auto-detects cell size, supports configurable row count and suit order via CLI args
- `scripts/generate-card-assets.js` — generates placeholder PNGs and TypeScript image maps for all registered decks
- App test suite (Vitest): 19 tests, 100% coverage of `deckRegistry.ts`

### 2026-04-18 — Game rule fixes, logging, UI overhaul, test expansion

**Bug fixes**
- 4-player bid range corrected to 14–28 (was 28–56 everywhere, breaking all 4p bidding)
- AI player bid range is now player-count-aware (was hardcoded to 6p+ range, causing `BID_OUT_OF_RANGE` errors)
- Zod schema `BidSchema` minimum lowered from 28 → 14 so 4p bids aren't silently rejected before reaching the engine
- 6-player games now use 2 decks with 8 cards each and 8 tricks (was incorrectly using 24 cards)
- Round points displayed correctly on RoundSummaryScreen — `finalTeamPoints` snapshot captured before server resets them

**Features**
- Structured logging throughout server (Pino child loggers per room/round/socket)
- DealAndBidScreen: 30 s countdown timer, team panels with avatar chips, current-bidder pulse animation, responsive card sizing
- RoundSummaryScreen: full game history table with per-round bid, result, and table change
- EndGameScreen: last round summary badge inside winner banner, collapsible round history

**Testing**
- Test suite expanded from 66 → 130 tests (+64)
- New suites: `GameEngine.test.ts` (36), `AIPlayer.test.ts` (12), `Dealer.test.ts` (16)
- Engine layer: 100% statement coverage, 87–100% branch coverage

---

## Project Decisions

- **No database for MVP** — all game state is in-memory; rooms expire after 4 hours (configurable).
- **Offline-first auth** — JWT stored locally on device so offline mode works without a server round-trip.
- **Server-authoritative** — prevents cheating and simplifies the client to a pure view layer.
- **Alternating seat assignment** — seats 0, 2, 4, 6 → Team A; seats 1, 3, 5, 7 → Team B, producing the natural face-to-face partner arrangement.
- **Shared engine** — the pure TypeScript game engine (`src/offline/`) is copied from the server into the app, allowing identical logic in both online and offline modes with no monorepo tooling required.
