import { Server } from 'socket.io';
import { GameRoom, RoomSettings } from './GameRoom';
import { logger } from '../utils/logger';

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

const MAX_ROOMS = 5;

export class RoomManager {
  private rooms = new Map<string, GameRoom>();
  private codeToId = new Map<string, string>();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  get roomCount(): number {
    return this.rooms.size;
  }

  isFull(): boolean {
    return this.rooms.size >= MAX_ROOMS;
  }

  createRoom(settings: RoomSettings): GameRoom {
    const id = `room-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    let code: string;

    do { code = generateRoomCode(); } while (this.codeToId.has(code));

    const room = new GameRoom(id, code, settings, this.io);
    this.rooms.set(id, room);
    this.codeToId.set(code, id);

    logger.info({ roomId: id, code }, 'Room created');
    return room;
  }

  getRoomByCode(code: string): GameRoom | null {
    const id = this.codeToId.get(code.toUpperCase());
    return id ? this.rooms.get(id) ?? null : null;
  }

  getRoomById(id: string): GameRoom | null {
    return this.rooms.get(id) ?? null;
  }

  getRoomBySocketId(socketId: string): GameRoom | null {
    for (const room of this.rooms.values()) {
      const players = room.getPublicPlayers();
      if (players.some(() => true)) {
        // Use the room's socket membership to find it
        const info = room.getPublicRoomInfo();
        if (info) return room;
      }
    }
    return null;
  }

  deleteRoom(id: string): void {
    const room = this.rooms.get(id);
    if (!room) return;
    room.destroy();
    this.codeToId.delete(room.code);
    this.rooms.delete(id);
    logger.info({ roomId: id }, 'Room deleted');
  }

  deleteIfEmpty(room: GameRoom): void {
    if (room.isEmpty()) this.deleteRoom(room.id);
  }
}
