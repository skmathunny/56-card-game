import { v4 as uuid } from 'uuid';
import { Server, Socket } from 'socket.io';
import { GameState } from '../models/GameState';
import { Player, TeamId } from '../models/Player';
import { Trick } from '../models/Trick';
import { createGame, startBidding, placeBid, playCard, scoreRoundAndAdvance } from '../engine/GameEngine';
import { PlaceBidInput } from '../engine/BiddingEngine';
import { createAIPlayer } from '../ai/AIPersonas';
import { decideBid, decidePlay } from '../ai/AIPlayer';
import { SERVER_EVENTS } from '../sockets/eventNames';
import { config } from '../config';
import { logger } from '../utils/logger';

export interface RoomSettings {
  playerCount: 4 | 6 | 8;
  startingTables: number;
  bidTimerSeconds: number;
  playTimerSeconds: number;
  expiryHours: number;
}

export interface RoomPlayer {
  socketId: string | null;
  player: Player;
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

export interface ChatMessage {
  id: string;
  playerId: string;
  displayName: string;
  message: string;
  timestamp: number;
}

export interface PublicGameState extends Omit<GameState, 'players'> {
  players: Omit<Player, 'hand'>[];
}

export class GameRoom {
  readonly id: string;
  readonly code: string;
  readonly settings: RoomSettings;

  private io: Server;
  private roomPlayers: RoomPlayer[] = [];
  private gameState: GameState | null = null;
  private chatHistory: ChatMessage[] = [];
  private trickHistoryVotes: Map<string, boolean> = new Map();
  private trickHistoryRequester: string | null = null;
  private expiryTimer: ReturnType<typeof setTimeout>;

  constructor(id: string, code: string, settings: RoomSettings, io: Server) {
    this.id = id;
    this.code = code;
    this.settings = settings;
    this.io = io;

    this.expiryTimer = setTimeout(
      () => this.onExpiry(),
      settings.expiryHours * 60 * 60 * 1000,
    );
  }

  // ── Lobby ──────────────────────────────────────────────────────────────────

  addPlayer(socket: Socket, displayName: string, avatarUrl: string, userId: string | null): Player | null {
    if (this.roomPlayers.length >= this.settings.playerCount) return null;

    const seatIndex = this.nextAvailableSeat();
    const teamId: TeamId = seatIndex % 2 === 0 ? 'A' : 'B';

    const player: Player = {
      id: uuid(),
      userId,
      displayName,
      avatarUrl,
      seatIndex,
      teamId,
      isAI: false,
      isConnected: true,
      isHost: this.roomPlayers.length === 0,
      hand: [],
    };

    this.roomPlayers.push({ socketId: socket.data.playerId ?? socket.id, player });
    socket.join(this.id);
    socket.data.roomId = this.id;
    socket.data.playerId = player.id;

    this.broadcastRoomUpdate();
    return player;
  }

  addAI(seatIndex: number): Player | null {
    if (this.isSeatTaken(seatIndex)) return null;
    const teamId: TeamId = seatIndex % 2 === 0 ? 'A' : 'B';
    const aiPlayer = createAIPlayer(seatIndex, teamId);
    this.roomPlayers.push({ socketId: null, player: aiPlayer });
    this.broadcastRoomUpdate();
    return aiPlayer;
  }

  removeAI(seatIndex: number): boolean {
    const idx = this.roomPlayers.findIndex(rp => rp.player.seatIndex === seatIndex && rp.player.isAI);
    if (idx === -1) return false;
    this.roomPlayers.splice(idx, 1);
    this.broadcastRoomUpdate();
    return true;
  }

  removePlayer(playerId: string): void {
    const idx = this.roomPlayers.findIndex(rp => rp.player.id === playerId);
    if (idx === -1) return;

    // Migrate host if needed
    const wasHost = this.roomPlayers[idx].player.isHost;
    this.roomPlayers.splice(idx, 1);

    if (wasHost && this.roomPlayers.length > 0) {
      const nextHost = this.roomPlayers.find(rp => !rp.player.isAI);
      if (nextHost) nextHost.player.isHost = true;
    }

    this.broadcastRoomUpdate();
  }

  isFull(): boolean {
    return this.roomPlayers.length >= this.settings.playerCount;
  }

  isEmpty(): boolean {
    return this.roomPlayers.filter(rp => !rp.player.isAI).length === 0;
  }

  getPublicPlayers(): Omit<Player, 'hand'>[] {
    return this.roomPlayers.map(({ player }) => {
      const { hand, ...pub } = player;
      return pub;
    });
  }

