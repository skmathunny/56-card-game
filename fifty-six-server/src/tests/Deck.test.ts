import { describe, it, expect } from 'vitest';
import { buildDeck, shuffle } from '../models/Deck';

describe('buildDeck — 4-player (1 deck)', () => {
  it('produces 24 cards', () => expect(buildDeck(4)).toHaveLength(24));

  it('contains only ranks 9 10 J Q K A', () => {
    const ranks = new Set(buildDeck(4).map(c => c.rank));
    expect([...ranks].sort()).toEqual(['10', '9', 'A', 'J', 'K', 'Q'].sort());
  });

  it('all 24 card IDs are unique', () => {
    const ids = buildDeck(4).map(c => c.id);
    expect(new Set(ids).size).toBe(24);
  });

  it('total point value is 28', () => {
    const total = buildDeck(4).reduce((s, c) => s + c.pointValue, 0);
    expect(total).toBe(28);
  });

  it('assigns correct point values: J=3 9=2 A=1 10=1 K=0 Q=0', () => {
    const deck = buildDeck(4);
    const pick = (rank: string) => deck.find(c => c.rank === rank)!;
    expect(pick('J').pointValue).toBe(3);
    expect(pick('9').pointValue).toBe(2);
    expect(pick('A').pointValue).toBe(1);
    expect(pick('10').pointValue).toBe(1);
    expect(pick('K').pointValue).toBe(0);
    expect(pick('Q').pointValue).toBe(0);
  });
});

describe('buildDeck — 6-player (2 decks)', () => {
  it('produces 48 cards', () => expect(buildDeck(6)).toHaveLength(48));

  it('all 48 card IDs are unique (second copy uses _2 suffix)', () => {
    const ids = buildDeck(6).map(c => c.id);
    expect(new Set(ids).size).toBe(48);
  });

  it('total point value is 56', () => {
    const total = buildDeck(6).reduce((s, c) => s + c.pointValue, 0);
    expect(total).toBe(56);
  });

  it('contains exactly 2 copies of each suit+rank pair', () => {
    const deck = buildDeck(6);
    const count = (rank: string, suit: string) =>
      deck.filter(c => c.rank === rank && c.suit === suit).length;
    expect(count('J', 'spades')).toBe(2);
    expect(count('9', 'hearts')).toBe(2);
  });
});

describe('buildDeck — 8-player (2 decks, 8 ranks)', () => {
  it('produces 64 cards (8 ranks × 4 suits × 2 decks)', () => {
    expect(buildDeck(8)).toHaveLength(64);
  });

  it('contains ranks 7 and 8 in addition to the standard 6', () => {
    const ranks = new Set(buildDeck(8).map(c => c.rank));
    expect(ranks.has('7')).toBe(true);
    expect(ranks.has('8')).toBe(true);
    expect([...ranks].sort()).toEqual(['10', '7', '8', '9', 'A', 'J', 'K', 'Q'].sort());
  });

  it('all 64 card IDs are unique (second copy uses _2 suffix)', () => {
    const ids = buildDeck(8).map(c => c.id);
    expect(new Set(ids).size).toBe(64);
  });

  it('total point value is 56 (7 and 8 are worth 0 pts)', () => {
    const total = buildDeck(8).reduce((s, c) => s + c.pointValue, 0);
    expect(total).toBe(56);
  });

  it('contains exactly 2 copies of each suit+rank pair', () => {
    const deck = buildDeck(8);
    const count = (rank: string, suit: string) =>
      deck.filter(c => c.rank === rank && c.suit === suit).length;
    expect(count('7', 'spades')).toBe(2);
    expect(count('8', 'hearts')).toBe(2);
    expect(count('J', 'clubs')).toBe(2);
  });
});

describe('shuffle', () => {
  it('returns same number of cards', () => {
    const deck = buildDeck(4);
    expect(shuffle(deck)).toHaveLength(24);
  });

  it('does not mutate the input array', () => {
    const deck = buildDeck(4);
    const original = [...deck];
    shuffle(deck);
    expect(deck).toEqual(original);
  });

  it('contains the same cards after shuffling', () => {
    const deck = buildDeck(4);
    const shuffled = shuffle(deck);
    expect(shuffled.map(c => c.id).sort()).toEqual(deck.map(c => c.id).sort());
  });
});
