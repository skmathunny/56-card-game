import { describe, it, expect } from 'vitest';
import { validatePlay, applyPlay, resolveTrick, getLegalCards, lowestLegalCard } from '../engine/TrickEngine';
import { makeCard } from '../models/Card';
import { Player } from '../models/Player';
import { Trick } from '../models/Trick';

function makePlayer(seatIndex: number, hand: ReturnType<typeof makeCard>[]): Player {
  return {
    id: `p${seatIndex}`, userId: null, displayName: 'Test', avatarUrl: '',
    seatIndex, teamId: 'A', isAI: false, isConnected: true, isHost: false, hand,
  };
}

function emptyTrick(): Trick {
  return { id: 1, ledSuit: null, cards: [], winnerId: null, points: 0 };
}

describe('validatePlay', () => {
  it('rejects play when not your turn', () => {
    const player = makePlayer(1, [makeCard('spades', 'A')]);
    const error = validatePlay(emptyTrick(), player, makeCard('spades', 'A'), 0, 4);
    expect(error).toBe('NOT_YOUR_TURN');
  });

  it('rejects card not in hand', () => {
    const player = makePlayer(0, [makeCard('spades', 'K')]);
    const error = validatePlay(emptyTrick(), player, makeCard('hearts', 'A'), 0, 4);
    expect(error).toBe('CARD_NOT_IN_HAND');
  });

  it('rejects off-suit when player can follow', () => {
    const trick: Trick = { id: 1, ledSuit: 'hearts', cards: [], winnerId: null, points: 0 };
    const player = makePlayer(0, [makeCard('hearts', 'A'), makeCard('spades', 'J')]);
    const error = validatePlay(trick, player, makeCard('spades', 'J'), 0, 4);
    expect(error).toBe('MUST_FOLLOW_SUIT');
  });

  it('allows any card when void in led suit', () => {
    const trick: Trick = { id: 1, ledSuit: 'hearts', cards: [], winnerId: null, points: 0 };
    const player = makePlayer(0, [makeCard('spades', 'J')]);
    const error = validatePlay(trick, player, makeCard('spades', 'J'), 0, 4);
    expect(error).toBeNull();
  });
});

describe('resolveTrick', () => {
  it('trump beats led suit', () => {
    let trick = emptyTrick();
    trick = applyPlay(trick, 'p0', makeCard('hearts', 'A'));
    trick = applyPlay(trick, 'p1', makeCard('spades', '7'));
    trick = applyPlay(trick, 'p2', makeCard('hearts', 'K'));
    trick = applyPlay(trick, 'p3', makeCard('hearts', '9'));
    const resolved = resolveTrick(trick, 'spades');
    expect(resolved.winnerId).toBe('p1');
  });

  it('highest card of led suit wins when no trump played', () => {
    let trick = emptyTrick();
    trick = applyPlay(trick, 'p0', makeCard('hearts', 'A'));
    trick = applyPlay(trick, 'p1', makeCard('hearts', 'K'));
    trick = applyPlay(trick, 'p2', makeCard('hearts', 'J'));
    trick = applyPlay(trick, 'p3', makeCard('hearts', '9'));
    const resolved = resolveTrick(trick, 'spades');
    expect(resolved.winnerId).toBe('p2');
  });

  it('Jack beats 9 beats Ace', () => {
    let trick = emptyTrick();
    trick = applyPlay(trick, 'p0', makeCard('hearts', 'J'));
    trick = applyPlay(trick, 'p1', makeCard('hearts', '9'));
    trick = applyPlay(trick, 'p2', makeCard('hearts', 'A'));
    trick = applyPlay(trick, 'p3', makeCard('hearts', '10'));
    const resolved = resolveTrick(trick, 'spades');
    expect(resolved.winnerId).toBe('p0');
  });

  it('calculates trick points correctly', () => {
    let trick = emptyTrick();
    trick = applyPlay(trick, 'p0', makeCard('hearts', 'J'));  // 3pts
    trick = applyPlay(trick, 'p1', makeCard('hearts', '9'));  // 2pts
    trick = applyPlay(trick, 'p2', makeCard('hearts', 'A'));  // 1pt
    trick = applyPlay(trick, 'p3', makeCard('hearts', 'K'));  // 0pts
    const resolved = resolveTrick(trick, 'spades');
    expect(resolved.points).toBe(6);
  });
});

describe('getLegalCards', () => {
  it('returns only led-suit cards when player has them', () => {
    const hand = [makeCard('hearts', 'A'), makeCard('spades', 'J'), makeCard('hearts', 'K')];
    const legal = getLegalCards(hand, 'hearts');
    expect(legal).toHaveLength(2);
    expect(legal.every(c => c.suit === 'hearts')).toBe(true);
  });

  it('returns all cards when void in led suit', () => {
    const hand = [makeCard('spades', 'J'), makeCard('clubs', '9')];
    const legal = getLegalCards(hand, 'hearts');
    expect(legal).toHaveLength(2);
  });
});

describe('lowestLegalCard', () => {
  it('returns lowest point value card', () => {
    const hand = [makeCard('hearts', 'J'), makeCard('hearts', 'K'), makeCard('hearts', '9')];
    const lowest = lowestLegalCard(hand, 'hearts');
    expect(lowest.rank).toBe('K');
  });
});