  // ── Game ───────────────────────────────────────────────────────────────────

  startGame(requestingPlayerId: string): boolean {
    const rp = this.roomPlayers.find(r => r.player.id === requestingPlayerId);
    if (!rp?.player.isHost) {
      logger.warn({ roomId: this.id, requestingPlayerId }, 'startGame: not host');
      return false;
    }
    if (!this.isFull()) {
      logger.warn({ roomId: this.id, players: this.roomPlayers.length, required: this.settings.playerCount }, 'startGame: room not full');
      return false;
    }

    const players = this.roomPlayers
      .map(rp => rp.player)
      .sort((a, b) => a.seatIndex - b.seatIndex);

    this.gameState = createGame(this.id, players, this.settings.startingTables);
    logger.info(
      { roomId: this.id, playerCount: players.length, startingTables: this.settings.startingTables,
        players: players.map(p => ({ id: p.id, seat: p.seatIndex, team: p.teamId, isAI: p.isAI })) },
      'Game created',
    );
    this.broadcastGameState();

    // Trigger deal animation then auto-advance to bidding
    setTimeout(() => {
      if (!this.gameState) return;
      const result = startBidding(this.gameState);
      this.gameState = result.state;
      logger.info({ roomId: this.id }, 'Bidding started');
      this.broadcastGameState();
      this.scheduleAITurnIfNeeded();
    }, 2000);

    return true;
  }

  handleBid(playerId: string, input: PlaceBidInput): string | null {
    if (!this.gameState) return 'NO_GAME';

    const log = logger.child({ roomId: this.id, roundNumber: this.gameState.roundNumber });
    log.debug({ playerId, bidType: input.type, amount: input.amount, trump: input.trump }, 'handleBid');

    const result = placeBid(this.gameState, playerId, input);
    if (result.error) {
      log.warn({ playerId, bidType: input.type, amount: input.amount, error: result.error }, 'Bid engine error');
      return result.error;
    }

    this.gameState = result.state;
    log.info(
      { playerId, bidType: input.type, amount: input.amount, trump: input.trump,
        phase: this.gameState.phase, nextBidder: this.gameState.biddingState.currentBidderSeatIndex },
      'Bid accepted',
    );

    this.broadcastGameState();
    this.scheduleAITurnIfNeeded();
    return null;
  }

  handlePlayCard(playerId: string, cardId: string): string | null {
    if (!this.gameState) return 'NO_GAME';

    const log = logger.child({ roomId: this.id, roundNumber: this.gameState.roundNumber });
    log.debug({ playerId, cardId }, 'handlePlayCard');

    const result = playCard(this.gameState, playerId, cardId);
    if (result.error) {
      log.warn({ playerId, cardId, error: result.error }, 'Play engine error');
      return result.error;
    }

    this.gameState = result.state;
    const trickCount = this.gameState.tricks.length;
    log.info({ playerId, cardId, trickCount, phase: this.gameState.phase }, 'Card played');

    this.broadcastGameState();

    if (this.gameState.phase === 'scoring') {
      log.info({ trickCount }, 'Round complete — scoring in 500ms');
      setTimeout(() => this.advanceRound(), 500);
    } else {
      this.scheduleAITurnIfNeeded();
    }
    return null;
  }

  private advanceRound(): void {
    if (!this.gameState) return;

    const log = logger.child({ roomId: this.id, roundNumber: this.gameState.roundNumber });
    log.info('Advancing round');

    const result = scoreRoundAndAdvance(this.gameState);
    this.gameState = result.state;

    if (result.roundResult) {
      log.info(
        { bidTeam: result.roundResult.bidTeam, bidAmount: result.roundResult.bidAmount,
          success: result.roundResult.success, tablesChange: result.roundResult.tablesChange,
          finalPoints: result.roundResult.finalTeamPoints },
        'Round scored',
      );
      this.io.to(this.id).emit(SERVER_EVENTS.GAME_ROUND_COMPLETE, {
        roundSummary: result.roundResult,
        publicState: this.buildPublicState(),
      });
    }

    if (this.gameState.phase === 'complete') {
      log.info({ winner: this.gameState.winner }, 'Game complete');
      this.io.to(this.id).emit(SERVER_EVENTS.GAME_COMPLETE, {
        winner: this.gameState.winner,
        stats: this.buildGameStats(),
      });
      return;
    }

    // Send new hand to clients immediately so they see cards during the dealing animation
    this.broadcastGameState();

    // Auto-advance to bidding after dealing pause
    setTimeout(() => {
      if (!this.gameState) return;
      const bidResult = startBidding(this.gameState);
      this.gameState = bidResult.state;
      log.info({ roundNumber: this.gameState.roundNumber }, 'Bidding started for new round');
      this.broadcastGameState();
      this.scheduleAITurnIfNeeded();
    }, 2000);
  }

