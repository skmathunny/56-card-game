import { Player, Team } from './Player';
import { Bid, BiddingState } from './Bid';
import { Trick } from './Trick';
import { TrumpSuit } from './Card';

export type GamePhase = 'dealing' | 'bidding' | 'playing' | 'scoring' | 'complete';

export interface GameState {
  id: string;
  roomId: string;
  playerCount: 4 | 6 | 8;
  roundNumber: number;
  phase: GamePhase;
  players: Player[];
  teams: { A: Team; B: Team };
  dealerSeatIndex: number;
  currentPlayerSeatIndex: number;
  biddingState: BiddingState;
  winningBid: Bid | null;
  trump: TrumpSuit | null;
  tricks: Trick[];
  currentTrick: Trick | null;
  winner: 'A' | 'B' | null;
}
