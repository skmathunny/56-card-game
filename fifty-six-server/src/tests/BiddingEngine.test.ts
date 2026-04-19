import { describe, it, expect } from 'vitest';
import { createBiddingState, validateBid, applyBid, resolveWinningBid } from '../engine/BiddingEngine';

// ── helpers ────────────────────────────────────────────────────────────────

function fresh(startSeat = 0) { return createBiddingState(startSeat); }
function bid(amount: number, seat: number, pc: number, trump = 'spades') {
  return { state: applyBid(fresh(), { playerId: `p${seat}`, type: 'bid' as const, amount, trump: trump as any }, seat, pc) };
}

// ── 4-player: bid range 14–28 ──────────────────────────────────────────────

describe('validateBid — 4-player bid range', () => {
  it('accepts minimum bid of 14', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'bid', amount: 14, trump: 'spades' }, 0, 4)).toBeNull();
  });

  it('accepts maximum bid of 28', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'bid', amount: 28, trump: 'spades' }, 0, 4)).toBeNull();
  });

  it('rejects bid of 13 (below minimum)', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'bid', amount: 13, trump: 'spades' }, 0, 4)).toBe('BID_OUT_OF_RANGE');
  });

  it('rejects bid of 29 (above maximum for 4p)', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'bid', amount: 29, trump: 'spades' }, 0, 4)).toBe('BID_OUT_OF_RANGE');
  });
});

// ── 6-player: bid range 28–56 ─────────────────────────────────────────────

describe('validateBid — 6-player bid range', () => {
  it('accepts minimum bid of 28', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'bid', amount: 28, trump: 'spades' }, 0, 6)).toBeNull();
  });

  it('accepts maximum bid of 56', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'bid', amount: 56, trump: 'spades' }, 0, 6)).toBeNull();
  });

  it('rejects bid of 27 (below minimum for 6p)', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'bid', amount: 27, trump: 'spades' }, 0, 6)).toBe('BID_OUT_OF_RANGE');
  });

  it('rejects bid of 57 (above maximum)', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'bid', amount: 57, trump: 'spades' }, 0, 6)).toBe('BID_OUT_OF_RANGE');
  });
});

// ── turn enforcement ───────────────────────────────────────────────────────

describe('validateBid — turn enforcement', () => {
  it('rejects bid from wrong seat', () => {
    expect(validateBid(fresh(), { playerId: 'p1', type: 'bid', amount: 14, trump: 'spades' }, 1, 4)).toBe('NOT_YOUR_TURN');
  });

  it('accepts bid from correct seat', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'bid', amount: 14, trump: 'spades' }, 0, 4)).toBeNull();
  });
});

// ── must raise ─────────────────────────────────────────────────────────────

describe('validateBid — raise requirement', () => {
  it('rejects equal bid amount', () => {
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 16, trump: 'spades' }, 0, 4);
    expect(validateBid(state, { playerId: 'p3', type: 'bid', amount: 16, trump: 'hearts' }, 3, 4)).toBe('BID_TOO_LOW');
  });

  it('rejects lower bid', () => {
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 20, trump: 'spades' }, 0, 4);
    expect(validateBid(state, { playerId: 'p3', type: 'bid', amount: 18, trump: 'hearts' }, 3, 4)).toBe('BID_TOO_LOW');
  });

  it('accepts raise by 1', () => {
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 16, trump: 'spades' }, 0, 4);
    expect(validateBid(state, { playerId: 'p3', type: 'bid', amount: 17, trump: 'hearts' }, 3, 4)).toBeNull();
  });
});

// ── double / redouble ──────────────────────────────────────────────────────

describe('validateBid — double / redouble', () => {
  it('rejects double with no bid on table', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'double' }, 0, 4)).toBe('CANNOT_DOUBLE');
  });

  it('allows double after a bid', () => {
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 16, trump: 'spades' }, 0, 4);
    expect(validateBid(state, { playerId: 'p3', type: 'double' }, 3, 4)).toBeNull();
  });

  it('rejects redouble before a double', () => {
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 16, trump: 'spades' }, 0, 4);
    expect(validateBid(state, { playerId: 'p3', type: 'redouble' }, 3, 4)).toBe('CANNOT_REDOUBLE');
  });

  it('allows redouble after a double', () => {
    // seat 0 bids → next is seat 3 → seat 3 doubles → next is seat 2
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 16, trump: 'spades' }, 0, 4);
    state = applyBid(state, { playerId: 'p3', type: 'double' }, 3, 4);
    expect(validateBid(state, { playerId: 'p2', type: 'redouble' }, 2, 4)).toBeNull();
  });
});

