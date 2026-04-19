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
});

describe('applyRoundResult', () => {
  it('opponent loses tables on bid success', () => {
    const teams = makeTeams(12, 12, 30, 0);
    const result = scoreRound(makeBid(28), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.B.tables).toBe(11);
    expect(updated.A.tables).toBe(12);
  });

  it('bid team loses tables on failure', () => {
    const teams = makeTeams(12, 12, 20, 0);
    const result = scoreRound(makeBid(32), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.A.tables).toBeLessThan(12);
  });

  it('tables do not go below zero', () => {
    const teams = makeTeams(1, 1, 20, 0);
    const result = scoreRound(makeBid(56), teams, players);
    const updated = applyRoundResult(teams, result);
    expect(updated.A.tables).toBeGreaterThanOrEqual(0);
  });
});
