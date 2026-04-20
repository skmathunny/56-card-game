import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { z } from 'zod';
import { config } from './config';
import { RoomManager } from './rooms/RoomManager';
import { initSocketServer } from './sockets/socketServer';
import { logger } from './utils/logger';

const app = express();
app.use(cors({ origin: config.clientOrigin }));
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: config.clientOrigin,
    methods: ['GET', 'POST'],
  },
});

const roomManager = new RoomManager(io);
initSocketServer(io, roomManager);

// ── REST routes ──────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const CreateRoomSchema = z.object({
  playerCount: z.union([z.literal(4), z.literal(6), z.literal(8)]),
  startingTables: z.number().int().min(1).max(50).default(12),
  bidTimerSeconds: z.number().int().min(10).max(120).default(30),
  playTimerSeconds: z.number().int().min(10).max(120).default(30),
  expiryHours: z.number().min(1).max(24).default(4),
});

app.post('/rooms', (req, res) => {
  const parsed = CreateRoomSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  if (roomManager.isFull()) {
    return res.status(429).json({ error: 'SERVER_ROOM_LIMIT', message: 'The server has reached its maximum of 5 simultaneous game rooms. Please try again later.' });
  }

  const room = roomManager.createRoom(parsed.data);
  return res.status(201).json({ roomId: room.id, code: room.code, settings: room.settings });
});

app.get('/rooms/:code', (req, res) => {
  const room = roomManager.getRoomByCode(req.params.code);
  if (!room) return res.status(404).json({ error: 'ROOM_NOT_FOUND' });
  return res.json(room.getPublicRoomInfo());
});

// ── Start ────────────────────────────────────────────────────────────────────

httpServer.listen(config.port, () => {
  logger.info({ port: config.port }, '56-card-game server started');
});
