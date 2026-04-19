import { describe, it, expect } from 'vitest';
import { decideBid, decidePlay } from '../ai/AIPlayer';
import { makeCard } from '../models/Card';
import { GameState } from '../models/GameState';
import { Player } from '../models/Player';

// ── Helpers ────────────────────────────────────────────────────────────────

function makePlayer(id: string, seat: number, team: 'A' | 'B', hand: ReturnType<typeof makeCard>[]): Player {
  return {
    id, userId: null, displayName: id, avatarUrl: '',
    seatIndex: seat, teamId: team,
    isAI: true, isConnected: true, isHost: false, hand,
  };
}

function makeBiddingState(currentHighBid: GameState['biddingState']['currentHighBid'] = null) {
  return {
    bids: [],
    currentBidderSeatIndex: 0,
    currentHighBid,
    consecutivePasses: 0,
    isComplete: false,
  };
}

function makeGameState(
  playerCount: 4 | 6,
  players: Player[],
  currentHighBid: GameState['biddingState']['currentHighBid'] = null,
  trump: string | null = null,
  currentTrick: GameState['currentTrick'] = null,
): GameState {
  return {
    id: 'g1', roomId: 'r1', playerCount, roundNumber: 1,
    phase: 'bidding',
    players,
    teams: {
      A: { id: 'A', playerIds: players.filter(p => p.teamId === 'A').map(p => p.id), tables: 12, roundPoints: 0 },
      B: { id: 'B', playerIds: players.filter(p => p.teamId === 'B').map(p => p.id), tables: 12, roundPoints: 0 },
    },
    dealerSeatIndex: 0,
    currentPlayerSeatIndex: 0,
    biddingState: makeBiddingState(currentHighBid),
    winningBid: null,
    trump: trump as any,
    tricks: [],
    currentTrick,
    winner: null,
  };
}

// ── decideBid — 4-player ───────────────────────────────────────────────────

describe('decideBid — 4-player', () => {
  it('bids at least the minimum (14) on any hand with no current bid', () => {
    const hand = [makeCard('spades', 'K'), makeCard('hearts', 'Q'), makeCard('clubs', 'K'),
                  makeCard('diamonds', 'Q'), makeCard('spades', 'Q'), makeCard('hearts', 'K')];
    const state = makeGameState(4, [makePlayer('ai', 0, 'A', hand)]);
    const result = decideBid(state, 'ai');
    expect(result.type).toBe('bid');
    if (result.type === 'bid') expect(result.amount).toBeGreaterThanOrEqual(14);
  });

  it('never bids above 28 in a 4-player game', () => {
    const hand = [makeCard('spades', 'J'), makeCard('spades', '9'), makeCard('spades', 'A'),
                  makeCard('spades', '10'), makeCard('spades', 'K'), makeCard('hearts', 'J')];
    const state = makeGameState(4, [makePlayer('ai', 0, 'A', hand)]);
    const result = decideBid(state, 'ai');
    if (result.type === 'bid') expect(result.amount).toBeLessThanOrEqual(28);
  });

  it('passes when calculated bid would not exceed current high bid', () => {
    // Weak hand: all K/Q → strength 0 → bidAmount = 14; current bid already 14 → pass
    const hand = [makeCard('spades', 'K'), makeCard('hearts', 'Q'), makeCard('clubs', 'K'),
                  makeCard('diamonds', 'Q'), makeCard('spades', 'Q'), makeCard('hearts', 'K')];
    const highBid = { id: 'b1', playerId: 'p1', amount: 14, trump: 'hearts' as any,
                      type: 'bid' as const, conventionId: 'number-first', timestamp: 0 };
    const state = makeGameState(4, [makePlayer('ai', 0, 'A', hand)], highBid);
    const result = decideBid(state, 'ai');
    expect(result.type).toBe('pass');
  });

  it('bids when hand is strong enough to exceed current high bid', () => {
    // J+9+A of spades → strength 16+3bonus=19; bidAmount = 14+9=23 > current 14
    const hand = [makeCard('spades', 'J'), makeCard('spades', '9'), makeCard('spades', 'A'),
                  makeCard('spades', '10'), makeCard('spades', 'K'), makeCard('hearts', 'K')];
    const highBid = { id: 'b1', playerId: 'p1', amount: 14, trump: 'hearts' as any,
                      type: 'bid' as const, conventionId: 'number-first', timestamp: 0 };
    const state = makeGameState(4, [makePlayer('ai', 0, 'A', hand)], highBid);
    const result = decideBid(state, 'ai');
    expect(result.type).toBe('bid');
    if (result.type === 'bid') {
      expect(result.amount).toBeGreaterThan(14);
      expect(result.amount).toBeLessThanOrEqual(28);
    }
  });

  it('selects the suit with the highest scoring cards as trump', () => {
    // Spades: J(8)+9(5)=13; Hearts: A(3) only → should pick spades
    const hand = [makeCard('spades', 'J'), makeCard('spades', '9'), makeCard('hearts', 'A'),
                  makeCard('clubs', 'K'), makeCard('diamonds', 'Q'), makeCard('spades', 'K')];
    const state = makeGameState(4, [makePlayer('ai', 0, 'A', hand)]);
    const result = decideBid(state, 'ai');
    if (result.type === 'bid') expect(result.trump).toBe('spades');
  });
});

