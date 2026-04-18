import { Socket } from 'socket.io';
import { z } from 'zod';
import { RoomManager } from '../rooms/RoomManager';
import { CLIENT_EVENTS } from './eventNames';

const BidSchema = z.object({
  gameId: z.string(),
  amount: z.number().int().min(28).max(56).optional(),
  trump: z.enum(['spades', 'hearts', 'diamonds', 'clubs', 'no-trumps']).optional(),
  conventionId: z.string().default('number-first'),
});

const PassDoubleSchema = z.object({ gameId: z.string() });

const PlayCardSchema = z.object({
  gameId: z.string(),
  cardId: z.string(),
});

const TrickHistorySchema = z.object({ gameId: z.string() });

const VoteTrickHistorySchema = z.object({
  gameId: z.string(),
  vote: z.boolean(),
});

const ChatSchema = z.object({
  roomId: z.string(),
  message: z.string().min(1).max(500),
});

export function registerGameHandlers(socket: Socket, roomManager: RoomManager): void {
  const playerId = (): string | undefined => socket.data.playerId;
  const room = () => {
    const roomId = socket.data.roomId;
    return roomId ? roomManager.getRoomById(roomId) : null;
  };

  socket.on(CLIENT_EVENTS.PLACE_BID, (payload: unknown, ack?: Function) => {
    const parsed = BidSchema.safeParse(payload);
    if (!parsed.success) return ack?.({ error: 'INVALID_PAYLOAD' });

    const r = room();
    const pid = playerId();
    if (!r || !pid) return ack?.({ error: 'NOT_IN_ROOM' });

    const error = r.handleBid(pid, {
      playerId: pid,
      type: 'bid',
      amount: parsed.data.amount,
      trump: parsed.data.trump,
    });

    error ? ack?.({ error }) : ack?.({ success: true });
  });

  socket.on(CLIENT_EVENTS.PASS, (payload: unknown, ack?: Function) => {
    const parsed = PassDoubleSchema.safeParse(payload);
    if (!parsed.success) return ack?.({ error: 'INVALID_PAYLOAD' });

    const r = room();
    const pid = playerId();
    if (!r || !pid) return ack?.({ error: 'NOT_IN_ROOM' });

    const error = r.handleBid(pid, { playerId: pid, type: 'pass' });
    error ? ack?.({ error }) : ack?.({ success: true });
  });

  socket.on(CLIENT_EVENTS.DOUBLE, (payload: unknown, ack?: Function) => {
    const parsed = PassDoubleSchema.safeParse(payload);
    if (!parsed.success) return ack?.({ error: 'INVALID_PAYLOAD' });

    const r = room();
    const pid = playerId();
    if (!r || !pid) return ack?.({ error: 'NOT_IN_ROOM' });

    const error = r.handleBid(pid, { playerId: pid, type: 'double' });
    error ? ack?.({ error }) : ack?.({ success: true });
  });

  socket.on(CLIENT_EVENTS.REDOUBLE, (payload: unknown, ack?: Function) => {
    const parsed = PassDoubleSchema.safeParse(payload);
    if (!parsed.success) return ack?.({ error: 'INVALID_PAYLOAD' });

    const r = room();
    const pid = playerId();
    if (!r || !pid) return ack?.({ error: 'NOT_IN_ROOM' });

    const error = r.handleBid(pid, { playerId: pid, type: 'redouble' });
    error ? ack?.({ error }) : ack?.({ success: true });
  });

  socket.on(CLIENT_EVENTS.PLAY_CARD, (payload: unknown, ack?: Function) => {
    const parsed = PlayCardSchema.safeParse(payload);
    if (!parsed.success) return ack?.({ error: 'INVALID_PAYLOAD' });

    const r = room();
    const pid = playerId();
    if (!r || !pid) return ack?.({ error: 'NOT_IN_ROOM' });

    const error = r.handlePlayCard(pid, parsed.data.cardId);
    error ? ack?.({ error }) : ack?.({ success: true });
  });

  socket.on(CLIENT_EVENTS.REQUEST_TRICK_HISTORY, (payload: unknown) => {
    const parsed = TrickHistorySchema.safeParse(payload);
    if (!parsed.success) return;

    const r = room();
    const pid = playerId();
    if (!r || !pid) return;

    r.requestTrickHistory(pid);
  });

  socket.on(CLIENT_EVENTS.VOTE_TRICK_HISTORY, (payload: unknown) => {
    const parsed = VoteTrickHistorySchema.safeParse(payload);
    if (!parsed.success) return;

    const r = room();
    const pid = playerId();
    if (!r || !pid) return;

    r.voteTrickHistory(pid, parsed.data.vote);
  });

  socket.on(CLIENT_EVENTS.SEND_MESSAGE, (payload: unknown) => {
    const parsed = ChatSchema.safeParse(payload);
    if (!parsed.success) return;

    const r = room();
    const pid = playerId();
    if (!r || !pid) return;

    r.sendMessage(pid, parsed.data.message);
  });
}
