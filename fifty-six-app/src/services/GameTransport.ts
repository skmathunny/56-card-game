import { ServerEvent } from '../constants/events';

export interface JoinRoomPayload {
  roomCode: string;
  displayName: string;
  avatarUrl: string;
  userId: string | null;
}

export interface BidPayload {
  gameId: string;
  amount?: number;
  trump?: string;
  conventionId?: string;
}

export interface PlayCardPayload {
  gameId: string;
  cardId: string;
}

export interface GameTransport {
  joinRoom(payload: JoinRoomPayload): Promise<{ room: any; yourPlayer: any }>;
  leaveRoom(payload: { roomId: string }): void;
  addAI(payload: { roomId: string; seatIndex: number }): Promise<{ success: boolean }>;
  removeAI(payload: { roomId: string; seatIndex: number }): Promise<{ success: boolean }>;
  startGame(payload: { roomId: string }): Promise<{ success: boolean }>;
  placeBid(payload: BidPayload): Promise<{ success: boolean }>;
  pass(payload: { gameId: string }): Promise<{ success: boolean }>;
  double(payload: { gameId: string }): Promise<{ success: boolean }>;
  redouble(payload: { gameId: string }): Promise<{ success: boolean }>;
  playCard(payload: PlayCardPayload): Promise<{ success: boolean }>;
  requestTrickHistory(payload: { gameId: string }): void;
  voteTrickHistory(payload: { gameId: string; vote: boolean }): void;
  sendMessage(payload: { roomId: string; message: string }): void;
  on(event: ServerEvent, handler: (data: any) => void): void;
  off(event: ServerEvent, handler: (data: any) => void): void;
  dispose(): void;
}
