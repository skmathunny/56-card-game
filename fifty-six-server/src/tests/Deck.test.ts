import { describe, it, expect } from 'vitest';
import { buildDeck, shuffle } from '../models/Deck';

describe('buildDeck', () => {
  it('builds 24 cards for 4-player game', () => {
    expect(buildDeck(4)).toHaveLength(24);
  });

  it('builds 24 cards for 6-player game', () => {
    expect(buildDeck(6)).toHaveLength(24);
  });

  it('builds 32 cards for 8-player game', () => {
    expect(buildDeck(8)).toHaveLength(32);
  });

  it('4-player deck contains no 7s or 8s', () => {
    const deck = buildDeck(4);
    expect(deck.some(c => c.rank === '7' || c.rank === '8')).toBe(false);
  });

  it('8-player deck contains 7s and 8s', () => {
    const deck = buildDeck(8);
    expect(deck.some(c => c.rank === '7')).toBe(true);
    expect(deck.some(c => c.rank === '8')).toBe(true);
  });

  it('assigns correct point values', () => {
    const deck = buildDeck(4);
    const jack = deck.find(c => c.rank === 'J')!;
    const nine = deck.find(c => c.rank === '9')!;
    const ace = deck.find(c => c.rank === 'A')!;
    const ten = deck.find(c => c.rank === '10')!;
    const king = deck.find(c => c.rank === 'K')!;
    expect(jack.pointValue).toBe(3);
    expect(nine.pointValue).toBe(2);
    expect(ace.pointValue).toBe(1);
    expect(ten.pointValue).toBe(1);
    expect(king.pointValue).toBe(0);
  });
});

describe('shuffle', () => {
  it('returns same number of cards', () => {
    const deck = buildDeck(4);
    expect(shuffle(deck)).toHaveLength(deck.length);
  });

  it('does not modify the original deck', () => {
    const deck = buildDeck(4);
    const original = [...deck];
    shuffle(deck);
    expect(deck).toEqual(original);
  });
});
