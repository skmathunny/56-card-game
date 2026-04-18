import { Card, Rank, Suit, makeCard } from './Card';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];

// Ranks included per player count
const RANKS_4_6: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];
const RANKS_8: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function buildDeck(playerCount: 4 | 6 | 8): Card[] {
  const ranks = playerCount === 8 ? RANKS_8 : RANKS_4_6;
  return SUITS.flatMap(suit => ranks.map(rank => makeCard(suit, rank)));
}

export function shuffle(deck: Card[]): Card[] {
  const cards = [...deck];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