// ── bidding completion ─────────────────────────────────────────────────────

describe('applyBid — bidding completion (4-player)', () => {
  it('ends after 3 consecutive passes following a bid', () => {
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 14, trump: 'spades' }, 0, 4);
    state = applyBid(state, { playerId: 'p3', type: 'pass' }, 3, 4);
    state = applyBid(state, { playerId: 'p2', type: 'pass' }, 2, 4);
    state = applyBid(state, { playerId: 'p1', type: 'pass' }, 1, 4);
    expect(state.isComplete).toBe(true);
  });

  it('does NOT end after only 2 passes following a bid', () => {
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 14, trump: 'spades' }, 0, 4);
    state = applyBid(state, { playerId: 'p3', type: 'pass' }, 3, 4);
    state = applyBid(state, { playerId: 'p2', type: 'pass' }, 2, 4);
    expect(state.isComplete).toBe(false);
  });

  it('ends after 3 consecutive passes following a double', () => {
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 14, trump: 'spades' }, 0, 4);
    state = applyBid(state, { playerId: 'p3', type: 'double' }, 3, 4);
    state = applyBid(state, { playerId: 'p2', type: 'pass' }, 2, 4);
    state = applyBid(state, { playerId: 'p1', type: 'pass' }, 1, 4);
    state = applyBid(state, { playerId: 'p0', type: 'pass' }, 0, 4);
    expect(state.isComplete).toBe(true);
    expect(state.currentHighBid?.type).toBe('double');
  });

  it('does NOT end after only 2 passes following a double', () => {
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 14, trump: 'spades' }, 0, 4);
    state = applyBid(state, { playerId: 'p3', type: 'double' }, 3, 4);
    state = applyBid(state, { playerId: 'p2', type: 'pass' }, 2, 4);
    state = applyBid(state, { playerId: 'p1', type: 'pass' }, 1, 4);
    expect(state.isComplete).toBe(false);
  });

  it('advances bidder anticlockwise', () => {
    let state = createBiddingState(3);
    state = applyBid(state, { playerId: 'p3', type: 'pass' }, 3, 4);
    expect(state.currentBidderSeatIndex).toBe(2);
  });

  it('wraps seat index from 0 to max seat', () => {
    let state = fresh(0);
    state = applyBid(state, { playerId: 'p0', type: 'pass' }, 0, 4);
    expect(state.currentBidderSeatIndex).toBe(3);
  });
});

// ── resolveWinningBid ──────────────────────────────────────────────────────

describe('resolveWinningBid', () => {
  it('returns current high bid when present', () => {
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 20, trump: 'hearts' }, 0, 4);
    const winning = resolveWinningBid(state, 'p0', 4);
    expect(winning.amount).toBe(20);
    expect(winning.trump).toBe('hearts');
  });

  it('returns double bid with correct amount and trump', () => {
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 16, trump: 'spades' }, 0, 4);
    state = applyBid(state, { playerId: 'p3', type: 'double' }, 3, 4);
    // Pass until bidding completes
    state = applyBid(state, { playerId: 'p2', type: 'pass' }, 2, 4);
    state = applyBid(state, { playerId: 'p1', type: 'pass' }, 1, 4);
    state = applyBid(state, { playerId: 'p0', type: 'pass' }, 0, 4);
    const winning = resolveWinningBid(state, 'p0', 4);
    expect(winning.type).toBe('double');
    expect(winning.amount).toBe(16);
    expect(winning.trump).toBe('spades');
  });

  it('forced minimum is 14 for 4-player all-pass', () => {
    let state = fresh();
    for (const seat of [0, 3, 2, 1]) {
      state = applyBid(state, { playerId: `p${seat}`, type: 'pass' }, seat, 4);
    }
    const winning = resolveWinningBid(state, 'dealer', 4);
    expect(winning.amount).toBe(14);
    expect(winning.playerId).toBe('dealer');
    expect(winning.trump).toBe('no-trumps');
  });

  it('forced minimum is 28 for 6-player all-pass', () => {
    let state = fresh();
    for (const seat of [0, 5, 4, 3, 2, 1]) {
      state = applyBid(state, { playerId: `p${seat}`, type: 'pass' }, seat, 6);
    }
    const winning = resolveWinningBid(state, 'dealer', 6);
    expect(winning.amount).toBe(28);
  });

  it('forced minimum is 28 for 8-player all-pass', () => {
    let state = fresh();
    for (const seat of [0, 7, 6, 5, 4, 3, 2, 1]) {
      state = applyBid(state, { playerId: `p${seat}`, type: 'pass' }, seat, 8);
    }
    const winning = resolveWinningBid(state, 'dealer', 8);
    expect(winning.amount).toBe(28);
    expect(winning.trump).toBe('no-trumps');
  });
});

