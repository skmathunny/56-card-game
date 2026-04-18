import { v4 as uuid } from 'uuid';
import { Bid, BidType, BiddingState } from '../models/Bid';
import { TrumpSuit } from '../models/Card';
import { nextAnticlockwise } from './Dealer';

const MIN_BID = 28;
const MAX_BID = 56;
const DEFAULT_CONVENTION = 'number-first';

export interface PlaceBidInput {
  playerId: string;
  type: BidType;
  amount?: number;
  trump?: TrumpSuit;
}

export type BidError =
  | 'NOT_YOUR_TURN'
  | 'BID_TOO_LOW'
  | 'BID_OUT_OF_RANGE'
  | 'CANNOT_DOUBLE'
  | 'CANNOT_REDOUBLE'
  | 'BIDDING_COMPLETE';

export function createBiddingState(firstBidderSeatIndex: number): BiddingState {
  return {
    bids: [],
    currentBidderSeatIndex: firstBidderSeatIndex,
    currentHighBid: null,
    consecutivePasses: 0,
    isComplete: false,
  };
}

export function validateBid(
  state: BiddingState,
  input: PlaceBidInput,
  playerSeatIndex: number,
  playerCount: number,
): BidError | null {
  if (state.isComplete) return 'BIDDING_COMPLETE';
  if (state.currentBidderSeatIndex !== playerSeatIndex) return 'NOT_YOUR_TURN';

  if (input.type === 'bid') {
    const amount = input.amount ?? 0;
    if (amount < MIN_BID || amount > MAX_BID) return 'BID_OUT_OF_RANGE';
    if (state.currentHighBid && state.currentHighBid.amount !== null && amount <= state.currentHighBid.amount) {
      return 'BID_TOO_LOW';
    }
  }

  if (input.type === 'double') {
    if (!state.currentHighBid || state.currentHighBid.type !== 'bid') return 'CANNOT_DOUBLE';
  }

  if (input.type === 'redouble') {
    if (!state.currentHighBid || state.currentHighBid.type !== 'double') return 'CANNOT_REDOUBLE';
  }

  return null;
}

export function applyBid(
  state: BiddingState,
  input: PlaceBidInput,
  playerSeatIndex: number,
  playerCount: number,
): BiddingState {
  const bid: Bid = {
    id: uuid(),
    playerId: input.playerId,
    amount: input.amount ?? null,
    trump: input.trump ?? null,
    type: input.type,
    conventionId: DEFAULT_CONVENTION,
    timestamp: Date.now(),
  };

  const bids = [...state.bids, bid];
  const isPass = input.type === 'pass';
  const consecutivePasses = isPass ? state.consecutivePasses + 1 : 0;
  const currentHighBid = input.type === 'bid' || input.type === 'double' || input.type === 'redouble'
    ? bid
    : state.currentHighBid;

  // With a bid on the table: end after N-1 consecutive passes.
  // All-pass (no bid yet): need all N players to pass before forcing minimum.
  const isComplete = currentHighBid
    ? consecutivePasses >= playerCount - 1
    : consecutivePasses >= playerCount;

  return {
    bids,
    currentBidderSeatIndex: nextAnticlockwise(playerSeatIndex, playerCount),
    currentHighBid,
    consecutivePasses,
    isComplete,
  };
}

// Returns the winning bid, falling back to a forced minimum if all passed.
// forcedPlayerId should be the dealer's player ID; trump defaults to no-trumps.
export function resolveWinningBid(state: BiddingState, forcedPlayerId: string): Bid {
  if (state.currentHighBid) return state.currentHighBid;

  return {
    id: uuid(),
    playerId: forcedPlayerId,
    amount: MIN_BID,
    trump: 'no-trumps',
    type: 'bid',
    conventionId: DEFAULT_CONVENTION,
    timestamp: Date.now(),
  };
}
