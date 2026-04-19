import { describe, it, expect } from 'vitest';
import {
  createGame, startBidding, placeBid, playCard, scoreRoundAndAdvance,
} from '../engine/GameEngine';
import { makeCard } from '../models/Card';
import { Player } from '../models/Player';
import { GameState } from '../models/GameState';
import { applyBid, createBiddingState } from '../engine/BiddingEngine';

// ── Helpers ────────────────────────────────────────────────────────────────

function makePlayers(count: 4 | 6 | 8): Omit<Player, 'hand'>[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`, userId: null, displayName: `P${i}`, avatarUrl: '',
    seatIndex: i, teamId: (i % 2 === 0 ? 'A' : 'B') as 'A' | 'B',
    isAI: false, isConnected: true, isHost: i === 0,
  }));
}

function makePlayerFull(id: string, seat: number, team: 'A' | 'B', hand: ReturnType<typeof makeCard>[]): Player {
  return { id, userId: null, displayName: id, avatarUrl: '', seatIndex: seat, teamId: team,
           isAI: false, isConnected: true, isHost: false, hand };
}

function makeBid(playerId: string, amount: number, trump = 'spades') {
  return { id: 'b1', playerId, amount, trump: trump as any, type: 'bid' as const,
           conventionId: 'number-first', timestamp: 0 };
}

// Build a minimal 4-player GameState in 'playing' phase with controlled hands.
// seats: 0=p0(A), 1=p1(B), 2=p2(A), 3=p3(B). p0 is current player (seat 0).
function makePlayingState(hands: Record<string, ReturnType<typeof makeCard>[]>): GameState {
  const players = [
    makePlayerFull('p0', 0, 'A', hands['p0'] ?? []),
    makePlayerFull('p1', 1, 'B', hands['p1'] ?? []),
    makePlayerFull('p2', 2, 'A', hands['p2'] ?? []),
    makePlayerFull('p3', 3, 'B', hands['p3'] ?? []),
  ];
  return {
    id: 'g1', roomId: 'r1', playerCount: 4, roundNumber: 1,
    phase: 'playing',
    players,
    teams: {
      A: { id: 'A', playerIds: ['p0', 'p2'], tables: 12, roundPoints: 0 },
      B: { id: 'B', playerIds: ['p1', 'p3'], tables: 12, roundPoints: 0 },
    },
    dealerSeatIndex: 0,
    currentPlayerSeatIndex: 0,
    biddingState: createBiddingState(3),
    winningBid: makeBid('p0', 14, 'spades'),
    trump: 'spades',
    tricks: [],
    currentTrick: { id: 1, ledSuit: null, cards: [], winnerId: null, points: 0 },
    winner: null,
  };
}

// ── createGame ─────────────────────────────────────────────────────────────

describe('createGame', () => {
  it('starts in dealing phase', () => {
    const state = createGame('room1', makePlayers(4), 12);
    expect(state.phase).toBe('dealing');
  });

  it('4-player: each player gets 6 cards', () => {
    const state = createGame('room1', makePlayers(4), 12);
    state.players.forEach(p => expect(p.hand).toHaveLength(6));
  });

  it('6-player: each player gets 8 cards', () => {
    const state = createGame('room1', makePlayers(6), 12);
    state.players.forEach(p => expect(p.hand).toHaveLength(8));
  });

  it('sets starting tables for both teams', () => {
    const state = createGame('room1', makePlayers(4), 10);
    expect(state.teams.A.tables).toBe(10);
    expect(state.teams.B.tables).toBe(10);
  });

  it('assigns players to correct teams', () => {
    const state = createGame('room1', makePlayers(4), 12);
    const teamAIds = state.teams.A.playerIds;
    const teamBIds = state.teams.B.playerIds;
    expect(teamAIds).toContain('p0');
    expect(teamAIds).toContain('p2');
    expect(teamBIds).toContain('p1');
    expect(teamBIds).toContain('p3');
  });

  it('8-player: each player gets 8 cards', () => {
    const state = createGame('room1', makePlayers(8), 12);
    state.players.forEach(p => expect(p.hand).toHaveLength(8));
  });

  it('8-player: all 64 card IDs are unique across all hands', () => {
    const state = createGame('room1', makePlayers(8), 12);
    const allIds = state.players.flatMap(p => p.hand.map(c => c.id));
    expect(new Set(allIds).size).toBe(64);
  });

  it('all card IDs are unique across all hands', () => {
    const state = createGame('room1', makePlayers(4), 12);
    const allIds = state.players.flatMap(p => p.hand.map(c => c.id));
    expect(new Set(allIds).size).toBe(24);
  });

  it('round number starts at 1', () => {
    const state = createGame('room1', makePlayers(4), 12);
    expect(state.roundNumber).toBe(1);
  });

  it('winner is null at start', () => {
    const state = createGame('room1', makePlayers(4), 12);
    expect(state.winner).toBeNull();
  });
});

// ── startBidding ───────────────────────────────────────────────────────────

describe('startBidding', () => {
  it('transitions from dealing to bidding', () => {
    const state = createGame('room1', makePlayers(4), 12);
    const { state: next, error } = startBidding(state);
    expect(error).toBeUndefined();
    expect(next.phase).toBe('bidding');
  });

  it('returns WRONG_PHASE if not in dealing phase', () => {
    const state = createGame('room1', makePlayers(4), 12);
    const { state: bidding } = startBidding(state);
    const { error } = startBidding(bidding);
    expect(error).toBe('WRONG_PHASE');
  });
});

// ── placeBid ───────────────────────────────────────────────────────────────

describe('placeBid', () => {
  it('returns WRONG_PHASE when not in bidding phase', () => {
    const state = createGame('room1', makePlayers(4), 12);
    const { error } = placeBid(state, 'p0', { playerId: 'p0', type: 'bid', amount: 14, trump: 'spades' });
    expect(error).toBe('WRONG_PHASE');
  });

  it('returns PLAYER_NOT_FOUND for unknown player', () => {
    const state = createGame('room1', makePlayers(4), 12);
    const { state: bidding } = startBidding(state);
    const { error } = placeBid(bidding, 'unknown', { playerId: 'unknown', type: 'pass' });
    expect(error).toBe('PLAYER_NOT_FOUND');
  });

  it('passes through NOT_YOUR_TURN from the bidding engine', () => {
    const state = createGame('room1', makePlayers(4), 12);
    const { state: bidding } = startBidding(state);
    // p0 is at seat 0, first bidder is seat 3 (anticlockwise of dealer 0)
    const firstBidderSeat = bidding.biddingState.currentBidderSeatIndex;
    const wrongPlayer = bidding.players.find(p => p.seatIndex !== firstBidderSeat)!;
    const { error } = placeBid(bidding, wrongPlayer.id, { playerId: wrongPlayer.id, type: 'pass' });
    expect(error).toBe('NOT_YOUR_TURN');
  });

  it('advances bidding state on pass', () => {
    const state = createGame('room1', makePlayers(4), 12);
    const { state: bidding } = startBidding(state);
    const firstBidderSeat = bidding.biddingState.currentBidderSeatIndex;
    const firstBidder = bidding.players.find(p => p.seatIndex === firstBidderSeat)!;
    const { state: after, error } = placeBid(bidding, firstBidder.id, { playerId: firstBidder.id, type: 'pass' });
    expect(error).toBeUndefined();
    expect(after.biddingState.bids).toHaveLength(1);
  });

  it('transitions to playing phase when bidding completes', () => {
    const state = createGame('room1', makePlayers(4), 12);
    let { state: s } = startBidding(state);

    // Seat order anticlockwise from first bidder: 3 → 2 → 1 → 0
    // First player bids, rest pass → 3 consecutive passes → complete
    const order = [3, 2, 1, 0];
    for (let i = 0; i < order.length; i++) {
      const seat = order[i];
      const player = s.players.find(p => p.seatIndex === seat)!;
      const input = i === 0
        ? { playerId: player.id, type: 'bid' as const, amount: 14, trump: 'spades' as const }
        : { playerId: player.id, type: 'pass' as const };
      ({ state: s } = placeBid(s, player.id, input));
    }

    expect(s.phase).toBe('playing');
  });

  it('sets winningBid and trump when bidding completes', () => {
    const state = createGame('room1', makePlayers(4), 12);
    let { state: s } = startBidding(state);

    const order = [3, 2, 1, 0];
    for (let i = 0; i < order.length; i++) {
      const seat = order[i];
      const player = s.players.find(p => p.seatIndex === seat)!;
      const input = i === 0
        ? { playerId: player.id, type: 'bid' as const, amount: 16, trump: 'hearts' as const }
        : { playerId: player.id, type: 'pass' as const };
      ({ state: s } = placeBid(s, player.id, input));
    }

    expect(s.winningBid?.amount).toBe(16);
    expect(s.trump).toBe('hearts');
  });

  it('all-pass forces dealer to play minimum bid 14 in 4p', () => {
    const state = createGame('room1', makePlayers(4), 12);
    let { state: s } = startBidding(state);

    const order = [3, 2, 1, 0];
    for (const seat of order) {
      const player = s.players.find(p => p.seatIndex === seat)!;
      ({ state: s } = placeBid(s, player.id, { playerId: player.id, type: 'pass' }));
    }

    expect(s.phase).toBe('playing');
    expect(s.winningBid?.amount).toBe(14);
    expect(s.winningBid?.trump).toBe('no-trumps');
  });
});

// ── playCard ───────────────────────────────────────────────────────────────

describe('playCard', () => {
  it('returns WRONG_PHASE when not in playing phase', () => {
    const state = createGame('room1', makePlayers(4), 12);
    const { error } = playCard(state, 'p0', 'any-card');
    expect(error).toBe('WRONG_PHASE');
  });

  it('returns PLAYER_NOT_FOUND for unknown player', () => {
    const s = makePlayingState({ p0: [makeCard('hearts', 'A')] });
    const { error } = playCard(s, 'ghost', 'A_hearts');
    expect(error).toBe('PLAYER_NOT_FOUND');
  });

  it('returns CARD_NOT_IN_HAND when card is not in player hand', () => {
    const s = makePlayingState({ p0: [makeCard('hearts', 'K')] });
    const { error } = playCard(s, 'p0', 'J_spades');
    expect(error).toBe('CARD_NOT_IN_HAND');
  });

  it('removes played card from the player hand', () => {
    const card = makeCard('hearts', 'A');
    const s = makePlayingState({ p0: [card, makeCard('spades', 'K')] });
    const { state: next, error } = playCard(s, 'p0', card.id);
    expect(error).toBeUndefined();
    const p0After = next.players.find(p => p.id === 'p0')!;
    expect(p0After.hand.find(c => c.id === card.id)).toBeUndefined();
  });

  it('sets ledSuit on first play of a trick', () => {
    const card = makeCard('hearts', 'A');
    const s = makePlayingState({ p0: [card] });
    const { state: next } = playCard(s, 'p0', card.id);
    expect(next.currentTrick?.ledSuit).toBe('hearts');
  });

  it('advances currentPlayerSeatIndex anticlockwise after a play', () => {
    // p0 is seat 0; next anticlockwise in 4p is seat 3
    const card = makeCard('hearts', 'A');
    const s = makePlayingState({ p0: [card] });
    const { state: next } = playCard(s, 'p0', card.id);
    expect(next.currentPlayerSeatIndex).toBe(3);
  });

  it('updates roundPoints for the winning team after trick completes', () => {
    // p0(A) plays hearts J (3pts), p1(B) plays hearts 10 (1pt), p2(A) plays hearts K (0pts), p3(B) plays hearts Q (0pts)
    // No trump → J wins → Team A gets 4 points
    const hands = {
      p0: [makeCard('hearts', 'J')],
      p1: [makeCard('hearts', '10')],
      p2: [makeCard('hearts', 'K')],
      p3: [makeCard('hearts', 'Q')],
    };
    let s = makePlayingState(hands);
    // Play in seat order: 0 → 3 → 2 → 1
    let res = playCard(s, 'p0', makeCard('hearts', 'J').id); s = res.state;
    res = playCard(s, 'p3', makeCard('hearts', 'Q').id);     s = res.state;
    res = playCard(s, 'p2', makeCard('hearts', 'K').id);     s = res.state;
    res = playCard(s, 'p1', makeCard('hearts', '10').id);    s = res.state;
    // J wins → p0 (Team A) → A gets J(3)+10(1)+K(0)+Q(0) = 4 pts
    expect(s.teams.A.roundPoints).toBe(4);
  });

  it('starts next trick after completing a trick (when more cards remain)', () => {
    const hands = {
      p0: [makeCard('hearts', 'J'), makeCard('spades', 'K')],
      p1: [makeCard('hearts', '10'), makeCard('spades', 'Q')],
      p2: [makeCard('hearts', 'K'), makeCard('clubs', 'A')],
      p3: [makeCard('hearts', 'Q'), makeCard('diamonds', '9')],
    };
    let s = makePlayingState(hands);
    let res = playCard(s, 'p0', makeCard('hearts', 'J').id);  s = res.state;
    res = playCard(s, 'p3', makeCard('hearts', 'Q').id);       s = res.state;
    res = playCard(s, 'p2', makeCard('hearts', 'K').id);       s = res.state;
    res = playCard(s, 'p1', makeCard('hearts', '10').id);      s = res.state;
    // After 1 trick (4 cards), next trick starts
    expect(s.tricks).toHaveLength(1);
    expect(s.currentTrick).not.toBeNull();
    expect(s.currentTrick!.id).toBe(2);
    expect(s.phase).toBe('playing');
  });

  it('transitions to scoring after all tricks are played', () => {
    // 4p game: 6 tricks total. Give each player 6 cards all of the same suit (hearts)
    // so no trump confusion; p0 always leads with highest → wins all tricks
    const allHearts = ['J', '9', 'A', '10', 'K', 'Q'] as const;
    const hands = {
      p0: allHearts.map(r => makeCard('hearts', r)),
      p1: ['J', '9', 'A', '10', 'K', 'Q'].map(r => makeCard('spades', r as any)),
      p2: ['J', '9', 'A', '10', 'K', 'Q'].map(r => makeCard('clubs', r as any)),
      p3: ['J', '9', 'A', '10', 'K', 'Q'].map(r => makeCard('diamonds', r as any)),
    };
    // Trump = clubs so p2's clubs beat everything; but p0 leads hearts first
    // Actually easiest: trump = no-trumps. p0 leads hearts J each trick → wins.
    let s: GameState = { ...makePlayingState(hands), trump: 'no-trumps' as any };

    // Play 6 tricks: p0 leads each trick, others play off-suit (can't follow hearts)
    // When void in led suit, any card is legal. p0 has hearts → leads; others void → play anything.
    // p0's J beats everything in led suit; off-suit doesn't beat led suit without trump.
    for (let trick = 0; trick < 6; trick++) {
      const p0Card = s.players.find(p => p.id === 'p0')!.hand[0];
      let res = playCard(s, 'p0', p0Card.id); s = res.state;
      // anticlockwise: next is seat 3 (p3), then 2 (p2), then 1 (p1)
      for (const pid of ['p3', 'p2', 'p1']) {
        const player = s.players.find(p => p.id === pid)!;
        const card = player.hand[0];
        res = playCard(s, pid, card.id);
        s = res.state;
      }
    }

    expect(s.phase).toBe('scoring');
    expect(s.tricks).toHaveLength(6);
    expect(s.currentTrick).toBeNull();
  });
});

// ── scoreRoundAndAdvance ───────────────────────────────────────────────────

describe('scoreRoundAndAdvance', () => {
  function makeScoringState(opts: {
    bidPlayerId?: string;
    bidAmount?: number;
    roundPointsA?: number;
    roundPointsB?: number;
    tablesA?: number;
    tablesB?: number;
  } = {}): GameState {
    const { bidPlayerId = 'p0', bidAmount = 14,
            roundPointsA = 16, roundPointsB = 12,
            tablesA = 12, tablesB = 12 } = opts;
    return {
      id: 'g1', roomId: 'r1', playerCount: 4, roundNumber: 1,
      phase: 'scoring',
      players: [
        makePlayerFull('p0', 0, 'A', []),
        makePlayerFull('p1', 1, 'B', []),
        makePlayerFull('p2', 2, 'A', []),
        makePlayerFull('p3', 3, 'B', []),
      ],
      teams: {
        A: { id: 'A', playerIds: ['p0', 'p2'], tables: tablesA, roundPoints: roundPointsA },
        B: { id: 'B', playerIds: ['p1', 'p3'], tables: tablesB, roundPoints: roundPointsB },
      },
      dealerSeatIndex: 0,
      currentPlayerSeatIndex: 0,
      biddingState: createBiddingState(3),
      winningBid: makeBid(bidPlayerId, bidAmount),
      trump: 'spades',
      tricks: [],
      currentTrick: null,
      winner: null,
    };
  }

  it('returns WRONG_PHASE when not in scoring phase', () => {
    const state = createGame('room1', makePlayers(4), 12);
    const { error } = scoreRoundAndAdvance(state);
    expect(error).toBe('WRONG_PHASE');
  });

  it('resets roundPoints to 0 after scoring', () => {
    const s = makeScoringState({ roundPointsA: 16, roundPointsB: 12 });
    const { state: next } = scoreRoundAndAdvance(s);
    expect(next.teams.A.roundPoints).toBe(0);
    expect(next.teams.B.roundPoints).toBe(0);
  });

  it('opponent team loses tables on bid success', () => {
    // Team A bids 14, has 16 pts → success → Team B loses 1 table
    const s = makeScoringState({ bidPlayerId: 'p0', bidAmount: 14, roundPointsA: 16, tablesB: 12 });
    const { state: next } = scoreRoundAndAdvance(s);
    expect(next.teams.B.tables).toBe(11);
    expect(next.teams.A.tables).toBe(12);
  });

  it('bid team loses tables on failure', () => {
    // Team A bids 20, has only 15 pts → failure → Team A loses 2 tables
    const s = makeScoringState({ bidPlayerId: 'p0', bidAmount: 20, roundPointsA: 15 });
    const { state: next } = scoreRoundAndAdvance(s);
    expect(next.teams.A.tables).toBeLessThan(12);
  });

  it('increments round number', () => {
    const s = makeScoringState();
    const { state: next } = scoreRoundAndAdvance(s);
    expect(next.roundNumber).toBe(2);
  });

  it('rotates dealer anticlockwise to next seat', () => {
    const s = makeScoringState(); // dealerSeatIndex = 0
    const { state: next } = scoreRoundAndAdvance(s);
    expect(next.dealerSeatIndex).toBe(3); // anticlockwise from 0 in 4p
  });

  it('deals new hands (players have cards again) after round', () => {
    const s = makeScoringState();
    const { state: next } = scoreRoundAndAdvance(s);
    next.players.forEach(p => expect(p.hand.length).toBeGreaterThan(0));
  });

  it('clears tricks and currentTrick for the new round', () => {
    const s = makeScoringState();
    const { state: next } = scoreRoundAndAdvance(s);
    expect(next.tricks).toHaveLength(0);
    expect(next.currentTrick).toBeNull();
  });

  it('sets winner when a team reaches 0 tables', () => {
    // Team B has 1 table; Team A bids 14 and succeeds → Team B loses 1 → 0 → Team A wins
    const s = makeScoringState({ bidPlayerId: 'p0', bidAmount: 14, roundPointsA: 16, tablesB: 1 });
    const { state: next } = scoreRoundAndAdvance(s);
    expect(next.phase).toBe('complete');
    expect(next.winner).toBe('A');
  });

  it('returns roundResult with correct fields', () => {
    const s = makeScoringState({ bidPlayerId: 'p0', bidAmount: 14, roundPointsA: 16, roundPointsB: 12 });
    const { roundResult } = scoreRoundAndAdvance(s);
    expect(roundResult).toBeDefined();
    expect(roundResult!.bidTeam).toBe('A');
    expect(roundResult!.bidAmount).toBe(14);
    expect(roundResult!.success).toBe(true);
    expect(roundResult!.finalTeamPoints.A).toBe(16);
    expect(roundResult!.finalTeamPoints.B).toBe(12);
  });

  it('Team B wins when Team A fails and reaches 0 tables', () => {
    // Team A bids 14, has 5 pts → failure → A loses 2 tables. A has 2 → A reaches 0 → B wins
    const s = makeScoringState({ bidPlayerId: 'p0', bidAmount: 14, roundPointsA: 5, tablesA: 2, tablesB: 12 });
    const { state: next } = scoreRoundAndAdvance(s);
    expect(next.teams.A.tables).toBe(0);
    expect(next.winner).toBe('B');
    expect(next.phase).toBe('complete');
  });

  it('Team B wins when Team B bids and succeeds, draining A', () => {
    // p1 is team B; B bids 14, B has 20 pts → success → A loses 1 table. A has 1 → A = 0 → B wins
    const s = makeScoringState({ bidPlayerId: 'p1', bidAmount: 14, roundPointsA: 8, roundPointsB: 20, tablesA: 1, tablesB: 12 });
    const { state: next } = scoreRoundAndAdvance(s);
    expect(next.teams.A.tables).toBe(0);
    expect(next.winner).toBe('B');
    expect(next.phase).toBe('complete');
  });

  it('bid 56 success wipes out opponent with fewer than 4 tables', () => {
    // Team A bids 56, earns 56 pts → success → 4 table change. Team B has 3 → clamped to 0 → A wins
    const s = makeScoringState({ bidPlayerId: 'p0', bidAmount: 56, roundPointsA: 56, tablesB: 3 });
    const { state: next } = scoreRoundAndAdvance(s);
    expect(next.teams.B.tables).toBe(0);
    expect(next.winner).toBe('A');
    expect(next.phase).toBe('complete');
  });

  it('doubled bid ends game from 2 tables in one round', () => {
    // Team A doubles at 14, earns enough → 2 table change. Team B has 2 → B = 0 → A wins
    const s = makeScoringState({ bidPlayerId: 'p0', bidAmount: 14, roundPointsA: 16, tablesB: 2 });
    s.winningBid = { ...s.winningBid!, type: 'double' };
    const { state: next } = scoreRoundAndAdvance(s);
    expect(next.teams.B.tables).toBe(0);
    expect(next.winner).toBe('A');
    expect(next.phase).toBe('complete');
  });

  it('complete state: no new cards dealt, phase stays complete', () => {
    const s = makeScoringState({ bidPlayerId: 'p0', bidAmount: 14, roundPointsA: 16, tablesB: 1 });
    const { state: complete } = scoreRoundAndAdvance(s);
    expect(complete.phase).toBe('complete');
    complete.players.forEach(p => expect(p.hand).toHaveLength(0));
  });

  it('complete state: scoreRoundAndAdvance returns WRONG_PHASE', () => {
    const s = makeScoringState({ bidPlayerId: 'p0', bidAmount: 14, roundPointsA: 16, tablesB: 1 });
    const { state: complete } = scoreRoundAndAdvance(s);
    const { error } = scoreRoundAndAdvance(complete);
    expect(error).toBe('WRONG_PHASE');
  });

  it('winner persists: winner field stays set in complete state', () => {
    const s = makeScoringState({ bidPlayerId: 'p0', bidAmount: 14, roundPointsA: 16, tablesB: 1 });
    const { state: complete } = scoreRoundAndAdvance(s);
    expect(complete.winner).toBe('A');
    // Calling scoreRoundAndAdvance again returns WRONG_PHASE but winner is still A
    const { state: unchanged } = scoreRoundAndAdvance(complete);
    expect(unchanged.winner).toBe('A');
  });

  it('multi-round: game ends when a team reaches 0 tables', () => {
    // 3 successive wins by Team A at bid 14 should drain Team B from 3 → 0
    let s = makeScoringState({ bidPlayerId: 'p0', bidAmount: 14, roundPointsA: 16, tablesA: 12, tablesB: 3 });
    let { state: s1 } = scoreRoundAndAdvance(s);
    expect(s1.teams.B.tables).toBe(2);
    expect(s1.winner).toBeNull();

    // Simulate second win: re-use scoring state with updated tables
    s1 = { ...s1, phase: 'scoring', winningBid: makeBid('p0', 14),
            teams: { A: { ...s1.teams.A, roundPoints: 16 }, B: { ...s1.teams.B, roundPoints: 0 } } };
    let { state: s2 } = scoreRoundAndAdvance(s1);
    expect(s2.teams.B.tables).toBe(1);
    expect(s2.winner).toBeNull();

    s2 = { ...s2, phase: 'scoring', winningBid: makeBid('p0', 14),
            teams: { A: { ...s2.teams.A, roundPoints: 16 }, B: { ...s2.teams.B, roundPoints: 0 } } };
    let { state: s3 } = scoreRoundAndAdvance(s2);
    expect(s3.teams.B.tables).toBe(0);
    expect(s3.winner).toBe('A');
    expect(s3.phase).toBe('complete');
  });
});

// ── new game after end game ───────────────────────────────────────────────

describe('new game after end game', () => {
  function finishedGame(): GameState {
    // Build a scoring state where Team B is eliminated, then score it to 'complete'
    const s: GameState = {
      id: 'g1', roomId: 'r1', playerCount: 4, roundNumber: 5,
      phase: 'scoring',
      players: [
        makePlayerFull('p0', 0, 'A', []),
        makePlayerFull('p1', 1, 'B', []),
        makePlayerFull('p2', 2, 'A', []),
        makePlayerFull('p3', 3, 'B', []),
      ],
      teams: {
        A: { id: 'A', playerIds: ['p0', 'p2'], tables: 10, roundPoints: 20 },
        B: { id: 'B', playerIds: ['p1', 'p3'], tables: 1,  roundPoints: 8  },
      },
      dealerSeatIndex: 2,
      currentPlayerSeatIndex: 0,
      biddingState: createBiddingState(1),
      winningBid: makeBid('p0', 14),
      trump: 'spades',
      tricks: [],
      currentTrick: null,
      winner: null,
    };
    return scoreRoundAndAdvance(s).state;
  }

  it('finished game is in complete phase with a winner', () => {
    const complete = finishedGame();
    expect(complete.phase).toBe('complete');
    expect(complete.winner).toBe('A');
  });

  it('new game resets phase to dealing', () => {
    const newGame = createGame('room1', makePlayers(4), 12);
    expect(newGame.phase).toBe('dealing');
  });

  it('new game resets winner to null', () => {
    const newGame = createGame('room1', makePlayers(4), 12);
    expect(newGame.winner).toBeNull();
  });

  it('new game resets round number to 1', () => {
    const newGame = createGame('room1', makePlayers(4), 12);
    expect(newGame.roundNumber).toBe(1);
  });

  it('new game resets both teams tables to startingTables', () => {
    const newGame = createGame('room1', makePlayers(4), 12);
    expect(newGame.teams.A.tables).toBe(12);
    expect(newGame.teams.B.tables).toBe(12);
  });

  it('new game resets tables even when called with different startingTables', () => {
    const newGame = createGame('room1', makePlayers(4), 7);
    expect(newGame.teams.A.tables).toBe(7);
    expect(newGame.teams.B.tables).toBe(7);
  });

  it('new game deals fresh cards to all players', () => {
    const newGame = createGame('room1', makePlayers(4), 12);
    newGame.players.forEach(p => expect(p.hand.length).toBeGreaterThan(0));
  });

  it('new game deals different cards than a previous game (shuffle is fresh)', () => {
    const game1 = createGame('room1', makePlayers(4), 12);
    const game2 = createGame('room1', makePlayers(4), 12);
    const ids1 = game1.players.flatMap(p => p.hand.map(c => c.id)).join(',');
    const ids2 = game2.players.flatMap(p => p.hand.map(c => c.id)).join(',');
    expect(ids1).not.toBe(ids2);
  });

  it('new game preserves same player count as the finished game', () => {
    const newGame4p = createGame('room1', makePlayers(4), 12);
    const newGame6p = createGame('room1', makePlayers(6), 12);
    expect(newGame4p.playerCount).toBe(4);
    expect(newGame6p.playerCount).toBe(6);
  });

  it('new game resets roundPoints to 0 for both teams', () => {
    const newGame = createGame('room1', makePlayers(4), 12);
    expect(newGame.teams.A.roundPoints).toBe(0);
    expect(newGame.teams.B.roundPoints).toBe(0);
  });

  it('new game clears tricks and currentTrick', () => {
    const newGame = createGame('room1', makePlayers(4), 12);
    expect(newGame.tricks).toHaveLength(0);
    expect(newGame.currentTrick).toBeNull();
  });

  it('new game clears winningBid from previous round', () => {
    const newGame = createGame('room1', makePlayers(4), 12);
    expect(newGame.winningBid).toBeNull();
  });
});

// ── round point totals ────────────────────────────────────────────────────

describe('round point totals per player count', () => {
  it('4-player: total point value of all dealt cards is 28', () => {
    const state = createGame('room1', makePlayers(4), 12);
    const total = state.players.flatMap(p => p.hand).reduce((sum, c) => sum + c.pointValue, 0);
    expect(total).toBe(28);
  });

  it('6-player: total point value of all dealt cards is 56', () => {
    const state = createGame('room1', makePlayers(6), 12);
    const total = state.players.flatMap(p => p.hand).reduce((sum, c) => sum + c.pointValue, 0);
    expect(total).toBe(56);
  });

  it('8-player: total point value of all dealt cards is 56', () => {
    const state = createGame('room1', makePlayers(8), 12);
    const total = state.players.flatMap(p => p.hand).reduce((sum, c) => sum + c.pointValue, 0);
    expect(total).toBe(56);
  });

  it('4-player: team roundPoints sum to 28 after all tricks are played', () => {
    const allHearts = ['J', '9', 'A', '10', 'K', 'Q'] as const;
    const hands = {
      p0: allHearts.map(r => makeCard('hearts', r)),
      p1: ['J', '9', 'A', '10', 'K', 'Q'].map(r => makeCard('spades', r as any)),
      p2: ['J', '9', 'A', '10', 'K', 'Q'].map(r => makeCard('clubs', r as any)),
      p3: ['J', '9', 'A', '10', 'K', 'Q'].map(r => makeCard('diamonds', r as any)),
    };
    let s: GameState = { ...makePlayingState(hands), trump: 'no-trumps' as any };

    for (let trick = 0; trick < 6; trick++) {
      const p0Card = s.players.find(p => p.id === 'p0')!.hand[0];
      let res = playCard(s, 'p0', p0Card.id); s = res.state;
      for (const pid of ['p3', 'p2', 'p1']) {
        const card = s.players.find(p => p.id === pid)!.hand[0];
        res = playCard(s, pid, card.id); s = res.state;
      }
    }

    expect(s.phase).toBe('scoring');
    const totalPoints = s.teams.A.roundPoints + s.teams.B.roundPoints;
    expect(totalPoints).toBe(28);
  });
});
