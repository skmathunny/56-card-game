import { Card, Rank, Suit, makeCard } from './Card';

const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
// 4/6-player: 6 ranks → 7 pts/suit × 4 suits = 28 per deck
const RANKS_6: Rank[] = ['9', '10', 'J', 'Q', 'K', 'A'];
// 8-player: 8 ranks (adds 7 and 8, both 0 pts) → still 28 per deck, 56 with 2 decks
const RANKS_8: Rank[] = ['7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export function buildDeck(playerCount: 4 | 6 | 8): Card[] {
  const ranks = playerCount === 8 ? RANKS_8 : RANKS_6;
  const deck1 = SUITS.flatMap(suit => ranks.map(rank => makeCard(suit, rank)));
  if (playerCount === 4) return deck1;
  // 6 and 8-player: 2 decks (56 total points), second copy gets distinct IDs
  const deck2 = SUITS.flatMap(suit => ranks.map(rank => ({ ...makeCard(suit, rank), id: `${rank}_${suit}_2` })));
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
