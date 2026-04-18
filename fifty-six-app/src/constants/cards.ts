export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';
export type Rank = '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';
export type TrumpSuit = Suit | 'no-trumps';

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
  pointValue: number;
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

export const SUIT_COLORS: Record<Suit, string> = {
  spades: '#1a1a2e',
  hearts: '#e63946',
  diamonds: '#e63946',
  clubs: '#1a1a2e',
};

export const RANK_ORDER: Rank[] = ['7', '8', 'Q', 'K', '10', 'A', '9', 'J'];
