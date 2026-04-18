import { Bid } from '../models/Bid';
import { Team, TeamId } from '../models/Player';

export interface RoundResult {
  bidTeam: TeamId;
  bidAmount: number;
  bidTeamPoints: number;
  success: boolean;
  tablesChange: number;
  doubled: boolean;
  redoubled: boolean;
}

export function scoreRound(
  winningBid: Bid,
  teams: { A: Team; B: Team },
  players: { id: string; teamId: TeamId }[],
): RoundResult {
  const bidder = players.find(p => p.id === winningBid.playerId);
  const bidTeam: TeamId = bidder?.teamId ?? 'A';
  const bidAmount = winningBid.amount ?? 28;
  const bidTeamPoints = teams[bidTeam].roundPoints;

  const success = bidTeamPoints >= bidAmount;
  const doubled = winningBid.type === 'double';
  const redoubled = winningBid.type === 'redouble';

  const baseTablesChange = tablesForBid(bidAmount);
  const multiplier = redoubled ? 4 : doubled ? 2 : 1;

  // On success: opponent team loses tables (bid team gains)
  // On failure: bid team loses tables (to each opponent team)
  const tablesChange = success
    ? baseTablesChange * multiplier
    : -(baseTablesChange + 1) * multiplier;

  return { bidTeam, bidAmount, bidTeamPoints, success, tablesChange, doubled, redoubled };
}

export function applyRoundResult(
  teams: { A: Team; B: Team },
  result: RoundResult,
): { A: Team; B: Team } {
  const opponentTeam: TeamId = result.bidTeam === 'A' ? 'B' : 'A';

  if (result.success) {
    return {
      ...teams,
      [opponentTeam]: {
        ...teams[opponentTeam],
        tables: Math.max(0, teams[opponentTeam].tables - result.tablesChange),
        roundPoints: 0,
      },
      [result.bidTeam]: { ...teams[result.bidTeam], roundPoints: 0 },
    };
  } else {
    const loss = Math.abs(result.tablesChange);
    return {
      ...teams,
      [result.bidTeam]: {
        ...teams[result.bidTeam],
        tables: Math.max(0, teams[result.bidTeam].tables - loss),
        roundPoints: 0,
      },
      [opponentTeam]: { ...teams[opponentTeam], roundPoints: 0 },
    };
  }
}

export function checkWinner(teams: { A: Team; B: Team }): TeamId | null {
  if (teams.A.tables <= 0) return 'B';
  if (teams.B.tables <= 0) return 'A';
  return null;
}

function tablesForBid(amount: number): number {
  if (amount <= 39) return 1;
  if (amount <= 47) return 2;
  if (amount <= 55) return 3;
  return 4; // 56
}
