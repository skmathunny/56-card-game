import { describe, it, expect } from 'vitest';
import { scoreRound, applyRoundResult, checkWinner } from '../engine/ScoringEngine';
import { Bid } from '../models/Bid';
import { Team } from '../models/Player';

function makeBid(amount: number, playerId = 'p0', type: Bid['type'] = 'bid'): Bid {
  return { id: '1', playerId, amount, trump: 'spades', type, conventionId: 'number-first', timestamp: 0 };
}

function makeTeams(tablesA: number, tablesB: number, pointsA = 0, pointsB = 0): { A: Team; B: Team } {
  return {
    A: { id: 'A', playerIds: ['p0', 'p2'], tables: tablesA, roundPoints: pointsA },
    B: { id: 'B', playerIds: ['p1', 'p3'], tables: tablesB, roundPoints: pointsB },
  };
}

const players = [
  { id: 'p0', teamId: 'A' as const },
  { id: 'p1', teamId: 'B' as const },
  { id: 'p2', teamId: 'A' as const },
  { id: 'p3', teamId: 'B' as const },
];

describe('scoreRound', () => {
  it('marks as success when bid team meets their bid', () => {
    const result = scoreRound(makeBid(14), makeTeams(12, 12, 16, 0), players);
    expect(result.success).toBe(true);
  });

  it('marks as failure when bid team falls short', () => {
    const result = scoreRound(makeBid(20), makeTeams(12, 12, 15, 0), players);
    expect(result.success).toBe(false);
  });

  it('bid 14–39 results in 1 table change on success', () => {
    const result = scoreRound(makeBid(14), makeTeams(12, 12, 16, 0), players);
    expect(result.tablesChange).toBe(1);
  });

  it('bid 40–47 results in 2 table change on success', () => {
    const result = scoreRound(makeBid(40), makeTeams(12, 12, 42, 0), players);
    expect(result.tablesChange).toBe(2);
  });

  it('bid 48–55 results in 3 table change on success', () => {
    const result = scoreRound(makeBid(48), makeTeams(12, 12, 50, 0), players);
    expect(result.tablesChange).toBe(3);
  });

  it('bid 56 results in 4 table change on success', () => {
    const result = scoreRound(makeBid(56), makeTeams(12, 12, 56, 0), players);
    expect(result.tablesChange).toBe(4);
  });

  it('bid 39 results in 1 table change on success (upper boundary of tier 1)', () => {
    const result = scoreRound(makeBid(39), makeTeams(12, 12, 40, 0), players);
    expect(result.tablesChange).toBe(1);
  });

  it('bid 47 results in 2 table change on success (upper boundary of tier 2)', () => {
    const result = scoreRound(makeBid(47), makeTeams(12, 12, 48, 0), players);
    expect(result.tablesChange).toBe(2);
  });

  it('bid 55 results in 3 table change on success (upper boundary of tier 3)', () => {
    const result = scoreRound(makeBid(55), makeTeams(12, 12, 56, 0), players);
    expect(result.tablesChange).toBe(3);
  });

  it('doubled bid doubles the table change', () => {
    const result = scoreRound(makeBid(14, 'p0', 'double'), makeTeams(12, 12, 16, 0), players);
    expect(result.tablesChange).toBe(2);
  });

  it('redoubled bid multiplies table change by 4', () => {
    const result = scoreRound(makeBid(14, 'p0', 'redouble'), makeTeams(12, 12, 16, 0), players);
    expect(result.tablesChange).toBe(4);
  });

  it('failure table change is negative', () => {
    const result = scoreRound(makeBid(20), makeTeams(12, 12, 15, 0), players);
    expect(result.tablesChange).toBeLessThan(0);
  });

  it('failure on bid 14–39 loses 2 tables (base 1 + 1)', () => {
    const result = scoreRound(makeBid(20), makeTeams(12, 12, 15, 0), players);
    expect(result.tablesChange).toBe(-2);
  });

  it('failure on bid 40–47 loses 3 tables (base 2 + 1)', () => {
    const result = scoreRound(makeBid(40), makeTeams(12, 12, 35, 0), players);
    expect(result.tablesChange).toBe(-3);
  });

  it('failure on doubled bid 14–39 loses 4 tables ((base 1 + 1) × 2)', () => {
    const result = scoreRound(makeBid(14, 'p0', 'double'), makeTeams(12, 12, 10, 0), players);
    expect(result.tablesChange).toBe(-4);
  });

  it('captures finalTeamPoints before reset', () => {
    const result = scoreRound(makeBid(14), makeTeams(12, 12, 16, 12), players);
    expect(result.finalTeamPoints.A).toBe(16);
    expect(result.finalTeamPoints.B).toBe(12);
  });
});