// ── decideBid — 6-player ───────────────────────────────────────────────────

describe('decideBid — 6-player', () => {
  function make6pPlayers(aiHand: ReturnType<typeof makeCard>[]): Player[] {
    return [
      makePlayer('ai', 0, 'A', aiHand),
      makePlayer('p1', 1, 'B', []),
      makePlayer('p2', 2, 'A', []),
      makePlayer('p3', 3, 'B', []),
      makePlayer('p4', 4, 'A', []),
      makePlayer('p5', 5, 'B', []),
    ];
  }

  it('bids at least the minimum (28) with no current bid', () => {
    const hand = [makeCard('spades', 'K'), makeCard('hearts', 'Q'), makeCard('clubs', 'K'),
                  makeCard('diamonds', 'Q'), makeCard('spades', 'Q'), makeCard('hearts', 'K'),
                  makeCard('clubs', 'Q'), makeCard('diamonds', 'K')];
    const state = makeGameState(6, make6pPlayers(hand));
    const result = decideBid(state, 'ai');
    expect(result.type).toBe('bid');
    if (result.type === 'bid') expect(result.amount).toBeGreaterThanOrEqual(28);
  });

  it('never bids above 56 in a 6-player game', () => {
    const hand = [makeCard('spades', 'J'), makeCard('spades', '9'), makeCard('spades', 'A'),
                  makeCard('spades', '10'), makeCard('hearts', 'J'), makeCard('hearts', '9'),
                  makeCard('clubs', 'J'), makeCard('diamonds', 'J')];
    const state = makeGameState(6, make6pPlayers(hand));
    const result = decideBid(state, 'ai');
    if (result.type === 'bid') expect(result.amount).toBeLessThanOrEqual(56);
  });

  it('passes when 6p bid amount would not beat current high bid', () => {
    // Weak hand → bidAmount = 28; current bid = 28 → pass
    const hand = [makeCard('spades', 'K'), makeCard('hearts', 'Q'), makeCard('clubs', 'K'),
                  makeCard('diamonds', 'Q'), makeCard('spades', 'Q'), makeCard('hearts', 'K'),
                  makeCard('clubs', 'Q'), makeCard('diamonds', 'K')];
    const highBid = { id: 'b1', playerId: 'p1', amount: 28, trump: 'hearts' as any,
                      type: 'bid' as const, conventionId: 'number-first', timestamp: 0 };
    const state = makeGameState(6, make6pPlayers(hand), highBid);
    const result = decideBid(state, 'ai');
    expect(result.type).toBe('pass');
  });
});

// ── decidePlay ─────────────────────────────────────────────────────────────

