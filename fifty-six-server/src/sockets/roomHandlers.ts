import { Socket } from 'socket.io';
import { z } from 'zod';
import { RoomManager } from '../rooms/RoomManager';
import { CLIENT_EVENTS } from './eventNames';
import { logger } from '../utils/logger';

const JoinRoomSchema = z.object({
  roomCode: z.string().min(1),
  displayName: z.string().min(1).max(20),
  avatarUrl: z.string().default(''),
  userId: z.string().nullable().default(null),
});

const AddRemoveAISchema = z.object({
  roomId: z.string(),
  seatIndex: z.number().int().min(0).max(7),
});

const StartGameSchema = z.object({ roomId: z.string() });
const LeaveRoomSchema = z.object({ roomId: z.string() });

export function registerRoomHandlers(socket: Socket, roomManager: RoomManager): void {

  socket.on(CLIENT_EVENTS.JOIN_ROOM, (payload: unknown, ack?: Function) => {
    const parsed = JoinRoomSchema.safeParse(payload);
    if (!parsed.success) return ack?.({ error: 'INVALID_PAYLOAD' });

    const { roomCode, displayName, avatarUrl, userId } = parsed.data;
    const room = roomManager.getRoomByCode(roomCode);
    if (!room) return ack?.({ error: 'ROOM_NOT_FOUND' });
    if (room.isFull()) return ack?.({ error: 'ROOM_FULL' });

    const player = room.addPlayer(socket, displayName, avatarUrl, userId);
    if (!player) return ack?.({ error: 'ROOM_FULL' });

    logger.info({ roomId: room.id, playerId: player.id, displayName }, 'Player joined room');
    ack?.({ room: room.getPublicRoomInfo(), yourPlayer: player });
  });

  socket.on(CLIENT_EVENTS.LEAVE_ROOM, (payload: unknown) => {
    const parsed = LeaveRoomSchema.safeParse(payload);
    if (!parsed.success) return;

    const room = roomManager.getRoomById(parsed.data.roomId);
    const playerId = socket.data.playerId;
    if (!room || !playerId) return;

    room.removePlayer(playerId);
    socket.leave(room.id);
    roomManager.deleteIfEmpty(room);
  });

  socket.on(CLIENT_EVENTS.ADD_AI, (payload: unknown, ack?: Function) => {
    const parsed = AddRemoveAISchema.safeParse(payload);
    if (!parsed.success) return ack?.({ error: 'INVALID_PAYLOAD' });

    const room = roomManager.getRoomById(parsed.data.roomId);
    if (!room) return ack?.({ error: 'ROOM_NOT_FOUND' });

    const ai = room.addAI(parsed.data.seatIndex);
    if (!ai) return ack?.({ error: 'SEAT_TAKEN' });

    ack?.({ success: true });
  });

  socket.on(CLIENT_EVENTS.REMOVE_AI, (payload: unknown, ack?: Function) => {
    const parsed = AddRemoveAISchema.safeParse(payload);
    if (!parsed.success) return ack?.({ error: 'INVALID_PAYLOAD' });

    const room = roomManager.getRoomById(parsed.data.roomId);
    if (!room) return ack?.({ error: 'ROOM_NOT_FOUND' });

    const removed = room.removeAI(parsed.data.seatIndex);
    if (!removed) return ack?.({ error: 'NO_AI_AT_SEAT' });

    ack?.({ success: true });
  });

  socket.on(CLIENT_EVENTS.START_GAME, (payload: unknown, ack?: Function) => {
    const parsed = StartGameSchema.safeParse(payload);
    if (!parsed.success) return ack?.({ error: 'INVALID_PAYLOAD' });

    const room = roomManager.getRoomById(parsed.data.roomId);
    const playerId = socket.data.playerId;
    if (!room || !playerId) return ack?.({ error: 'ROOM_NOT_FOUND' });

    const started = room.startGame(playerId);
    if (!started) return ack?.({ error: 'CANNOT_START' });

    ack?.({ success: true });
  });
}
