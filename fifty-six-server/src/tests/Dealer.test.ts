import { describe, it, expect } from 'vitest';
import { dealHands, firstBidderSeatIndex, nextAnticlockwise } from '../engine/Dealer';
import { Player } from '../models/Player';

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`, userId: null, displayName: `Player${i}`, avatarUrl: '',
    seatIndex: i, teamId: (i % 2 === 0 ? 'A' : 'B') as 'A' | 'B',
    isAI: false, isConnected: true, isHost: i === 0, hand: [],
  }));
}

// ── dealHands ──────────────────────────────────────────────────────────────

describe('dealHands', () => {
  it('4-player: each player gets 6 cards', () => {
    const players = makePlayers(4);
    const hands = dealHands(4, players);
    players.forEach(p => expect(hands[p.id]).toHaveLength(6));
  });

  it('6-player: each player gets 8 cards', () => {
    const players = makePlayers(6);
    const hands = dealHands(6, players);
    players.forEach(p => expect(hands[p.id]).toHaveLength(8));
  });

  it('8-player: each player gets 6 cards', () => {
    const players = makePlayers(8);
    const hands = dealHands(8, players);
    players.forEach(p => expect(hands[p.id]).toHaveLength(6));
  });

  it('4-player: all 24 card IDs are unique across all hands', () => {
    const players = makePlayers(4);
    const hands = dealHands(4, players);
    const allIds = players.flatMap(p => hands[p.id].map(c => c.id));
    expect(new Set(allIds).size).toBe(24);
  });

  it('6-player: all 48 card IDs are unique across all hands', () => {
    const players = makePlayers(6);
    const hands = dealHands(6, players);
    const allIds = players.flatMap(p => hands[p.id].map(c => c.id));
    expect(new Set(allIds).size).toBe(48);
  });

  it('produces different deals on separate calls (shuffle is random)', () => {
    const players = makePlayers(4);
    const deal1 = dealHands(4, players);
    const deal2 = dealHands(4, players);
    const ids1 = players.flatMap(p => deal1[p.id].map(c => c.id)).join(',');
    const ids2 = players.flatMap(p => deal2[p.id].map(c => c.id)).join(',');
    // Probability of identical deals is astronomically low
    expect(ids1).not.toBe(ids2);
  });
});

// ── firstBidderSeatIndex ───────────────────────────────────────────────────

describe('firstBidderSeatIndex', () => {
  it('dealer=0 in 4p → first bidder is seat 3', () => {
    expect(firstBidderSeatIndex(0, 4)).toBe(3);
  });

  it('dealer=3 in 4p → first bidder is seat 2', () => {
    expect(firstBidderSeatIndex(3, 4)).toBe(2);
  });

  it('dealer=1 in 4p → first bidder is seat 0', () => {
    expect(firstBidderSeatIndex(1, 4)).toBe(0);
  });

  it('dealer=0 in 6p → first bidder is seat 5', () => {
    expect(firstBidderSeatIndex(0, 6)).toBe(5);
  });

  it('dealer=5 in 6p → first bidder is seat 4', () => {
    expect(firstBidderSeatIndex(5, 6)).toBe(4);
  });
});

// ── nextAnticlockwise ──────────────────────────────────────────────────────

describe('nextAnticlockwise', () => {
  it('seat 2 → seat 1 in 4p', () => {
    expect(nextAnticlockwise(2, 4)).toBe(1);
  });

  it('seat 0 → seat 3 in 4p (wraps)', () => {
    expect(nextAnticlockwise(0, 4)).toBe(3);
  });

  it('seat 1 → seat 0 in 6p', () => {
    expect(nextAnticlockwise(1, 6)).toBe(0);
  });

  it('seat 0 → seat 5 in 6p (wraps)', () => {
    expect(nextAnticlockwise(0, 6)).toBe(5);
  });

  it('seat 0 → seat 7 in 8p (wraps)', () => {
    expect(nextAnticlockwise(0, 8)).toBe(7);
  });
});
