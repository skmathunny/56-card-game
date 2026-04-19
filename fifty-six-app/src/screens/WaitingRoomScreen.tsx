import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import { Button } from '../components/common';
import { useTransport } from '../services/transportContext';
import { useLobbyStore, RoomPlayer } from '../store/lobbySlice';
import { useGameStore } from '../store/gameSlice';
import { SERVER_EVENTS } from '../constants/events';

type Nav = NativeStackNavigationProp<any>;

const TEAM_COLORS = { A: Colors.teamA, B: Colors.teamB };

export default function WaitingRoomScreen() {
  const navigation  = useNavigation<Nav>();
  const transport   = useTransport();
  const { roomCode, roomId, settings, players, myPlayerId, isHost, setPlayers } = useLobbyStore();
  const { gameState } = useGameStore();

  const [starting, setStarting] = useState(false);

  // Auto-navigate all players (not just the host) when the game starts
  useEffect(() => {
    if (gameState?.phase === 'dealing' || gameState?.phase === 'bidding') {
      navigation.replace(ROUTES.DEAL_AND_BID);
    }
  }, [gameState?.phase]);

  const requiredPlayers = settings?.playerCount ?? 4;
  const filledSeats     = players.length;
  const canStart        = isHost && filledSeats === requiredPlayers;

  // Listen for room updates from the server
  useEffect(() => {
    const onRoomUpdated = (data: { room: { players: RoomPlayer[] } }) => {
      setPlayers(data.room.players);
    };
    transport.on(SERVER_EVENTS.ROOM_UPDATED, onRoomUpdated);
    return () => transport.off(SERVER_EVENTS.ROOM_UPDATED, onRoomUpdated);
  }, [transport]);

  const handleShare = async () => {
    await Share.share({ message: `Join my 56 game! Room code: ${roomCode}` });
  };

  const handleAddAI = async (seatIndex: number) => {
    if (!roomId) return;
    await transport.addAI({ roomId, seatIndex });
  };

  const handleRemoveAI = async (seatIndex: number) => {
    if (!roomId) return;
    await transport.removeAI({ roomId, seatIndex });
  };

  const handleStartGame = async () => {
    if (!roomId) return;
    setStarting(true);
    try {
      await transport.startGame({ roomId });
      // Navigation handled by the gameState effect when GAME_STATE_UPDATED arrives
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not start game');
      setStarting(false);
    }
  };

  const handleLeave = () => {
    const doLeave = () => {
      if (roomId) transport.leaveRoom({ roomId });
      navigation.replace(ROUTES.HOME);
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Leave Room? Are you sure you want to leave?')) doLeave();
    } else {
      Alert.alert('Leave Room', 'Are you sure you want to leave?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Leave', style: 'destructive', onPress: doLeave },
      ]);
    }
  };

  // Build seat grid: filled seats + empty slots up to requiredPlayers
  const seats = Array.from({ length: requiredPlayers }, (_, i) => {
    return players.find((p) => p.seatIndex === i) ?? null;
  });

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleLeave} style={styles.leaveBtn}>
          <Text style={styles.leaveText}>Leave</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Waiting Room</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareIcon}>⎋</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Room code */}
        <TouchableOpacity style={styles.codeCard} onPress={handleShare} activeOpacity={0.8}>
          <Text style={styles.codeLabel}>Room Code</Text>
          <Text style={styles.codeValue}>{roomCode}</Text>
          <Text style={styles.codeSub}>Tap to share</Text>
        </TouchableOpacity>

        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            {filledSeats} / {requiredPlayers} players
          </Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(filledSeats / requiredPlayers) * 100}%` }]} />
          </View>
        </View>

        {/* Seats split by team */}
        {(['A', 'B'] as const).map((team) => (
          <View key={team} style={styles.teamSection}>
            <Text style={[styles.teamLabel, { color: TEAM_COLORS[team] }]}>
              Team {team}
            </Text>
            <View style={styles.seatGrid}>
              {seats
                .filter((_, i) => (team === 'A' ? i % 2 === 0 : i % 2 !== 0))
                .map((player, localIdx) => {
                  const seatIndex = team === 'A' ? localIdx * 2 : localIdx * 2 + 1;
                  return player ? (
                    <View key={seatIndex} style={[styles.seatCard, styles.seatCardFilled]}>
                      <Text style={styles.seatAvatar}>{player.avatarUrl}</Text>
                      <Text style={styles.seatName} numberOfLines={1}>{player.displayName}</Text>
                      {player.isAI && (
                        <View style={styles.aiBadge}>
                          <Text style={styles.aiBadgeText}>AI</Text>
                        </View>
                      )}
                      {player.id === myPlayerId && (
                        <View style={[styles.aiBadge, styles.youBadge]}>
                          <Text style={styles.aiBadgeText}>You</Text>
                        </View>
                      )}
                      {isHost && player.isAI && (
                        <TouchableOpacity
                          onPress={() => handleRemoveAI(seatIndex)}
                          style={styles.removeAIBtn}
                        >
                          <Text style={styles.removeAIText}>✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View key={seatIndex} style={styles.seatCard}>
                      <Text style={styles.emptyIcon}>+</Text>
                      <Text style={styles.emptyLabel}>Empty</Text>
                      {isHost && (
                        <TouchableOpacity
                          onPress={() => handleAddAI(seatIndex)}
                          style={styles.addAIBtn}
                        >
                          <Text style={styles.addAIText}>Add AI</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
            </View>
          </View>
        ))}

        {/* Settings summary */}
        {settings && (
          <View style={styles.settingsRow}>
            <View style={styles.settingChip}>
              <Text style={styles.settingChipText}>🃏 {settings.playerCount} players</Text>
            </View>
            <View style={styles.settingChip}>
              <Text style={styles.settingChipText}>📋 {settings.startingTables} tables</Text>
            </View>
            <View style={styles.settingChip}>
              <Text style={styles.settingChipText}>⏱ {settings.bidTimerSeconds}s bid timer</Text>
            </View>
            <View style={styles.settingChip}>
              <Text style={styles.settingChipText}>🎯 {settings.playTimerSeconds}s play timer</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Start button (host only) */}
      {isHost && (
        <View style={styles.footer}>
          <Button
            label={canStart ? 'Start Game' : `Waiting for ${requiredPlayers - filledSeats} more...`}
            onPress={handleStartGame}
            loading={starting}
            disabled={!canStart}
            fullWidth
            size="lg"
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
  },
  leaveBtn:  { width: 56 },
  leaveText: { fontSize: FontSize.md, color: Colors.error },
  title:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  shareBtn:  { width: 56, alignItems: 'flex-end' },
  shareIcon: { fontSize: FontSize.xl, color: Colors.textSecondary },

  codeCard: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     Colors.accent + '55',
    gap:             Spacing.xs,
  },
  codeLabel: { fontSize: FontSize.xs, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.5 },
  codeValue: {
    fontSize:      FontSize.hero,
    fontWeight:    FontWeight.heavy,
    color:         Colors.textPrimary,
    letterSpacing: 10,
  },
  codeSub: { fontSize: FontSize.xs, color: Colors.textMuted },

  progressRow: { gap: Spacing.xs },
  progressText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  progressBar: {
    height:          6,
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.full,
    overflow:        'hidden',
  },
  progressFill: {
    height:          6,
    backgroundColor: Colors.accent,
    borderRadius:    Radius.full,
  },

  teamSection: { gap: Spacing.sm },
  teamLabel: {
    fontSize:      FontSize.sm,
    fontWeight:    FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  seatGrid: { flexDirection: 'row', gap: Spacing.sm },

  seatCard: {
    flex:            1,
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    alignItems:      'center',
    gap:             Spacing.xs,
    minHeight:       100,
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     Colors.bgSurface,
    borderStyle:     'dashed',
  },
  seatCardFilled: {
    borderStyle: 'solid',
    borderColor: Colors.bgSurface,
  },
  seatAvatar:  { fontSize: 28 },
  seatName: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
    color:      Colors.textPrimary,
    textAlign:  'center',
  },

  aiBadge: {
    backgroundColor: Colors.bgSurface,
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
  },
  youBadge: { backgroundColor: Colors.accent + '44' },
  aiBadgeText: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: FontWeight.medium },

  removeAIBtn: { position: 'absolute', top: 6, right: 6 },
  removeAIText: { fontSize: FontSize.sm, color: Colors.textMuted },

  emptyIcon:  { fontSize: FontSize.xl, color: Colors.textMuted },
  emptyLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  addAIBtn: {
    marginTop:       Spacing.xs,
    backgroundColor: Colors.bgSurface,
    borderRadius:    Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  addAIText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.medium },

  settingsRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  settingChip: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  settingChipText: { fontSize: FontSize.xs, color: Colors.textSecondary },

  footer: {
    padding:       Spacing.lg,
    paddingBottom: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.bgSurface,
  },
});
