import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { SERVER_URL } from '../constants/game';
import { DECK_CONFIGS, DEFAULT_DECK_ID } from '../decks/deckRegistry';
import { ROUTES } from '../navigation/routes';
import { Button } from '../components/common';
import { useTransport } from '../services/transportContext';
import { useLobbyStore } from '../store/lobbySlice';

type Nav = NativeStackNavigationProp<any>;

type PlayerCount = 4 | 6 | 8;

const PLAYER_COUNT_OPTIONS: PlayerCount[] = [4, 6, 8];
const TABLE_OPTIONS = [5, 7, 10];

export default function CreateRoomScreen() {
  const navigation  = useNavigation<Nav>();
  const transport   = useTransport();
  const setRoom     = useLobbyStore((s) => s.setRoom);
  const setMyPlayer = useLobbyStore((s) => s.setMyPlayer);
  const setPlayers  = useLobbyStore((s) => s.setPlayers);

  const [playerCount, setPlayerCount]   = useState<PlayerCount>(4);
  const [tables, setTables]             = useState(7);
  const [bidTimer, setBidTimer]         = useState(30);
  const [playTimer, setPlayTimer]       = useState(30);
  const [deckId, setDeckId]             = useState(DEFAULT_DECK_ID);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');

  const handleCreate = async () => {
    setLoading(true);
    setError('');
    try {
      const name   = (await AsyncStorage.getItem('profile_name'))   ?? 'Player';
      const avatar = (await AsyncStorage.getItem('profile_avatar')) ?? '🦁';
      const userId = await AsyncStorage.getItem('user_id');

      const createRes = await fetch(`${SERVER_URL}/rooms`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          playerCount,
          startingTables:  tables,
          bidTimerSeconds: bidTimer,
          playTimerSeconds: playTimer,
          expiryHours:     4,
        }),
      });
      if (!createRes.ok) throw new Error('Failed to create room');
      const { code } = await createRes.json();

      const { room, yourPlayer } = await transport.joinRoom({
        roomCode:    code,
        displayName: name,
        avatarUrl:   avatar,
        userId,
      });

      const settings = {
        playerCount,
        startingTables:  tables,
        bidTimerSeconds: bidTimer,
        playTimerSeconds: playTimer,
        expiryHours:     4,
        deckId,
      };
      setRoom(room.id, room.code, settings);
      setMyPlayer(yourPlayer.id);
      // Seed initial player list from room response (covers offline where ROOM_UPDATED fires before listeners attach)
      if (room.players?.length) setPlayers(room.players);
      navigation.replace(ROUTES.WAITING_ROOM);
    } catch (e: any) {
      setError(e?.message ?? 'Failed to create room');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Create Room</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Player count */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Number of Players</Text>
          <View style={styles.segmented}>
            {PLAYER_COUNT_OPTIONS.map((n) => (
              <TouchableOpacity
                key={n}
                style={[styles.segmentBtn, playerCount === n && styles.segmentBtnActive]}
                onPress={() => setPlayerCount(n)}
              >
                <Text style={[styles.segmentText, playerCount === n && styles.segmentTextActive]}>
                  {n}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.hint}>
            {playerCount === 4 ? '2 teams of 2' : playerCount === 6 ? '2 teams of 3' : '2 teams of 4'}
          </Text>
        </View>

        {/* Starting tables */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Starting Tables</Text>
          <View style={styles.segmented}>
            {TABLE_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.segmentBtn, tables === t && styles.segmentBtnActive]}
                onPress={() => setTables(t)}
              >
                <Text style={[styles.segmentText, tables === t && styles.segmentTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bid timer */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Bid Timer</Text>
          <View style={styles.timerRow}>
            {[15, 30, 45, 60].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.timerBtn, bidTimer === t && styles.timerBtnActive]}
                onPress={() => setBidTimer(t)}
              >
                <Text style={[styles.timerText, bidTimer === t && styles.timerTextActive]}>{t}s</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Play timer */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Play Timer</Text>
          <View style={styles.timerRow}>
            {[15, 30, 45, 60].map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.timerBtn, playTimer === t && styles.timerBtnActive]}
                onPress={() => setPlayTimer(t)}
              >
                <Text style={[styles.timerText, playTimer === t && styles.timerTextActive]}>{t}s</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Card deck */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Card Deck</Text>
          <View style={styles.timerRow}>
            {DECK_CONFIGS.map((deck) => (
              <TouchableOpacity
                key={deck.id}
                style={[styles.timerBtn, deckId === deck.id && styles.timerBtnActive]}
                onPress={() => setDeckId(deck.id)}
              >
                <Text style={[styles.timerText, deckId === deck.id && styles.timerTextActive]}>
                  {deck.emoji} {deck.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label="Create Room"
          onPress={handleCreate}
          loading={loading}
          fullWidth
          size="lg"
          style={{ marginTop: Spacing.lg }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
  },
  backBtn: { width: 40, alignItems: 'flex-start' },
  backIcon: { fontSize: FontSize.xxl, color: Colors.textPrimary },
  title: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  scroll: { padding: Spacing.lg, gap: Spacing.xl },

  section: { gap: Spacing.sm },
  sectionLabel: {
    fontSize:      FontSize.sm,
    fontWeight:    FontWeight.medium,
    color:         Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  hint: { fontSize: FontSize.xs, color: Colors.textMuted },

  segmented: {
    flexDirection:   'row',
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    padding:         4,
  },
  segmentBtn: {
    flex:           1,
    paddingVertical: Spacing.sm,
    alignItems:     'center',
    borderRadius:   Radius.md,
  },
  segmentBtnActive: { backgroundColor: Colors.accent },
  segmentText:      { fontSize: FontSize.md, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  segmentTextActive:{ color: Colors.textPrimary, fontWeight: FontWeight.bold },

  timerRow: { flexDirection: 'row', gap: Spacing.sm },
  timerBtn: {
    flex:            1,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.md,
    alignItems:      'center',
    borderWidth:     1,
    borderColor:     'transparent',
  },
  timerBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.bgSurface },
  timerText:      { fontSize: FontSize.sm, color: Colors.textSecondary },
  timerTextActive:{ color: Colors.accent, fontWeight: FontWeight.bold },

  errorText: { fontSize: FontSize.sm, color: Colors.error, textAlign: 'center' },
});