describe('checkWinner', () => {
  it('returns B when A has zero tables', () => {
    expect(checkWinner(makeTeams(0, 12))).toBe('B');
  });

  it('returns A when B has zero tables', () => {
    expect(checkWinner(makeTeams(12, 0))).toBe('A');
  });

  it('returns null when both teams have tables', () => {
    expect(checkWinner(makeTeams(6, 8))).toBeNull();
  });

  it('returns null when both teams have exactly 1 table', () => {
    expect(checkWinner(makeTeams(1, 1))).toBeNull();
  });

  it('returns B when A has exactly 0 and B has 1', () => {
    expect(checkWinner(makeTeams(0, 1))).toBe('B');
  });
});

describe('applyRoundResult', () => {
  it('opponent loses tables on bid success', () => {
    const teams = makeTeams(12, 12, 30, 0);
    const result = scoreRound(makeBid(28), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.B.tables).toBe(11);
    expect(updated.A.tables).toBe(12);
  });

  it('bid team tables unchanged on success', () => {
    const teams = makeTeams(12, 12, 20, 0);
    const result = scoreRound(makeBid(14), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.A.tables).toBe(12);
  });

  it('bid team loses tables on failure', () => {
    const teams = makeTeams(12, 12, 20, 0);
    const result = scoreRound(makeBid(32), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.A.tables).toBeLessThan(12);
  });

  it('opponent tables unchanged on failure', () => {
    const teams = makeTeams(12, 12, 10, 18);
    const result = scoreRound(makeBid(14), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.B.tables).toBe(12);
  });

  it('tables do not go below zero', () => {
    const teams = makeTeams(1, 1, 20, 0);
    const result = scoreRound(makeBid(56), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.A.tables).toBeGreaterThanOrEqual(0);
  });

  it('opponent tables clamped to 0 when loss exceeds remaining (bid 56 success, opponent has 2)', () => {
    const teams = makeTeams(12, 2, 56, 0);
    const result = scoreRound(makeBid(56), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.B.tables).toBe(0);
    expect(updated.A.tables).toBe(12);
  });

  it('bid team tables clamped to 0 when failure loss exceeds remaining', () => {
    // A bids 48 (tier 3), has 0 points → failure → loses (3+1)*1 = 4 tables. A has 3 → clamped to 0
    const teams = makeTeams(3, 12, 0, 28);
    const result = scoreRound(makeBid(48), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.A.tables).toBe(0);
    expect(updated.B.tables).toBe(12);
  });

  it('roundPoints reset to 0 for both teams after success', () => {
    const teams = makeTeams(12, 12, 20, 8);
    const result = scoreRound(makeBid(14), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.A.roundPoints).toBe(0);
    expect(updated.B.roundPoints).toBe(0);
  });

  it('roundPoints reset to 0 for both teams after failure', () => {
    const teams = makeTeams(12, 12, 10, 18);
    const result = scoreRound(makeBid(14), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.A.roundPoints).toBe(0);
    expect(updated.B.roundPoints).toBe(0);
  });

  it('Team B bidding: B wins tables from A on success', () => {
    // p1 is team B; B bids 28, B has 30 pts → success → A loses 1 table
    const teams = makeTeams(12, 12, 0, 30);
    const result = scoreRound(makeBid(28, 'p1'), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.A.tables).toBe(11);
    expect(updated.B.tables).toBe(12);
  });

  it('Team B bidding: B loses tables on failure', () => {
    // p1 is team B; B bids 14, B has 5 pts → failure → B loses 2 tables
    const teams = makeTeams(12, 12, 23, 5);
    const result = scoreRound(makeBid(14, 'p1'), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.B.tables).toBe(10);
    expect(updated.A.tables).toBe(12);
  });
});
