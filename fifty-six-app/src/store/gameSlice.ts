import { create } from 'zustand';
import { Card } from '../constants/cards';

export type GamePhase = 'dealing' | 'bidding' | 'playing' | 'scoring' | 'complete';

export interface PublicPlayer {
  id: string;
  displayName: string;
  avatarUrl: string;
  seatIndex: number;
  teamId: 'A' | 'B';
  isAI: boolean;
  isConnected: boolean;
  isHost: boolean;
}

export interface TeamState {
  id: 'A' | 'B';
  tables: number;
  roundPoints: number;
}

export interface BidRecord {
  id: string;
  playerId: string;
  amount: number | null;
  trump: string | null;
  type: 'bid' | 'pass' | 'double' | 'redouble';
  timestamp: number;
}

export interface TrickCard {
  playerId: string;
  card: Card;
  playOrder: number;
}

export interface Trick {
  id: number;
  ledSuit: string | null;
  cards: TrickCard[];
  winnerId: string | null;
  points: number;
}

export interface PublicGameState {
  id: string;
  roomId: string;
  playerCount: number;
  roundNumber: number;
  phase: GamePhase;
  players: PublicPlayer[];
  teams: { A: TeamState; B: TeamState };
  dealerSeatIndex: number;
  currentPlayerSeatIndex: number;
  biddingState: {
    bids: BidRecord[];
    currentBidderSeatIndex: number;
    currentHighBid: BidRecord | null;
    isComplete: boolean;
  };
  winningBid: BidRecord | null;
  trump: string | null;
  tricks: Trick[];
  currentTrick: Trick | null;
  winner: 'A' | 'B' | null;
}

export interface RoundSummary {
  bidTeam: 'A' | 'B';
  bidAmount: number;
  success: boolean;
  tablesChange: number;
  doubled: boolean;
  redoubled: boolean;
  finalTeamPoints: { A: number; B: number };
}

export interface RoundHistoryEntry extends RoundSummary {
  roundNumber: number;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  displayName: string;
  message: string;
  timestamp: number;
}

interface GameStore {
  gameState: PublicGameState | null;
  myHand: Card[];
  roundSummary: RoundSummary | null;
  roundHistory: RoundHistoryEntry[];
  chatMessages: ChatMessage[];
  unreadChatCount: number;
  disconnectedPlayers: Set<string>;

  setGameState(state: PublicGameState, hand: Card[]): void;
  setRoundSummary(summary: RoundSummary): void;
  clearRoundSummary(): void;
  addChatMessage(msg: ChatMessage): void;
  markChatRead(): void;
  setPlayerDisconnected(playerId: string): void;
  setPlayerReconnected(playerId: string): void;
  clearGame(): void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  myHand: [],
  roundSummary: null,
  roundHistory: [],
  chatMessages: [],
  unreadChatCount: 0,
  disconnectedPlayers: new Set(),

  setGameState(gameState, myHand) {
    set({ gameState, myHand });
  },

  setRoundSummary(roundSummary) {
    const roundNumber = get().gameState?.roundNumber ?? get().roundHistory.length + 1;
    set(s => ({
      roundSummary,
      roundHistory: [...s.roundHistory, { ...roundSummary, roundNumber }],
    }));
  },

  clearRoundSummary() {
    set({ roundSummary: null });
  },

  addChatMessage(msg) {
    set(s => ({
      chatMessages: [...s.chatMessages, msg],
      unreadChatCount: s.unreadChatCount + 1,
    }));
  },

  markChatRead() {
    set({ unreadChatCount: 0 });
  },

  setPlayerDisconnected(playerId) {
    set(s => ({ disconnectedPlayers: new Set([...s.disconnectedPlayers, playerId]) }));
  },

  setPlayerReconnected(playerId) {
    set(s => {
      const next = new Set(s.disconnectedPlayers);
      next.delete(playerId);
      return { disconnectedPlayers: next };
    });
  },

  clearGame() {
    set({
      gameState: null,
      myHand: [],
      roundSummary: null,
      roundHistory: [],
      chatMessages: [],
      unreadChatCount: 0,
      disconnectedPlayers: new Set(),
    });
  },
}));
