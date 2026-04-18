import { io, Socket } from 'socket.io-client';
import { GameTransport, JoinRoomPayload, BidPayload, PlayCardPayload } from './GameTransport';
import { CLIENT_EVENTS, ServerEvent } from '../constants/events';
import { SERVER_URL } from '../constants/game';

export class OnlineTransport implements GameTransport {
  private socket: Socket;

  constructor() {
    this.socket = io(SERVER_URL, { autoConnect: false, transports: ['websocket'] });
    this.socket.connect();
  }

  private emit<T>(event: string, payload: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      this.socket.emit(event, payload, (response: { error?: string } & T) => {
        if (response?.error) reject(new Error(response.error));
        else resolve(response as T);
      });
    });
  }

  joinRoom(payload: JoinRoomPayload) {
    return this.emit<{ room: any; yourPlayer: any }>(CLIENT_EVENTS.JOIN_ROOM, payload);
  }

  leaveRoom(payload: { roomId: string }) {
    this.socket.emit(CLIENT_EVENTS.LEAVE_ROOM, payload);
  }

  addAI(payload: { roomId: string; seatIndex: number }) {
    return this.emit<{ success: boolean }>(CLIENT_EVENTS.ADD_AI, payload);
  }

  removeAI(payload: { roomId: string; seatIndex: number }) {
    return this.emit<{ success: boolean }>(CLIENT_EVENTS.REMOVE_AI, payload);
  }

  startGame(payload: { roomId: string }) {
    return this.emit<{ success: boolean }>(CLIENT_EVENTS.START_GAME, payload);
  }

  placeBid(payload: BidPayload) {
    return this.emit<{ success: boolean }>(CLIENT_EVENTS.PLACE_BID, payload);
  }

  pass(payload: { gameId: string }) {
    return this.emit<{ success: boolean }>(CLIENT_EVENTS.PASS, payload);
  }

  double(payload: { gameId: string }) {
    return this.emit<{ success: boolean }>(CLIENT_EVENTS.DOUBLE, payload);
  }

  redouble(payload: { gameId: string }) {
    return this.emit<{ success: boolean }>(CLIENT_EVENTS.REDOUBLE, payload);
  }

  playCard(payload: PlayCardPayload) {
    return this.emit<{ success: boolean }>(CLIENT_EVENTS.PLAY_CARD, payload);
  }

  requestTrickHistory(payload: { gameId: string }) {
    this.socket.emit(CLIENT_EVENTS.REQUEST_TRICK_HISTORY, payload);
  }

  voteTrickHistory(payload: { gameId: string; vote: boolean }) {
    this.socket.emit(CLIENT_EVENTS.VOTE_TRICK_HISTORY, payload);
  }

  sendMessage(payload: { roomId: string; message: string }) {
    this.socket.emit(CLIENT_EVENTS.SEND_MESSAGE, payload);
  }

  on(event: ServerEvent, handler: (data: any) => void) {
    this.socket.on(event, handler);
  }

  off(event: ServerEvent, handler: (data: any) => void) {
    this.socket.off(event, handler);
  }

  dispose() {
    this.socket.disconnect();
  }
}
