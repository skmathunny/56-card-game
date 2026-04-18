import { Card } from './Card';

export type TeamId = 'A' | 'B';

export interface Player {
  id: string;
  userId: string | null;
  displayName: string;
  avatarUrl: string;
  seatIndex: number;
  teamId: TeamId;
  isAI: boolean;
  isConnected: boolean;
  isHost: boolean;
  hand: Card[];
}

export interface Team {
  id: TeamId;
  playerIds: string[];
  tables: number;
  roundPoints: number;
}
