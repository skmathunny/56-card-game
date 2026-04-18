export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type TrumpSuit = Suit | 'no-trumps';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  pointValue: number;
}

// Higher index = stronger card
export const RANK_ORDER: Rank[] = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J'];

const POINT_VALUES: Record<Rank, number> = {
  'J': 3, '9': 2, 'A': 1, '10': 1,
  'K': 0, 'Q': 0, '8': 0, '7': 0,
};

export function makeCard(suit: Suit, rank: Rank): Card {
  return {
    id: `${rank}_${suit}`,
    suit,
    rank,
    pointValue: POINT_VALUES[rank],
  };
}

export function rankStrength(rank: Rank): number {
  return RANK_ORDER.indexOf(rank);
}
