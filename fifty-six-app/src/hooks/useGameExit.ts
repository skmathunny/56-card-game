import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROUTES } from '../navigation/routes';
import { useTransport } from '../services/transportContext';
import { useGameStore } from '../store/gameSlice';
import { useLobbyStore } from '../store/lobbySlice';
import { useUIStore } from '../store/uiSlice';

type Nav = NativeStackNavigationProp<any>;

/**
 * Hook for handling player exits at different game stages
 * Manages cleanup, navigation, and server communication
 */
export function useGameExit() {
  const navigation = useNavigation<Nav>();
  const transport = useTransport();
  const { clearGame } = useGameStore();
  const { roomId, clearLobby } = useLobbyStore();
  const { resetUI } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Exit current round - player stays in game but returns to waiting room
   */
  const exitRound = useCallback(async () => {
    setIsLoading(true);
    try {
      // Notify server that player is leaving the round
      if (roomId) {
        await transport.leaveRound?.({ roomId });
      }
      
      // Clear game state but keep lobby
      clearGame();
      resetUI();
      
      // Navigate back to waiting room
      navigation.replace(ROUTES.WAITING_ROOM);
    } catch (error) {
      console.error('Error exiting round:', error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, transport, clearGame, resetUI, navigation]);

  /**
   * Exit entire game - player leaves and returns to home
   */
  const exitGame = useCallback(async () => {
    setIsLoading(true);
    try {
      // Notify server that player is leaving the game
      if (roomId) {
        await transport.leaveGame?.({ roomId });
      }
      
      // Clear all game and lobby state
      clearGame();
      clearLobby();
      resetUI();
      
      // Navigate back to home
      navigation.replace(ROUTES.HOME);
    } catch (error) {
      console.error('Error exiting game:', error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, transport, clearGame, clearLobby, resetUI, navigation]);

  /**
   * Logout from app - complete session cleanup
   */
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      // Try to notify server of logout
      if (roomId) {
        await transport.leaveGame?.({ roomId }).catch(() => {
          // Ignore errors on logout
        });
      }
      
      // Clear all state
      clearGame();
      clearLobby();
      resetUI();
      
      // Disconnect socket
      if (transport.disconnect) {
        await transport.disconnect();
      }
      
      // Navigate to login
      navigation.replace(ROUTES.LOGIN);
    } catch (error) {
      console.error('Error during logout:', error);
      // Force navigation to login even if there were errors
      navigation.replace(ROUTES.LOGIN);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, transport, clearGame, clearLobby, resetUI, navigation]);

  return {
    isLoading,
    exitRound,
    exitGame,
    logout,
  };
}