describe('decidePlay', () => {
  function makeTrickCard(playerId: string, card: ReturnType<typeof makeCard>, playOrder: number) {
    return { playerId, card, playOrder };
  }

  it('plays lowest point-value card when partner is currently winning the trick', () => {
    // p0 (Team A) is the AI. p2 (Team A, partner) played hearts J and is winning.
    const p0Hand = [makeCard('hearts', 'K'), makeCard('hearts', 'A'), makeCard('hearts', '9')];
    const players = [
      makePlayer('p0', 0, 'A', p0Hand),
      makePlayer('p1', 1, 'B', []),
      makePlayer('p2', 2, 'A', []),
      makePlayer('p3', 3, 'B', []),
    ];
    const currentTrick = {
      id: 1, ledSuit: 'hearts' as const, winnerId: null, points: 0,
      cards: [
        makeTrickCard('p2', makeCard('hearts', 'J'), 1),  // partner leading with J
        makeTrickCard('p3', makeCard('hearts', '10'), 2),
      ],
    };
    const state = makeGameState(4, players, null, 'spades', currentTrick);
    const cardId = decidePlay(state, 'p0');
    // Partner (p2) is winning → should play lowest (K = 0 pts)
    expect(cardId).toBe(makeCard('hearts', 'K').id);
  });

  it('plays highest high-rank card of led suit to win when possible', () => {
    // p0 (Team A). p1 (Team B) played hearts 10. p0 has J and K → should play J to win.
    const p0Hand = [makeCard('hearts', 'J'), makeCard('hearts', 'K'), makeCard('spades', 'A')];
    const players = [
      makePlayer('p0', 0, 'A', p0Hand),
      makePlayer('p1', 1, 'B', []),
      makePlayer('p2', 2, 'A', []),
      makePlayer('p3', 3, 'B', []),
    ];
    const currentTrick = {
      id: 1, ledSuit: 'hearts' as const, winnerId: null, points: 0,
      cards: [makeTrickCard('p1', makeCard('hearts', '10'), 1)],
    };
    const state = makeGameState(4, players, null, 'spades', currentTrick);
    const cardId = decidePlay(state, 'p0');
    expect(cardId).toBe(makeCard('hearts', 'J').id);
  });

  it('plays lowest legal card when unable to win', () => {
    // p0 has only low hearts cards; opponent leads with hearts J (highest)
    const p0Hand = [makeCard('hearts', 'Q'), makeCard('hearts', 'K')];
    const players = [
      makePlayer('p0', 0, 'A', p0Hand),
      makePlayer('p1', 1, 'B', []),
      makePlayer('p2', 2, 'A', []),
      makePlayer('p3', 3, 'B', []),
    ];
    const currentTrick = {
      id: 1, ledSuit: 'hearts' as const, winnerId: null, points: 0,
      cards: [makeTrickCard('p1', makeCard('hearts', 'J'), 1)],
    };
    const state = makeGameState(4, players, null, 'spades', currentTrick);
    const cardId = decidePlay(state, 'p0');
    // Q and K both 0 pts; lowestLegalCard picks first 0-pt card → Q or K (both 0 pts)
    const legalIds = [makeCard('hearts', 'Q').id, makeCard('hearts', 'K').id];
    expect(legalIds).toContain(cardId);
  });

  it('can play any card when void in led suit', () => {
    const p0Hand = [makeCard('spades', 'J'), makeCard('clubs', 'K')];
    const players = [
      makePlayer('p0', 0, 'A', p0Hand),
      makePlayer('p1', 1, 'B', []),
      makePlayer('p2', 2, 'A', []),
      makePlayer('p3', 3, 'B', []),
    ];
    const currentTrick = {
      id: 1, ledSuit: 'hearts' as const, winnerId: null, points: 0,
      cards: [makeTrickCard('p1', makeCard('hearts', 'A'), 1)],
    };
    const state = makeGameState(4, players, null, 'clubs', currentTrick);
    const cardId = decidePlay(state, 'p0');
    const allIds = p0Hand.map(c => c.id);
    expect(allIds).toContain(cardId);
  });
});
