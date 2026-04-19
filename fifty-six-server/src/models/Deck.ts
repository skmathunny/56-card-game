import { Card, Rank, Suit, makeCard } from './Card';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
// A, K, Q, J, 10, 9 — point values: J=3, 9=2, A=1, 10=1 → 7pts/suit × 4 = 28 per deck
const RANKS: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];

export function buildDeck(playerCount: 4 | 6 | 8): Card[] {
  const deck1 = SUITS.flatMap(suit => RANKS.map(rank => makeCard(suit, rank)));
  if (playerCount === 4) return deck1;
  // 6 and 8-player: 2 decks (56 total points), second copy gets distinct IDs
  const deck2 = SUITS.flatMap(suit => RANKS.map(rank => ({ ...makeCard(suit, rank), id: `${rank}_${suit}_2` })));
  return [...deck1, ...deck2];
}

export function shuffle(deck: Card[]): Card[] {
  const cards = [...deck];
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
