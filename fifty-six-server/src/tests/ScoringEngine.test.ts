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
    const teams = makeTeams(12, 12, 30, 0);
    const result = scoreRound(makeBid(28), teams, players);
    expect(result.success).toBe(true);
  });

  it('marks as failure when bid team falls short', () => {
    const teams = makeTeams(12, 12, 20, 0);
    const result = scoreRound(makeBid(32), teams, players);
    expect(result.success).toBe(false);
  });

  it('bid 28-39 results in 1 table change', () => {
    const teams = makeTeams(12, 12, 30, 0);
    const result = scoreRound(makeBid(28), teams, players);
    expect(result.tablesChange).toBe(1);
  });

  it('bid 40-47 results in 2 tables change', () => {
    const teams = makeTeams(12, 12, 42, 0);
    const result = scoreRound(makeBid(40), teams, players);
    expect(result.tablesChange).toBe(2);
  });

  it('bid 56 results in 4 tables change', () => {
    const teams = makeTeams(12, 12, 56, 0);
    const result = scoreRound(makeBid(56), teams, players);
    expect(result.tablesChange).toBe(4);
  });

  it('doubled bid doubles the payout', () => {
    const teams = makeTeams(12, 12, 30, 0);
    const result = scoreRound(makeBid(28, 'p0', 'double'), teams, players);
    expect(result.tablesChange).toBe(2);
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
