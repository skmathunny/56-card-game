import { Socket } from 'socket.io';
import { z } from 'zod';
import { RoomManager } from '../rooms/RoomManager';
import { CLIENT_EVENTS } from './eventNames';
import { logger } from '../utils/logger';

// Range 14–56 covers both 4-player (14–28) and 6/8-player (28–56).
// The engine enforces the exact per-playerCount range; the schema only
// acts as a loose guard to reject non-numeric garbage early.
const BidSchema = z.object({
  gameId: z.string(),
  amount: z.number().int().min(14).max(56).optional(),
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

  const log = logger.child({ socketId: socket.id });

  socket.on(CLIENT_EVENTS.PLACE_BID, (payload: unknown, ack?: Function) => {
    const parsed = BidSchema.safeParse(payload);
    if (!parsed.success) {
      log.warn({ event: 'PLACE_BID', errors: parsed.error.issues }, 'Invalid bid payload');
      return ack?.({ error: 'INVALID_PAYLOAD' });
    }

    const r = room();
    const pid = playerId();
    if (!r || !pid) {
      log.warn({ event: 'PLACE_BID', pid, hasRoom: !!r }, 'Player not in room');
      return ack?.({ error: 'NOT_IN_ROOM' });
    }

    log.info({ event: 'PLACE_BID', pid, roomId: r.id, amount: parsed.data.amount, trump: parsed.data.trump }, 'Bid placed');
    const error = r.handleBid(pid, {
      playerId: pid,
      type: 'bid',
      amount: parsed.data.amount,
      trump: parsed.data.trump,
    });

    if (error) {
      log.warn({ event: 'PLACE_BID', pid, roomId: r.id, error }, 'Bid rejected by engine');
      return ack?.({ error });
    }
    ack?.({ success: true });
  });

  socket.on(CLIENT_EVENTS.PASS, (payload: unknown, ack?: Function) => {
    const parsed = PassDoubleSchema.safeParse(payload);
    if (!parsed.success) {
      log.warn({ event: 'PASS', errors: parsed.error.issues }, 'Invalid pass payload');
      return ack?.({ error: 'INVALID_PAYLOAD' });
    }

    const r = room();
    const pid = playerId();
    if (!r || !pid) return ack?.({ error: 'NOT_IN_ROOM' });

    log.info({ event: 'PASS', pid, roomId: r.id }, 'Pass');
    const error = r.handleBid(pid, { playerId: pid, type: 'pass' });
    if (error) {
      log.warn({ event: 'PASS', pid, roomId: r.id, error }, 'Pass rejected');
      return ack?.({ error });
    }
    ack?.({ success: true });
  });

  socket.on(CLIENT_EVENTS.DOUBLE, (payload: unknown, ack?: Function) => {
    const parsed = PassDoubleSchema.safeParse(payload);
    if (!parsed.success) return ack?.({ error: 'INVALID_PAYLOAD' });

    const r = room();
    const pid = playerId();
    if (!r || !pid) return ack?.({ error: 'NOT_IN_ROOM' });

    log.info({ event: 'DOUBLE', pid, roomId: r.id }, 'Double');
    const error = r.handleBid(pid, { playerId: pid, type: 'double' });
    if (error) {
      log.warn({ event: 'DOUBLE', pid, roomId: r.id, error }, 'Double rejected');
      return ack?.({ error });
    }
    ack?.({ success: true });
  });

  socket.on(CLIENT_EVENTS.REDOUBLE, (payload: unknown, ack?: Function) => {
    const parsed = PassDoubleSchema.safeParse(payload);
    if (!parsed.success) return ack?.({ error: 'INVALID_PAYLOAD' });

    const r = room();
    const pid = playerId();
    if (!r || !pid) return ack?.({ error: 'NOT_IN_ROOM' });

    log.info({ event: 'REDOUBLE', pid, roomId: r.id }, 'Redouble');
    const error = r.handleBid(pid, { playerId: pid, type: 'redouble' });
    if (error) {
      log.warn({ event: 'REDOUBLE', pid, roomId: r.id, error }, 'Redouble rejected');
      return ack?.({ error });
    }
    ack?.({ success: true });
  });

  socket.on(CLIENT_EVENTS.PLAY_CARD, (payload: unknown, ack?: Function) => {
    const parsed = PlayCardSchema.safeParse(payload);
    if (!parsed.success) {
      log.warn({ event: 'PLAY_CARD', errors: parsed.error.issues }, 'Invalid play-card payload');
      return ack?.({ error: 'INVALID_PAYLOAD' });
    }

    const r = room();
    const pid = playerId();
    if (!r || !pid) return ack?.({ error: 'NOT_IN_ROOM' });

    log.info({ event: 'PLAY_CARD', pid, roomId: r.id, cardId: parsed.data.cardId }, 'Card played');
    const error = r.handlePlayCard(pid, parsed.data.cardId);
    if (error) {
      log.warn({ event: 'PLAY_CARD', pid, roomId: r.id, cardId: parsed.data.cardId, error }, 'Play rejected by engine');
      return ack?.({ error });
    }
    ack?.({ success: true });
  });

  socket.on(CLIENT_EVENTS.REQUEST_TRICK_HISTORY, (payload: unknown) => {
    const parsed = TrickHistorySchema.safeParse(payload);
    if (!parsed.success) return;

    const r = room();
    const pid = playerId();
    if (!r || !pid) return;

    log.info({ event: 'REQUEST_TRICK_HISTORY', pid, roomId: r.id }, 'Trick history requested');
    r.requestTrickHistory(pid);
  });

  socket.on(CLIENT_EVENTS.VOTE_TRICK_HISTORY, (payload: unknown) => {
    const parsed = VoteTrickHistorySchema.safeParse(payload);
    if (!parsed.success) return;

    const r = room();
    const pid = playerId();
    if (!r || !pid) return;

    log.info({ event: 'VOTE_TRICK_HISTORY', pid, roomId: r.id, vote: parsed.data.vote }, 'Trick history vote');
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
