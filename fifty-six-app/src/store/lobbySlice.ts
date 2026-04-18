import { create } from 'zustand';

export interface RoomPlayer {
  id: string;
  displayName: string;
  avatarUrl: string;
  seatIndex: number;
  teamId: 'A' | 'B';
  isAI: boolean;
  isHost: boolean;
}

export interface RoomSettings {
  playerCount: 4 | 6 | 8;
  startingTables: number;
  bidTimerSeconds: number;
  expiryHours: number;
  deckId?: string;
}

export interface LobbyState {
  roomId: string | null;
  roomCode: string | null;
  settings: RoomSettings | null;
  players: RoomPlayer[];
  myPlayerId: string | null;
  isHost: boolean;

  setRoom(roomId: string, code: string, settings: RoomSettings): void;
  setMyPlayer(playerId: string): void;
  setPlayers(players: RoomPlayer[]): void;
  clearLobby(): void;
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  roomId: null,
  roomCode: null,
  settings: null,
  players: [],
  myPlayerId: null,
  isHost: false,

  setRoom(roomId, roomCode, settings) {
    set({ roomId, roomCode, settings });
  },

  setMyPlayer(playerId) {
    set({ myPlayerId: playerId });
  },

  setPlayers(players) {
    const myId = get().myPlayerId;
    const me = players.find(p => p.id === myId);
    set({ players, isHost: me?.isHost ?? false });
  },

  clearLobby() {
    set({ roomId: null, roomCode: null, settings: null, players: [], myPlayerId: null, isHost: false });
  },
}));
