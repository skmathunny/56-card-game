import { Card, Suit, TrumpSuit, rankStrength } from '../models/Card';
import { Trick, TrickCard } from '../models/Trick';
import { Player } from '../models/Player';

export type PlayError = 'NOT_YOUR_TURN' | 'CARD_NOT_IN_HAND' | 'MUST_FOLLOW_SUIT' | 'TRICK_COMPLETE';

export function validatePlay(
  trick: Trick,
  player: Player,
  card: Card,
  currentPlayerSeatIndex: number,
  playerCount: number,
): PlayError | null {
  if (trick.cards.length === playerCount) return 'TRICK_COMPLETE';
  if (player.seatIndex !== currentPlayerSeatIndex) return 'NOT_YOUR_TURN';
  if (!player.hand.find(c => c.id === card.id)) return 'CARD_NOT_IN_HAND';

  if (trick.ledSuit) {
    const hasLedSuit = player.hand.some(c => c.suit === trick.ledSuit);
    if (hasLedSuit && card.suit !== trick.ledSuit) return 'MUST_FOLLOW_SUIT';
  }

  return null;
}

export function applyPlay(trick: Trick, playerId: string, card: Card): Trick {
  const trickCard: TrickCard = { playerId, card, playOrder: trick.cards.length };
  const ledSuit = trick.ledSuit ?? card.suit;

  return {
    ...trick,
    ledSuit,
    cards: [...trick.cards, trickCard],
  };
}

export function resolveTrick(trick: Trick, trump: TrumpSuit): Trick {
  if (!trick.ledSuit) return trick;

  const winner = trick.cards.reduce((best, current) => {
    if (cardBeats(current.card, best.card, trump)) return current;
    return best;
  });

  const points = trick.cards.reduce((sum, tc) => sum + tc.card.pointValue, 0);

  return { ...trick, winnerId: winner.playerId, points };
}

function cardBeats(challenger: Card, current: Card, trump: TrumpSuit): boolean {
  const challengerIsTrump = trump !== 'no-trumps' && challenger.suit === trump;
  const currentIsTrump = trump !== 'no-trumps' && current.suit === trump;

  if (challengerIsTrump && !currentIsTrump) return true;
  if (!challengerIsTrump && currentIsTrump) return false;

  // Both trump or both non-trump — compare within same suit
  if (challenger.suit !== current.suit) {
    // Challenger not following led suit and not trump — cannot beat
    return false;
  }

  return rankStrength(challenger.rank) > rankStrength(current.rank);
}

export function getLegalCards(hand: Card[], ledSuit: Suit | null): Card[] {
  if (!ledSuit) return hand;
  const suitCards = hand.filter(c => c.suit === ledSuit);
  return suitCards.length > 0 ? suitCards : hand;
}

export function lowestLegalCard(hand: Card[], ledSuit: Suit | null): Card {
  const legal = getLegalCards(hand, ledSuit);
  return legal.reduce((lowest, card) => {
    if (card.pointValue < lowest.pointValue) return card;
    if (card.pointValue === lowest.pointValue && rankStrength(card.rank) < rankStrength(lowest.rank)) return card;
    return lowest;
  });
}
