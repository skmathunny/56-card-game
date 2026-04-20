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
    console.log('🔄 exitRound: Starting...');
    setIsLoading(true);
    try {
      // Notify server that player is leaving the round
      if (roomId && transport.leaveRound) {
        try {
          console.log('🔄 exitRound: Notifying server...');
          await transport.leaveRound({ roomId });
          console.log('✅ exitRound: Server notified');
        } catch (serverError) {
          console.warn('⚠️ Server error, continuing anyway:', serverError);
        }
      }
      
      // Clear game state but keep lobby
      console.log('🔄 exitRound: Clearing game state...');
      clearGame();
      resetUI();
      console.log('✅ exitRound: State cleared');
      
      // Navigate back to waiting room
      console.log('🔄 exitRound: Navigating to waiting room...');
      navigation.replace(ROUTES.WAITING_ROOM);
      console.log('✅ exitRound: Complete');
    } catch (error) {
      console.error('❌ Error exiting round:', error);
      setIsLoading(false);
    }
  }, [roomId, transport, clearGame, resetUI, navigation]);

  /**
   * Exit entire game - player leaves and returns to home
   */
  const exitGame = useCallback(async () => {
    console.log('🚪 exitGame: Starting...');
    setIsLoading(true);
    try {
      // Notify server that player is leaving the game
      if (roomId && transport.leaveGame) {
        try {
          console.log('🚪 exitGame: Notifying server...');
          await transport.leaveGame({ roomId });
          console.log('✅ exitGame: Server notified');
        } catch (serverError) {
          console.warn('⚠️ Server error, continuing anyway:', serverError);
        }
      }
      
      // Clear all game and lobby state
      console.log('🚪 exitGame: Clearing game and lobby state...');
      clearGame();
      clearLobby();
      resetUI();
      console.log('✅ exitGame: State cleared');
      
      // Navigate back to home
      console.log('🚪 exitGame: Navigating to home...');
      navigation.replace(ROUTES.HOME);
      console.log('✅ exitGame: Complete');
    } catch (error) {
      console.error('❌ Error exiting game:', error);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, transport, clearGame, clearLobby, resetUI, navigation]);

  /**
   * Logout from app - complete session cleanup
   */
  const logout = useCallback(async () => {
    console.log('🚪 logout: Starting...');
    setIsLoading(true);
    try {
      // Try to notify server of logout
      if (roomId && transport.leaveGame) {
        try {
          console.log('🚪 logout: Notifying server...');
          await transport.leaveGame({ roomId });
          console.log('✅ logout: Server notified');
        } catch (serverError) {
          console.warn('⚠️ Server error, continuing anyway:', serverError);
        }
      }
      
      // Clear all state
      console.log('🚪 logout: Clearing all state...');
      clearGame();
      clearLobby();
      resetUI();
      console.log('✅ logout: State cleared');
      
      // Disconnect socket
      if (transport.disconnect) {
        try {
          console.log('🚪 logout: Disconnecting socket...');
          await transport.disconnect();
          console.log('✅ logout: Socket disconnected');
        } catch (disconnectError) {
          console.warn('⚠️ Disconnect error, continuing anyway:', disconnectError);
        }
      }
      
      // Navigate to login
      console.log('🚪 logout: Navigating to login...');
      navigation.replace(ROUTES.LOGIN);
      console.log('✅ logout: Complete');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Force navigation to login even if there were errors
      try {
        navigation.replace(ROUTES.LOGIN);
      } catch (navError) {
        console.error('❌ Navigation error:', navError);
      }
    } finally {
      setIsLoading(false);
    }
  }, [roomId, transport, clearGame, clearLobby, resetUI, navigation]);
    }
  }, [roomId, transport, clearGame, clearLobby, resetUI, navigation]);

  return {
    isLoading,
    exitRound,
    exitGame,
    logout,
  };
}
