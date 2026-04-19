import { EventEmitter } from 'events';
import { GameTransport, JoinRoomPayload, BidPayload, PlayCardPayload } from './GameTransport';
import { ServerEvent } from '../constants/events';
import { LocalGameRoom, LocalRoomSettings } from '../offline/LocalGameRoom';
import type { TrumpSuit } from '../offline/models/Card';

const DEFAULT_SETTINGS: LocalRoomSettings = {
  playerCount:     4,
  startingTables:  12,
  bidTimerSeconds: 30,
  playTimerSeconds: 30,
  expiryHours:     4,
};

// Holds listeners registered before the room exists so they can be
// forwarded once the room is created in joinRoom().
type HandlerEntry = { event: ServerEvent; handler: (data: any) => void };

export class OfflineTransport implements GameTransport {
  private room:             LocalGameRoom | null = null;
  private pendingListeners: HandlerEntry[]       = [];

  async joinRoom(payload: JoinRoomPayload) {
    this.room = new LocalGameRoom(DEFAULT_SETTINGS);

    // Replay any listeners registered before room creation
    for (const { event, handler } of this.pendingListeners) {
      this.room.on(event, handler);
    }

    const yourPlayer = this.room.addHumanPlayer(
      payload.displayName,
      payload.avatarUrl,
      payload.userId ?? null,
    );

    // Fill remaining seats with AI players
    for (let seat = 1; seat < DEFAULT_SETTINGS.playerCount; seat++) {
      this.room.addAI(seat);
    }

    return {
      room: {
        id:       this.room.id,
        code:     this.room.code,
        settings: DEFAULT_SETTINGS,
        players:  this.room.getPublicPlayers(),
      },
      yourPlayer,
    };
  }

  leaveRoom(_payload: { roomId: string }) {
    this.room?.destroy();
    this.room = null;
  }

  async addAI(payload: { roomId: string; seatIndex: number }) {
    this.room?.addAI(payload.seatIndex);
    return { success: true };
  }

  async removeAI(payload: { roomId: string; seatIndex: number }) {
    this.room?.removeAI(payload.seatIndex);
    return { success: true };
  }

  async startGame(_payload: { roomId: string }) {
    this.room?.startGame();
    return { success: true };
  }

  async placeBid(payload: BidPayload) {
    const error = this.room?.handleBid('local-player', {
      type:   'bid',
      amount: payload.amount ?? 28,
      trump:  (payload.trump ?? 'no-trumps') as TrumpSuit,
    });
    if (error) throw new Error(error);
    return { success: true };
  }

  async pass(_payload: { gameId: string }) {
    const error = this.room?.handleBid('local-player', { type: 'pass' });
    if (error) throw new Error(error);
    return { success: true };
  }

  async double(_payload: { gameId: string }) {
    const error = this.room?.handleBid('local-player', { type: 'double' });
    if (error) throw new Error(error);
    return { success: true };
  }

  async redouble(_payload: { gameId: string }) {
    const error = this.room?.handleBid('local-player', { type: 'redouble' });
    if (error) throw new Error(error);
    return { success: true };
  }

  async playCard(payload: PlayCardPayload) {
    const error = this.room?.handlePlayCard('local-player', payload.cardId);
    if (error) throw new Error(error);
    return { success: true };
  }

  requestTrickHistory(_payload: { gameId: string }) {
    this.room?.requestTrickHistory('local-player');
  }

  voteTrickHistory(payload: { gameId: string; vote: boolean }) {
    this.room?.voteTrickHistory('local-player', payload.vote);
  }

  sendMessage(payload: { roomId: string; message: string }) {
    this.room?.sendMessage('local-player', payload.message);
  }

  on(event: ServerEvent, handler: (data: any) => void) {
    if (this.room) {
      this.room.on(event, handler);
    } else {
      this.pendingListeners.push({ event, handler });
    }
  }

  off(event: ServerEvent, handler: (data: any) => void) {
    if (this.room) {
      this.room.off(event, handler);
    } else {
      this.pendingListeners = this.pendingListeners.filter(
        (e) => !(e.event === event && e.handler === handler),
      );
    }
  }

  dispose() {
    this.room?.destroy();
    this.room = null;
    this.pendingListeners = [];
  }
}
