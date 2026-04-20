import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Alert } from 'react-native';
import { ROUTES } from '../navigation/routes';
import { useTransport } from '../services/transportContext';
import { GameTransport } from '../services/GameTransport';
import { useGameStore } from '../store/gameSlice';
import { useLobbyStore } from '../store/lobbySlice';
import { useUIStore } from '../store/uiSlice';

type Nav = NativeStackNavigationProp<any>;

async function leaveAndCleanup(
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

export function useGameExit() {
  const navigation = useNavigation<Nav>();
  const transport = useTransport();
  const { clearGame } = useGameStore();
  const { roomId, clearLobby } = useLobbyStore();
  const { resetUI } = useUIStore();
  const [isLoading, setIsLoading] = useState(false);

  // Leave mid-round → AI takes over seat → room selection (Home)
  const exitRound = useCallback(async () => {
    setIsLoading(true);
    try {
      await leaveAndCleanup(transport, roomId, clearGame, clearLobby, resetUI, false);
      navigation.replace(ROUTES.HOME);
    } catch (e) {
      Alert.alert('Error', 'Failed to exit round: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [roomId, transport, clearGame, clearLobby, resetUI, navigation]);

  // Leave game entirely → AI takes over seat → Home
  const exitGame = useCallback(async () => {
    setIsLoading(true);
    try {
      await leaveAndCleanup(transport, roomId, clearGame, clearLobby, resetUI, false);
      navigation.replace(ROUTES.HOME);
    } catch (e) {
      Alert.alert('Error', 'Failed to exit game: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [roomId, transport, clearGame, clearLobby, resetUI, navigation]);

  // Clear session → disconnect socket → Login
  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await leaveAndCleanup(transport, roomId, clearGame, clearLobby, resetUI, true);
      navigation.replace(ROUTES.LOGIN);
    } catch (e) {
      Alert.alert('Error', 'Failed to logout: ' + (e instanceof Error ? e.message : String(e)));
    } finally {
      setIsLoading(false);
    }
  }, [roomId, transport, clearGame, clearLobby, resetUI, navigation]);

  return { isLoading, exitRound, exitGame, logout };
}
