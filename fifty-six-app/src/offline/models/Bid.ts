import { TrumpSuit } from './Card';

export type BidType = 'bid' | 'pass' | 'double' | 'redouble';

export interface Bid {
  id: string;
  playerId: string;
  amount: number | null;
  trump: TrumpSuit | null;
  type: BidType;
  conventionId: string;
  timestamp: number;
}

export interface BiddingState {
  bids: Bid[];
  currentBidderSeatIndex: number;
  currentHighBid: Bid | null;
  consecutivePasses: number;
  isComplete: boolean;
}
