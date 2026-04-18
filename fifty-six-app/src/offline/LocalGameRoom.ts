import { EventEmitter } from 'events';
import { v4 as uuid } from 'uuid';
import { GameState } from './models/GameState';
import { Player, TeamId } from './models/Player';
import {
  createGame,
  startBidding,
  placeBid,
  playCard,
  scoreRoundAndAdvance,
} from './engine/GameEngine';
import { PlaceBidInput } from './engine/BiddingEngine';
import { createAIPlayer } from './ai/AIPersonas';
import { decideBid, decidePlay } from './ai/AIPlayer';

// Server event names (mirrors server/src/sockets/eventNames.ts)
const EV = {
  GAME_STATE_UPDATED:           'game:state-updated',
  ROOM_UPDATED:                 'room:updated',
  GAME_TRICK_HISTORY_REQUESTED: 'game:trick-history-requested',
  GAME_TRICK_HISTORY_RESULT:    'game:trick-history-result',
  GAME_ROUND_COMPLETE:          'game:round-complete',
  GAME_COMPLETE:                'game:complete',
  CHAT_MESSAGE:                 'chat:message',
  PLAYER_DISCONNECTED:          'player:disconnected',
  PLAYER_RECONNECTED:           'player:reconnected',
  PLAYER_AI_TAKEOVER:           'player:ai-takeover',
} as const;

const AI_DELAY_MS = 1200;

export interface LocalRoomSettings {
  playerCount: 4 | 6 | 8;
  startingTables: number;
  bidTimerSeconds: number;
  expiryHours: number;
}

export class LocalGameRoom {
  readonly id   = 'offline-room';
  readonly code = 'OFFLINE';

  private emitter   = new EventEmitter();
  private players:  Player[] = [];
  private gameState: GameState | null = null;
  private settings: LocalRoomSettings;

  private trickHistoryVotes     = new Map<string, boolean>();
  private trickHistoryRequester: string | null = null;

  constructor(settings: LocalRoomSettings) {
    this.settings = settings;
  }

  // ── Pub/sub ─────────────────────────────────────────────────────────────────

  on(event: string, handler: (data: any) => void)  { this.emitter.on(event,  handler); }
  off(event: string, handler: (data: any) => void) { this.emitter.off(event, handler); }

  private emit(event: string, data: any) {
    // Use setImmediate so callers get the response before the event fires —
    // mirrors the async nature of real socket events
    setImmediate(() => this.emitter.emit(event, data));
  }

  // ── Lobby ────────────────────────────────────────────────────────────────────

  addHumanPlayer(displayName: string, avatarUrl: string, userId: string | null): Player {
    const seatIndex = this.players.length;
    const teamId: TeamId = seatIndex % 2 === 0 ? 'A' : 'B';
    const player: Player = {
      id:          'local-player',
      userId,
      displayName,
      avatarUrl,
      seatIndex,
      teamId,
      isAI:        false,
      isConnected: true,
      isHost:      true,
      hand:        [],
    };
    this.players.push(player);
    return player;
  }

  addAI(seatIndex: number): void {
    if (this.players.some(p => p.seatIndex === seatIndex)) return;
    const teamId: TeamId = seatIndex % 2 === 0 ? 'A' : 'B';
    this.players.push(createAIPlayer(seatIndex, teamId));
    this.broadcastRoomUpdate();
  }

  removeAI(seatIndex: number): void {
    this.players = this.players.filter(p => !(p.seatIndex === seatIndex && p.isAI));
    this.broadcastRoomUpdate();
  }

  // ── Game ─────────────────────────────────────────────────────────────────────

  startGame(): void {
    const sorted = [...this.players].sort((a, b) => a.seatIndex - b.seatIndex);
    this.gameState = createGame(this.id, sorted, this.settings.startingTables);
    this.broadcastGameState();

    setTimeout(() => {
      if (!this.gameState) return;
      const result = startBidding(this.gameState);
      this.gameState = result.state;
      this.broadcastGameState();
      this.scheduleAITurnIfNeeded();
    }, 1800);
  }

  handleBid(playerId: string, input: Omit<PlaceBidInput, 'playerId'>): string | null {
    if (!this.gameState) return 'NO_GAME';
    const result = placeBid(this.gameState, playerId, { ...input, playerId });
    if (result.error) return result.error;
    this.gameState = result.state;
    this.broadcastGameState();
    this.scheduleAITurnIfNeeded();
    return null;
  }