// ── 8-player: bid range 28–56 ─────────────────────────────────────────────

describe('validateBid — 8-player bid range', () => {
  it('accepts minimum bid of 28', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'bid', amount: 28, trump: 'spades' }, 0, 8)).toBeNull();
  });

  it('accepts maximum bid of 56', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'bid', amount: 56, trump: 'spades' }, 0, 8)).toBeNull();
  });

  it('rejects bid of 27 (below minimum for 8p)', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'bid', amount: 27, trump: 'spades' }, 0, 8)).toBe('BID_OUT_OF_RANGE');
  });

  it('rejects bid of 57 (above maximum)', () => {
    expect(validateBid(fresh(), { playerId: 'p0', type: 'bid', amount: 57, trump: 'spades' }, 0, 8)).toBe('BID_OUT_OF_RANGE');
  });
});

// ── bidding completion (6-player) ─────────────────────────────────────────

describe('applyBid — bidding completion (6-player)', () => {
  it('ends after 5 consecutive passes following a bid', () => {
    // anticlockwise from seat 0: 0 → 5 → 4 → 3 → 2 → 1
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 28, trump: 'spades' }, 0, 6);
    for (const seat of [5, 4, 3, 2, 1]) {
      state = applyBid(state, { playerId: `p${seat}`, type: 'pass' }, seat, 6);
    }
    expect(state.isComplete).toBe(true);
  });

  it('does NOT end after only 4 passes following a bid', () => {
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 28, trump: 'spades' }, 0, 6);
    for (const seat of [5, 4, 3, 2]) {
      state = applyBid(state, { playerId: `p${seat}`, type: 'pass' }, seat, 6);
    }
    expect(state.isComplete).toBe(false);
  });

  it('ends after all 6 pass (no bid placed)', () => {
    let state = fresh();
    for (const seat of [0, 5, 4, 3, 2, 1]) {
      state = applyBid(state, { playerId: `p${seat}`, type: 'pass' }, seat, 6);
    }
    expect(state.isComplete).toBe(true);
  });
});

// ── bidding completion (8-player) ─────────────────────────────────────────

describe('applyBid — bidding completion (8-player)', () => {
  it('ends after 7 consecutive passes following a bid', () => {
    // anticlockwise from seat 0: 0 → 7 → 6 → 5 → 4 → 3 → 2 → 1
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 28, trump: 'spades' }, 0, 8);
    for (const seat of [7, 6, 5, 4, 3, 2, 1]) {
      state = applyBid(state, { playerId: `p${seat}`, type: 'pass' }, seat, 8);
    }
    expect(state.isComplete).toBe(true);
  });

  it('does NOT end after only 6 passes following a bid', () => {
    let state = fresh();
    state = applyBid(state, { playerId: 'p0', type: 'bid', amount: 28, trump: 'spades' }, 0, 8);
    for (const seat of [7, 6, 5, 4, 3, 2]) {
      state = applyBid(state, { playerId: `p${seat}`, type: 'pass' }, seat, 8);
    }
    expect(state.isComplete).toBe(false);
  });

  it('ends after all 8 pass (no bid placed)', () => {
    let state = fresh();
    for (const seat of [0, 7, 6, 5, 4, 3, 2, 1]) {
      state = applyBid(state, { playerId: `p${seat}`, type: 'pass' }, seat, 8);
    }
    expect(state.isComplete).toBe(true);
  });
});
