import { buildDeck, shuffle } from '../models/Deck';
import { Card } from '../models/Card';
import { Player } from '../models/Player';

export function dealHands(playerCount: 4 | 6 | 8, players: Player[]): Record<string, Card[]> {
  const deck = shuffle(buildDeck(playerCount));
  const cardsPerPlayer = deck.length / playerCount;
  const hands: Record<string, Card[]> = {};

  players.forEach((player, i) => {
    hands[player.id] = deck.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer);
  });

  return hands;
}

// First bidder sits to the right of the dealer (anticlockwise = lower seat index)
export function firstBidderSeatIndex(dealerSeatIndex: number, playerCount: number): number {
  return (dealerSeatIndex - 1 + playerCount) % playerCount;
}

export function nextAnticlockwise(seatIndex: number, playerCount: number): number {
  return (seatIndex - 1 + playerCount) % playerCount;
}
