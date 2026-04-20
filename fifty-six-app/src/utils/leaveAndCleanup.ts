import { GameTransport } from '../services/GameTransport';

export async function leaveAndCleanup(
  transport: GameTransport,
  roomId: string | null | undefined,
  clearGame: () => void,
  clearLobby: () => void,
  resetUI: () => void,
  disconnectSocket = false,
) {
  if (roomId) {
    try { transport.leaveRoom({ roomId }); } catch (e) {
      console.warn('leaveRoom failed, continuing:', e);
    }
  }
  clearGame();
  clearLobby();
  resetUI();
  if (disconnectSocket && transport.disconnect) {
    try { await transport.disconnect(); } catch (e) {
      console.warn('disconnect failed, continuing:', e);
    }
  }
}
