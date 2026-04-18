# 56 — Fifty-Six Card Game

A real-time multiplayer implementation of the classic South Indian trick-taking card game, built for mobile (iOS & Android) with full offline support.

## Overview

56 is a trick-taking card game for 4, 6, or 8 players in two teams. Players bid on how many points they expect to win, choose a trump suit, then play tricks to meet or beat the bid. Teams win or lose "tables" based on bid success. The game ends when one team runs out of tables.

**Card rank order (highest to lowest):** J → 9 → A → 10 → K → Q → 8 → 7

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
npm test                  # run 42 engine unit tests
```

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

- **Bidding:** minimum bid 28, maximum 56. All-pass → bid defaults to 28 with no trumps for the dealer. Consecutive passes needed: N−1 after a bid, N for all-pass.
- **Tricks:** 4-player = 6 tricks (24-card deck); 6/8-player = 4 tricks (24/32-card deck).
- **Trump:** J and 9 of trump suit are always legal to play regardless of led suit.
- **Scoring:** tablesForBid ≤39 → 1 table, ≤47 → 2, ≤55 → 3, 56 → 4. Failure = (base + 1) tables lost.
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
| US18 | Bid timer with auto-pass on expiry | 🔲 Backlog |
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

**25 of 33 user stories complete.**

---

## Project Decisions

- **No database for MVP** — all game state is in-memory; rooms expire after 4 hours (configurable).
- **Offline-first auth** — JWT stored locally on device so offline mode works without a server round-trip.
- **Server-authoritative** — prevents cheating and simplifies the client to a pure view layer.
- **Alternating seat assignment** — seats 0, 2, 4, 6 → Team A; seats 1, 3, 5, 7 → Team B, producing the natural face-to-face partner arrangement.
- **Shared engine** — the pure TypeScript game engine (`src/offline/`) is copied from the server into the app, allowing identical logic in both online and offline modes with no monorepo tooling required.
