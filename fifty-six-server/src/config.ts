export const config = {
  port: parseInt(process.env.PORT ?? '3001'),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:8081',
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-change-in-production',
  roomExpiryMs: parseInt(process.env.ROOM_EXPIRY_MS ?? String(4 * 60 * 60 * 1000)),
  reconnectWindowMs: parseInt(process.env.RECONNECT_WINDOW_MS ?? String(2 * 60 * 1000)),
  aiTurnDelayMs: parseInt(process.env.AI_TURN_DELAY_MS ?? '1200'),
};