  handlePlayCard(playerId: string, cardId: string): string | null {
    if (!this.gameState) return 'NO_GAME';
    const result = playCard(this.gameState, playerId, cardId);
    if (result.error) return result.error;
    this.gameState = result.state;
    this.broadcastGameState();

    if (this.gameState.phase === 'scoring') {
      setTimeout(() => this.advanceRound(), 500);
    } else {
      this.scheduleAITurnIfNeeded();
    }
    return null;
  }

  private advanceRound(): void {
    if (!this.gameState) return;
    const result = scoreRoundAndAdvance(this.gameState);
    this.gameState = result.state;

    if (result.roundResult) {
      this.emit(EV.GAME_ROUND_COMPLETE, { roundSummary: result.roundResult });
    }

    if (this.gameState.phase === 'complete') {
      this.emit(EV.GAME_COMPLETE, { winner: this.gameState.winner });
      return;
    }

    setTimeout(() => {
      if (!this.gameState) return;
      const bidResult = startBidding(this.gameState);
      this.gameState = bidResult.state;
      this.broadcastGameState();
      this.scheduleAITurnIfNeeded();
    }, 1800);
  }

  // ── Trick history ─────────────────────────────────────────────────────────────

  requestTrickHistory(requestingPlayerId: string): void {
    this.trickHistoryRequester = requestingPlayerId;
    this.trickHistoryVotes.clear();

    const requester = this.players.find(p => p.id === requestingPlayerId);
    this.emit(EV.GAME_TRICK_HISTORY_REQUESTED, {
      requestingPlayerName: requester?.displayName ?? 'A player',
    });

    // AI auto-approve
    this.players.filter(p => p.isAI).forEach(p => this.trickHistoryVotes.set(p.id, true));
    this.checkTrickHistoryVotes();
  }

  voteTrickHistory(playerId: string, vote: boolean): void {
    this.trickHistoryVotes.set(playerId, vote);
    this.checkTrickHistoryVotes();
  }

  private checkTrickHistoryVotes(): void {
    const humanVoters = this.players.filter(
      p => !p.isAI && p.id !== this.trickHistoryRequester,
    );
    if (!humanVoters.every(p => this.trickHistoryVotes.has(p.id))) return;

    const approved = [...this.trickHistoryVotes.values()].every(v => v);
    this.emit(EV.GAME_TRICK_HISTORY_RESULT, { approved });
    this.trickHistoryRequester = null;
    this.trickHistoryVotes.clear();
  }

  // ── Chat ──────────────────────────────────────────────────────────────────────

  sendMessage(playerId: string, message: string): void {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;
    this.emit(EV.CHAT_MESSAGE, {
      id:          uuid(),
      playerId,
      displayName: player.displayName,
      message:     message.slice(0, 500),
      timestamp:   Date.now(),
    });
  }

  // ── AI ────────────────────────────────────────────────────────────────────────

  private scheduleAITurnIfNeeded(): void {
    if (!this.gameState) return;
    const { phase, currentPlayerSeatIndex } = this.gameState;
    if (phase !== 'bidding' && phase !== 'playing') return;

    const current = this.gameState.players.find(p => p.seatIndex === currentPlayerSeatIndex);
    if (!current?.isAI) return;

    setTimeout(() => this.executeAITurn(current.id), AI_DELAY_MS);
  }

  private executeAITurn(playerId: string): void {
    if (!this.gameState) return;
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player?.isAI) return;

    if (this.gameState.phase === 'bidding') {
      const { playerId: _pid, ...input } = decideBid(this.gameState, playerId);
      this.handleBid(playerId, input);
    } else if (this.gameState.phase === 'playing') {
      const cardId = decidePlay(this.gameState, playerId);
      this.handlePlayCard(playerId, cardId);
    }
  }

  // ── Broadcast helpers ─────────────────────────────────────────────────────────

  private broadcastGameState(): void {
    if (!this.gameState) return;
    const { players, ...rest } = this.gameState;
    const publicState = {
      ...rest,
      players: players.map(({ hand, ...pub }) => pub),
    };
    const humanPlayer = this.gameState.players.find(p => p.id === 'local-player');
    const privateHand = humanPlayer?.hand ?? [];
    this.emit(EV.GAME_STATE_UPDATED, { publicState, privateHand });
  }

  private broadcastRoomUpdate(): void {
    this.emit(EV.ROOM_UPDATED, {
      players: this.players.map(({ hand, ...pub }) => pub),
    });
  }

  getPublicPlayers() {
    return this.players.map(({ hand, ...pub }) => pub);
  }

  destroy(): void {
    this.emitter.removeAllListeners();
  }
}