  // ── Trick history ──────────────────────────────────────────────────────────

  requestTrickHistory(requestingPlayerId: string): void {
    this.trickHistoryRequester = requestingPlayerId;
    this.trickHistoryVotes.clear();

    const requester = this.roomPlayers.find(rp => rp.player.id === requestingPlayerId);
    this.io.to(this.id).emit(SERVER_EVENTS.GAME_TRICK_HISTORY_REQUESTED, {
      requestingPlayerName: requester?.player.displayName ?? 'A player',
    });

    // AI players auto-vote yes
    this.roomPlayers
      .filter(rp => rp.player.isAI)
      .forEach(rp => this.trickHistoryVotes.set(rp.player.id, true));

    this.checkTrickHistoryVotes();
  }

  voteTrickHistory(playerId: string, vote: boolean): void {
    this.trickHistoryVotes.set(playerId, vote);
    this.checkTrickHistoryVotes();
  }

  private checkTrickHistoryVotes(): void {
    const humanVoters = this.roomPlayers.filter(rp =>
      !rp.player.isAI && rp.player.id !== this.trickHistoryRequester,
    );

    const allVoted = humanVoters.every(rp => this.trickHistoryVotes.has(rp.player.id));
    if (!allVoted) return;

    const approved = [...this.trickHistoryVotes.values()].every(v => v === true);
    this.io.to(this.id).emit(SERVER_EVENTS.GAME_TRICK_HISTORY_RESULT, {
      approved,
      tricks: approved ? this.gameState?.tricks ?? [] : null,
    });

    this.trickHistoryRequester = null;
    this.trickHistoryVotes.clear();
  }

  // ── Chat ───────────────────────────────────────────────────────────────────

  sendMessage(playerId: string, message: string): void {
    const rp = this.roomPlayers.find(r => r.player.id === playerId);
    if (!rp) return;

    const chatMsg: ChatMessage = {
      id: uuid(),
      playerId,
      displayName: rp.player.displayName,
      message: message.slice(0, 500),
      timestamp: Date.now(),
    };

    this.chatHistory.push(chatMsg);
    this.io.to(this.id).emit(SERVER_EVENTS.CHAT_MESSAGE, chatMsg);
  }

  // ── Disconnection ──────────────────────────────────────────────────────────

  handleDisconnect(socketId: string): void {
    const rp = this.roomPlayers.find(r => r.socketId === socketId);
    if (!rp) return;

    // Migrate host role immediately if the disconnecting player was host
    const wasHost = rp.player.isHost;
    rp.player.isConnected = false;

    if (wasHost) {
      const nextHost = this.roomPlayers.find(r => !r.player.isAI && r.player.id !== rp.player.id);
      if (nextHost) {
        nextHost.player.isHost = true;
        this.io.to(this.id).emit(SERVER_EVENTS.HOST_MIGRATED, {
          newHostId: nextHost.player.id,
          newHostName: nextHost.player.displayName,
        });
      }
    }

    this.io.to(this.id).emit(SERVER_EVENTS.PLAYER_DISCONNECTED, {
      playerId: rp.player.id,
      reconnectWindowSecs: config.reconnectWindowMs / 1000,
    });

    rp.reconnectTimer = setTimeout(() => {
      this.replaceWithAI(rp.player.id);
    }, config.reconnectWindowMs);
  }

  handleReconnect(socket: Socket, playerId: string): boolean {
    const rp = this.roomPlayers.find(r => r.player.id === playerId);
    if (!rp || rp.player.isAI) return false;

    if (rp.reconnectTimer) clearTimeout(rp.reconnectTimer);
    rp.socketId = socket.id;
    rp.player.isConnected = true;
    socket.join(this.id);
    socket.data.roomId = this.id;
    socket.data.playerId = playerId;

    this.io.to(this.id).emit(SERVER_EVENTS.PLAYER_RECONNECTED, { playerId });
    socket.emit(SERVER_EVENTS.GAME_STATE_UPDATED, {
      publicState: this.buildPublicState(),
      privateHand: this.gameState?.players.find(p => p.id === playerId)?.hand ?? [],
    });

    return true;
  }

