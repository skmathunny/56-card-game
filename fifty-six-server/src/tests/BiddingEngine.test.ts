import { describe, it, expect } from 'vitest';
import { createBiddingState, validateBid, applyBid, resolveWinningBid } from '../engine/BiddingEngine';

const playerCount = 4;

describe('validateBid', () => {
  it('rejects bid when not your turn', () => {
    const state = createBiddingState(0);
    const error = validateBid(state, { playerId: 'p1', type: 'bid', amount: 28, trump: 'spades' }, 1, playerCount);
    expect(error).toBe('NOT_YOUR_TURN');
  });

  it('accepts minimum bid of 28', () => {
    const state = createBiddingState(0);
    const error = validateBid(state, { playerId: 'p0', type: 'bid', amount: 28, trump: 'hearts' }, 0, playerCount);
    expect(error).toBeNull();
  });

  it('rejects bid below current high bid', () => {
    let state = createBiddingState(0);
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 32, trump: 'spades' }, 0, playerCount);
    const error = validateBid(state, { playerId: 'p3', type: 'bid', amount: 30, trump: 'hearts' }, 3, playerCount);
    expect(error).toBe('BID_TOO_LOW');
  });

  it('rejects bid below minimum 28', () => {
    const state = createBiddingState(0);
    const error = validateBid(state, { playerId: 'p0', type: 'bid', amount: 20, trump: 'spades' }, 0, playerCount);
    expect(error).toBe('BID_OUT_OF_RANGE');
  });

  it('rejects bid above maximum 56', () => {
    const state = createBiddingState(0);
    const error = validateBid(state, { playerId: 'p0', type: 'bid', amount: 60, trump: 'spades' }, 0, playerCount);
    expect(error).toBe('BID_OUT_OF_RANGE');
  });

  it('rejects double when no current bid', () => {
    const state = createBiddingState(0);
    const error = validateBid(state, { playerId: 'p0', type: 'double' }, 0, playerCount);
    expect(error).toBe('CANNOT_DOUBLE');
  });

  it('rejects redouble when not doubled', () => {
    let state = createBiddingState(0);
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 28, trump: 'spades' }, 0, playerCount);
    const error = validateBid(state, { playerId: 'p3', type: 'redouble' }, 3, playerCount);
    expect(error).toBe('CANNOT_REDOUBLE');
  });
});

describe('applyBid — bidding completion', () => {
  it('completes bidding after 3 consecutive passes following a bid', () => {
    let state = createBiddingState(0);
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 28, trump: 'spades' }, 0, playerCount);
    state = applyBid(state, { playerId: 'p3', type: 'pass' }, 3, playerCount);
    state = applyBid(state, { playerId: 'p2', type: 'pass' }, 2, playerCount);
    state = applyBid(state, { playerId: 'p1', type: 'pass' }, 1, playerCount);
    expect(state.isComplete).toBe(true);
  });

  it('advances bidder anticlockwise', () => {
    let state = createBiddingState(3);
    state = applyBid(state, { playerId: 'p3', type: 'pass' }, 3, playerCount);
    expect(state.currentBidderSeatIndex).toBe(2);
  });
});

describe('resolveWinningBid', () => {
  it('returns current high bid when present', () => {
    let state = createBiddingState(0);
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 32, trump: 'hearts' }, 0, playerCount);
    const winning = resolveWinningBid(state, 'p0');
    expect(winning.amount).toBe(32);
    expect(winning.trump).toBe('hearts');
  });

  it('returns forced minimum bid when all passed', () => {
    let state = createBiddingState(0);
    state = applyBid(state, { playerId: 'p0', type: 'pass' }, 0, playerCount);
    state = applyBid(state, { playerId: 'p3', type: 'pass' }, 3, playerCount);
    state = applyBid(state, { playerId: 'p2', type: 'pass' }, 2, playerCount);
    state = applyBid(state, { playerId: 'p1', type: 'pass' }, 1, playerCount);
    const winning = resolveWinningBid(state, 'p0');
    expect(winning.amount).toBe(28);
  });
});
