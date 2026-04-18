import { Server } from 'socket.io';
import { RoomManager } from '../rooms/RoomManager';
import { registerRoomHandlers } from './roomHandlers';
import { registerGameHandlers } from './gameHandlers';
import { logger } from '../utils/logger';

export function initSocketServer(io: Server, roomManager: RoomManager): void {

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id }, 'Socket connected');

    registerRoomHandlers(socket, roomManager);
    registerGameHandlers(socket, roomManager);

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Socket disconnected');
      const roomId = socket.data.roomId;
      if (!roomId) return;

      const room = roomManager.getRoomById(roomId);
      if (!room) return;

      room.handleDisconnect(socket.id);
      roomManager.deleteIfEmpty(room);
    });

    // Reconnect: client sends their stored playerId on re-connection
    socket.on('reconnect-player', (payload: { playerId: string; roomId: string }) => {
      const room = roomManager.getRoomById(payload.roomId);
      if (!room) return;
      room.handleReconnect(socket, payload.playerId);
    });
  });
}
