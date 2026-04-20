import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert } from 'react-native';
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
    let errorMsg = '';
    
    try {
      // Notify server that player is leaving the round
      if (roomId && transport.leaveRound) {
        try {
          console.log('🔄 exitRound: Notifying server about round exit...');
          const result = await transport.leaveRound({ roomId });
          console.log('✅ exitRound: Server notified, result:', result);
        } catch (serverError) {
          const msg = serverError instanceof Error ? serverError.message : String(serverError);
          console.warn('⚠️  exitRound: Server notify failed, continuing:', msg);
          errorMsg = msg;
        }
      } else {
        console.warn('⚠️ exitRound: leaveRound method not available on transport');
      }
      
      // Clear game state but keep lobby
      try {
        console.log('🔄 exitRound: Clearing game state...');
        clearGame();
        console.log('✅ exitRound: Game state cleared');
      } catch (clearError) {
        const msg = clearError instanceof Error ? clearError.message : String(clearError);
        console.error('❌ exitRound: Failed to clear game state:', msg);
        errorMsg = msg;
      }
      
      try {
        console.log('🔄 exitRound: Resetting UI...');
        resetUI();
        console.log('✅ exitRound: UI reset');
      } catch (uiError) {
        const msg = uiError instanceof Error ? uiError.message : String(uiError);
        console.error('❌ exitRound: Failed to reset UI:', msg);
        errorMsg = msg;
      }
      
      // Navigate back to waiting room
      try {
        console.log('🔄 exitRound: Navigating to ' + ROUTES.WAITING_ROOM + '...');
        navigation.replace(ROUTES.WAITING_ROOM as never);
        console.log('✅ exitRound: Navigation succeeded');
      } catch (navError) {
        const msg = navError instanceof Error ? navError.message : String(navError);
        console.error('❌ exitRound: Navigation failed:', msg);
        errorMsg = msg;
        Alert.alert('Navigation Error', 'Failed to navigate to waiting room: ' + msg);
      }
      
      console.log('✅ exitRound: Complete');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ exitRound: Unexpected error:', msg);
      errorMsg = msg;
      Alert.alert('Exit Round Error', 'An unexpected error occurred: ' + msg);
    } finally {
      setIsLoading(false);
    }
  }, [roomId, transport, clearGame, resetUI, navigation]);

  /**
   * Exit entire game - player leaves and returns to home
   */
  const exitGame = useCallback(async () => {
    console.log('🚪 exitGame: Starting...');
    setIsLoading(true);
    let errorMsg = '';
    
    try {
      // Notify server that player is leaving the game
      if (roomId && transport.leaveGame) {
        try {
          console.log('🚪 exitGame: Notifying server about game exit...');
          const result = await transport.leaveGame({ roomId });
          console.log('✅ exitGame: Server notified, result:', result);
        } catch (serverError) {
          const msg = serverError instanceof Error ? serverError.message : String(serverError);
          console.warn('⚠️ exitGame: Server notify failed, continuing:', msg);
          errorMsg = msg;
        }
      } else {
        console.warn('⚠️ exitGame: leaveGame method not available on transport');
      }
      
      // Clear all game and lobby state
      try {
        console.log('🚪 exitGame: Clearing game state...');
        clearGame();
        console.log('✅ exitGame: Game state cleared');
      } catch (clearError) {
        const msg = clearError instanceof Error ? clearError.message : String(clearError);
        console.error('❌ exitGame: Failed to clear game state:', msg);
        errorMsg = msg;
      }
      
      try {
        console.log('🚪 exitGame: Clearing lobby state...');
        clearLobby();
        console.log('✅ exitGame: Lobby state cleared');
      } catch (clearError) {
        const msg = clearError instanceof Error ? clearError.message : String(clearError);
        console.error('❌ exitGame: Failed to clear lobby state:', msg);
        errorMsg = msg;
      }
      
      try {
        console.log('🚪 exitGame: Resetting UI...');
        resetUI();
        console.log('✅ exitGame: UI reset');
      } catch (uiError) {
        const msg = uiError instanceof Error ? uiError.message : String(uiError);
        console.error('❌ exitGame: Failed to reset UI:', msg);
        errorMsg = msg;
      }
      
      // Navigate back to home
      try {
        console.log('🚪 exitGame: Navigating to ' + ROUTES.HOME + '...');
        navigation.replace(ROUTES.HOME as never);
        console.log('✅ exitGame: Navigation succeeded');
      } catch (navError) {
        const msg = navError instanceof Error ? navError.message : String(navError);
        console.error('❌ exitGame: Navigation failed:', msg);
        errorMsg = msg;
        Alert.alert('Navigation Error', 'Failed to navigate to home: ' + msg);
      }
      
      console.log('✅ exitGame: Complete');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ exitGame: Unexpected error:', msg);
      errorMsg = msg;
      Alert.alert('Exit Game Error', 'An unexpected error occurred: ' + msg);
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
    let errorMsg = '';
    
    try {
      // Try to notify server of logout
      if (roomId && transport.leaveGame) {
        try {
          console.log('🚪 logout: Notifying server about logout...');
          const result = await transport.leaveGame({ roomId });
          console.log('✅ logout: Server notified, result:', result);
        } catch (serverError) {
          const msg = serverError instanceof Error ? serverError.message : String(serverError);
          console.warn('⚠️ logout: Server notify failed, continuing:', msg);
          errorMsg = msg;
        }
      } else {
        console.warn('⚠️ logout: leaveGame method not available on transport');
      }
      
      // Clear all state
      try {
        console.log('🚪 logout: Clearing game state...');
        clearGame();
        console.log('✅ logout: Game state cleared');
      } catch (clearError) {
        const msg = clearError instanceof Error ? clearError.message : String(clearError);
        console.error('❌ logout: Failed to clear game state:', msg);
        errorMsg = msg;
      }
      
      try {
        console.log('🚪 logout: Clearing lobby state...');
        clearLobby();
        console.log('✅ logout: Lobby state cleared');
      } catch (clearError) {
        const msg = clearError instanceof Error ? clearError.message : String(clearError);
        console.error('❌ logout: Failed to clear lobby state:', msg);
        errorMsg = msg;
      }
      
      try {
        console.log('🚪 logout: Resetting UI...');
        resetUI();
        console.log('✅ logout: UI reset');
      } catch (uiError) {
        const msg = uiError instanceof Error ? uiError.message : String(uiError);
        console.error('❌ logout: Failed to reset UI:', msg);
        errorMsg = msg;
      }
      
      // Disconnect socket
      if (transport.disconnect) {
        try {
          console.log('🚪 logout: Disconnecting socket...');
          await transport.disconnect();
          console.log('✅ logout: Socket disconnected');
        } catch (disconnectError) {
          const msg = disconnectError instanceof Error ? disconnectError.message : String(disconnectError);
          console.warn('⚠️ logout: Disconnect failed, continuing:', msg);
          errorMsg = msg;
        }
      } else {
        console.warn('⚠️ logout: disconnect method not available on transport');
      }
      
      // Navigate to login
      try {
        console.log('🚪 logout: Navigating to ' + ROUTES.LOGIN + '...');
        navigation.replace(ROUTES.LOGIN as never);
        console.log('✅ logout: Navigation succeeded');
      } catch (navError) {
        const msg = navError instanceof Error ? navError.message : String(navError);
        console.error('❌ logout: Navigation failed:', msg);
        errorMsg = msg;
        Alert.alert('Navigation Error', 'Failed to navigate to login: ' + msg);
      }
      
      console.log('✅ logout: Complete');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error('❌ logout: Unexpected error:', msg);
      errorMsg = msg;
      Alert.alert('Logout Error', 'An unexpected error occurred: ' + msg);
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
