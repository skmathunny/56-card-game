import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import { Button } from '../components/common';
import { useTransport } from '../services/transportContext';
import { useLobbyStore } from '../store/lobbySlice';

type Nav = NativeStackNavigationProp<any>;

const CODE_LENGTH = 5;

export default function JoinRoomScreen() {
  const navigation  = useNavigation<Nav>();
  const transport   = useTransport();
  const setRoom     = useLobbyStore((s) => s.setRoom);
  const setMyPlayer = useLobbyStore((s) => s.setMyPlayer);
  const setPlayers  = useLobbyStore((s) => s.setPlayers);

  const [code, setCode]       = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const inputRefs             = useRef<(TextInput | null)[]>([]);

  const codeStr = code.join('').toUpperCase();
  const isReady = codeStr.length === CODE_LENGTH;

  const handleDigit = (text: string, idx: number) => {
    const char = text.slice(-1).toUpperCase();
    const next = [...code];
    next[idx]  = char;
    setCode(next);
    setError('');
    if (char && idx < CODE_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyPress = (key: string, idx: number) => {
    if (key === 'Backspace' && !code[idx] && idx > 0) {
      const next = [...code];
      next[idx - 1] = '';
      setCode(next);
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleJoin = async () => {
    if (!isReady) return;
    setLoading(true);
    setError('');
    try {
      const name   = (await AsyncStorage.getItem('profile_name'))   ?? 'Player';
      const avatar = (await AsyncStorage.getItem('profile_avatar')) ?? '🦁';
      const userId = await AsyncStorage.getItem('user_id');

      const { room, yourPlayer } = await transport.joinRoom({
        roomCode:    codeStr,
        displayName: name,
        avatarUrl:   avatar,
        userId,
      });

      setRoom(room.id, room.code, room.settings);
      setMyPlayer(yourPlayer.id);
      if (room.players?.length) setPlayers(room.players);
      navigation.replace(ROUTES.WAITING_ROOM);
    } catch (e: any) {
      setError(e?.message ?? 'Room not found. Check the code and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.kav}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Join Room</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.body}>
          <Text style={styles.instruction}>Enter the 5-character room code</Text>

          <View style={styles.codeRow}>
            {code.map((char, idx) => (
              <TextInput
                key={idx}
                ref={(r) => { inputRefs.current[idx] = r; }}
                style={[styles.codeCell, char ? styles.codeCellFilled : null, error ? styles.codeCellError : null]}
                value={char}
                onChangeText={(t) => handleDigit(t, idx)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, idx)}
                maxLength={2}
                autoCapitalize="characters"
                selectTextOnFocus
                textAlign="center"
                keyboardType="default"
              />
            ))}
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Button
            label="Join Game"
            onPress={handleJoin}
            loading={loading}
            disabled={!isReady}
            fullWidth
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  kav:  { flex: 1 },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
  },
  backBtn:  { width: 40, alignItems: 'flex-start' },
  backIcon: { fontSize: FontSize.xxl, color: Colors.textPrimary },
  title:    { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  body: {
    flex:           1,
    padding:        Spacing.xl,
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.xl,
  },

  instruction: {
    fontSize:  FontSize.md,
    color:     Colors.textSecondary,
    textAlign: 'center',
  },

  codeRow: { flexDirection: 'row', gap: Spacing.sm },
  codeCell: {
    width:           52,
    height:          64,
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    fontSize:        FontSize.xxl,
    fontWeight:      FontWeight.bold,
    color:           Colors.textPrimary,
    borderWidth:     2,
    borderColor:     Colors.bgSurface,
  },
  codeCellFilled: { borderColor: Colors.accent },
  codeCellError:  { borderColor: Colors.error },

  errorText: { fontSize: FontSize.sm, color: Colors.error, textAlign: 'center' },
});
