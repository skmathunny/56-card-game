import { GameState } from '../models/GameState';
import { Card, Suit, RANK_ORDER } from '../models/Card';
import { PlaceBidInput } from '../engine/BiddingEngine';
import { lowestLegalCard } from '../engine/TrickEngine';

// Evaluate hand strength for bidding (higher = stronger hand)
function evaluateHand(hand: Card[], trump: Suit): number {
  return hand.reduce((score, card) => {
    if (card.rank === 'J') return score + 8;
    if (card.rank === '9') return score + 5;
    if (card.rank === 'A') return score + 3;
    if (card.rank === '10') return score + 2;
    return score;
  }, 0) + (hand.filter(c => c.suit === trump).length > 2 ? 3 : 0);
}

function bestTrumpSuit(hand: Card[]): Suit {
  const suits: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs'];
  return suits.reduce((best, suit) => {
    const suitScore = hand
      .filter(c => c.suit === suit)
      .reduce((s, c) => s + (c.rank === 'J' ? 8 : c.rank === '9' ? 5 : c.rank === 'A' ? 3 : 0), 0);
    const bestScore = hand
      .filter(c => c.suit === best)
      .reduce((s, c) => s + (c.rank === 'J' ? 8 : c.rank === '9' ? 5 : c.rank === 'A' ? 3 : 0), 0);
    return suitScore > bestScore ? suit : best;
  }, suits[0]);
}

export function decideBid(state: GameState, playerId: string): PlaceBidInput {
  const player = state.players.find(p => p.id === playerId)!;
  const trump = bestTrumpSuit(player.hand);
  const strength = evaluateHand(player.hand, trump);
  const currentAmount = state.biddingState.currentHighBid?.amount ?? 27;

  // Bid based on hand strength relative to current high bid
  const bidAmount = 28 + Math.floor(strength / 2);

  if (bidAmount <= currentAmount) {
    return { playerId, type: 'pass' };
  }

  return {
    playerId,
    type: 'bid',
    amount: Math.min(bidAmount, 56),
    trump,
  };
}

export function decidePlay(state: GameState, playerId: string): string {
  const player = state.players.find(p => p.id === playerId)!;
  const trick = state.currentTrick!;
  const ledSuit = trick.ledSuit;

  // If partner is currently winning, play lowest legal card to preserve partner's win
  const partnerWinning = isPartnerWinning(state, playerId);
  if (partnerWinning) {
    return lowestLegalCard(player.hand, ledSuit).id;
  }

  // Try to win the trick with the lowest winning card
  const winningCard = findLowestWinningCard(player.hand, trick);
  if (winningCard) return winningCard.id;

  // Cannot win — play lowest value card
  return lowestLegalCard(player.hand, ledSuit).id;
}

function isPartnerWinning(state: GameState, playerId: string): boolean {
  if (!state.currentTrick || state.currentTrick.cards.length === 0) return false;

  const player = state.players.find(p => p.id === playerId)!;
  const trick = state.currentTrick;

  // Find current leading card
  const trump = state.trump ?? 'no-trumps';
  const leading = trick.cards.reduce((best, tc) => {
    const challenger = tc.card;
    const current = best.card;
    const challengerTrump = trump !== 'no-trumps' && challenger.suit === trump;
    const currentTrump = trump !== 'no-trumps' && current.suit === trump;
    if (challengerTrump && !currentTrump) return tc;
    if (!challengerTrump && currentTrump) return best;
    if (challenger.suit === current.suit) {
      return RANK_ORDER.indexOf(challenger.rank) > RANK_ORDER.indexOf(current.rank) ? tc : best;
    }
    return best;
  });

  const leadingPlayer = state.players.find(p => p.id === leading.playerId);
  return leadingPlayer?.teamId === player.teamId;
}

function findLowestWinningCard(hand: Card[], trick: NonNullable<GameState['currentTrick']>): Card | null {
  if (!trick) return null;
  const ledSuit = trick.ledSuit;
  const legalCards = ledSuit
    ? hand.filter(c => c.suit === ledSuit).length > 0
      ? hand.filter(c => c.suit === ledSuit)
      : hand
    : hand;

  // Find cards that could beat the current best in the trick
  // Simple heuristic: play highest rank card of led suit if available
  const ledSuitCards = legalCards.filter(c => c.suit === ledSuit);
  if (ledSuitCards.length > 0) {
    const highCards = ledSuitCards.filter(c => ['J', '9', 'A'].includes(c.rank));
    if (highCards.length > 0) {
      return highCards.reduce((best, c) =>
        RANK_ORDER.indexOf(c.rank) > RANK_ORDER.indexOf(best.rank) ? c : best
      );
    }
  }

  return null;
}
