import { Card, Suit } from './Card';

export interface TrickCard {
  playerId: string;
  card: Card;
  playOrder: number;
}

export interface Trick {
  id: number;
  ledSuit: Suit | null;
  cards: TrickCard[];
  winnerId: string | null;
  points: number;
}