  private replaceWithAI(playerId: string): void {
    const rp = this.roomPlayers.find(r => r.player.id === playerId);
    if (!rp) return;

    const aiPlayer = createAIPlayer(rp.player.seatIndex, rp.player.teamId);
    aiPlayer.isHost = rp.player.isHost;

    // Transfer hand from game state to AI player
    if (this.gameState) {
      const gp = this.gameState.players.find(p => p.id === playerId);
      if (gp) aiPlayer.hand = gp.hand;
      this.gameState = {
        ...this.gameState,
        players: this.gameState.players.map(p => p.id === playerId ? aiPlayer : p),
      };
    }

    rp.player = aiPlayer;
    rp.socketId = null;

    this.io.to(this.id).emit(SERVER_EVENTS.PLAYER_AI_TAKEOVER, {
      playerId,
      aiPlayer: (({ hand, ...pub }) => pub)(aiPlayer),
    });

    this.scheduleAITurnIfNeeded();
  }

  // ── AI turn scheduling ─────────────────────────────────────────────────────

  private scheduleAITurnIfNeeded(): void {
    if (!this.gameState) return;
    const { phase, currentPlayerSeatIndex } = this.gameState;
    if (phase !== 'bidding' && phase !== 'playing') return;

    const currentPlayer = this.gameState.players.find(
      p => p.seatIndex === currentPlayerSeatIndex,
    );
    if (!currentPlayer?.isAI) return;

    logger.debug(
      { roomId: this.id, aiPlayerId: currentPlayer.id, phase, delayMs: config.aiTurnDelayMs },
      'Scheduling AI turn',
    );
    setTimeout(() => this.executeAITurn(currentPlayer.id), config.aiTurnDelayMs);
  }

  private executeAITurn(playerId: string): void {
    if (!this.gameState) return;
    const player = this.gameState.players.find(p => p.id === playerId);
    if (!player?.isAI) return;

    if (this.gameState.phase === 'bidding') {
      const input = decideBid(this.gameState, playerId);
      logger.debug({ roomId: this.id, playerId, bidType: input.type, amount: input.amount }, 'AI bid decision');
      this.handleBid(playerId, input);
    } else if (this.gameState.phase === 'playing') {
      const cardId = decidePlay(this.gameState, playerId);
      logger.debug({ roomId: this.id, playerId, cardId }, 'AI play decision');
      this.handlePlayCard(playerId, cardId);
    }
  }

  // ── Broadcast helpers ──────────────────────────────────────────────────────

  private broadcastGameState(): void {
    if (!this.gameState) return;
    const publicState = this.buildPublicState();

    // Send public state + private hand to each connected human player
    this.roomPlayers.forEach(({ socketId, player }) => {
      if (!socketId || player.isAI) return;
      const privateHand = this.gameState!.players.find(p => p.id === player.id)?.hand ?? [];
      this.io.to(socketId).emit(SERVER_EVENTS.GAME_STATE_UPDATED, { publicState, privateHand });
    });
  }

  private broadcastRoomUpdate(): void {
    this.io.to(this.id).emit(SERVER_EVENTS.ROOM_UPDATED, {
      room: this.getPublicRoomInfo(),
    });
  }

  private buildPublicState(): PublicGameState {
    if (!this.gameState) throw new Error('No game state');
    const { players, ...rest } = this.gameState;
    return {
      ...rest,
      players: players.map(({ hand, ...pub }) => pub),
    };
  }

  private buildGameStats() {
    if (!this.gameState) return {};
    return {
      teams: this.gameState.teams,
      players: this.gameState.players.map(p => ({
        id: p.id,
        displayName: p.displayName,
        teamId: p.teamId,
        tricksWon: this.gameState!.tricks.filter(t => t.winnerId === p.id).length,
      })),
    };
  }

  getPublicRoomInfo() {
    return {
      id: this.id,
      code: this.code,
      settings: this.settings,
      players: this.getPublicPlayers(),
      gamePhase: this.gameState?.phase ?? 'lobby',
    };
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  private nextAvailableSeat(): number {
    const taken = new Set(this.roomPlayers.map(rp => rp.player.seatIndex));
    for (let i = 0; i < this.settings.playerCount; i++) {
      if (!taken.has(i)) return i;
    }
    return this.roomPlayers.length;
  }

  private isSeatTaken(seatIndex: number): boolean {
    return this.roomPlayers.some(rp => rp.player.seatIndex === seatIndex);
  }

  private onExpiry(): void {
    logger.info({ roomId: this.id }, 'Room expired');
    this.io.to(this.id).disconnectSockets(true);
  }

  destroy(): void {
    clearTimeout(this.expiryTimer);
  }
}
