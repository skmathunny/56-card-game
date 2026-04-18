import { useEffect } from 'react';
import { useTransport } from '../services/transportContext';
import { useGameStore } from '../store/gameSlice';
import { useUIStore } from '../store/uiSlice';
import { SERVER_EVENTS } from '../constants/events';

export function useSocket() {
  const transport = useTransport();
  const { setGameState, setRoundSummary, addChatMessage, setPlayerDisconnected, setPlayerReconnected } = useGameStore();
  const { setRoundSummaryVisible, showTrickHistoryVote, setTrickHistoryOpen } = useUIStore();

  useEffect(() => {
    const onStateUpdated = (data: { publicState: any; privateHand: any[] }) => {
      setGameState(data.publicState, data.privateHand);
    };

    const onRoundComplete = (data: { roundSummary: any }) => {
      setRoundSummary(data.roundSummary);
      setRoundSummaryVisible(true);
    };

    const onTrickHistoryRequested = (data: { requestingPlayerName: string }) => {
      showTrickHistoryVote(data);
    };

    const onTrickHistoryResult = (data: { approved: boolean }) => {
      if (data.approved) setTrickHistoryOpen(true);
    };

    const onChatMessage = (data: any) => {
      addChatMessage(data);
    };

    const onPlayerDisconnected = (data: { playerId: string }) => {
      setPlayerDisconnected(data.playerId);
    };

    const onPlayerReconnected = (data: { playerId: string }) => {
      setPlayerReconnected(data.playerId);
    };

    transport.on(SERVER_EVENTS.GAME_STATE_UPDATED,           onStateUpdated);
    transport.on(SERVER_EVENTS.GAME_ROUND_COMPLETE,          onRoundComplete);
    transport.on(SERVER_EVENTS.GAME_TRICK_HISTORY_REQUESTED, onTrickHistoryRequested);
    transport.on(SERVER_EVENTS.GAME_TRICK_HISTORY_RESULT,    onTrickHistoryResult);
    transport.on(SERVER_EVENTS.CHAT_MESSAGE,                 onChatMessage);
    transport.on(SERVER_EVENTS.PLAYER_DISCONNECTED,          onPlayerDisconnected);
    transport.on(SERVER_EVENTS.PLAYER_RECONNECTED,           onPlayerReconnected);

    return () => {
      transport.off(SERVER_EVENTS.GAME_STATE_UPDATED,           onStateUpdated);
      transport.off(SERVER_EVENTS.GAME_ROUND_COMPLETE,          onRoundComplete);
      transport.off(SERVER_EVENTS.GAME_TRICK_HISTORY_REQUESTED, onTrickHistoryRequested);
      transport.off(SERVER_EVENTS.GAME_TRICK_HISTORY_RESULT,    onTrickHistoryResult);
      transport.off(SERVER_EVENTS.CHAT_MESSAGE,                 onChatMessage);
      transport.off(SERVER_EVENTS.PLAYER_DISCONNECTED,          onPlayerDisconnected);
      transport.off(SERVER_EVENTS.PLAYER_RECONNECTED,           onPlayerReconnected);
    };
  }, [transport]);
}
