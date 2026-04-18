import React, { useContext, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import { SuitIcon } from '../components/common';
import { TransportModeContext } from '../../App';

type Nav = NativeStackNavigationProp<any>;

export default function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { mode } = useContext(TransportModeContext);
  const [name, setName]     = useState('');
  const [avatar, setAvatar] = useState('🦁');

  useEffect(() => {
    (async () => {
      const n = await AsyncStorage.getItem('profile_name');
      const a = await AsyncStorage.getItem('profile_avatar');
      if (n) setName(n);
      if (a) setAvatar(a);
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Welcome back</Text>
            <Text style={styles.playerName}>{avatar} {name || 'Player'}</Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate(ROUTES.PROFILE)}
            style={styles.profileBtn}
          >
            <Text style={styles.profileEmoji}>{avatar}</Text>
          </TouchableOpacity>
        </View>

        {/* Mode badge */}
        {mode === 'offline' && (
          <View style={styles.offlineBadge}>
            <Text style={styles.offlineBadgeText}>⚡ Offline Mode</Text>
          </View>
        )}

        {/* Main actions */}
        <View style={styles.mainActions}>
          <Text style={styles.sectionTitle}>Play</Text>

          <TouchableOpacity
            style={[styles.actionCard, styles.actionCardPrimary]}
            onPress={() => navigation.navigate(ROUTES.CREATE_ROOM)}
          >
            <View style={styles.actionCardIcon}>
              <SuitIcon suit="spades" size={32} />
            </View>
            <View style={styles.actionCardText}>
              <Text style={styles.actionCardTitle}>Create Room</Text>
              <Text style={styles.actionCardSub}>Host a new game, invite friends</Text>
            </View>
            <Text style={styles.actionCardArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate(ROUTES.JOIN_ROOM)}
          >
            <View style={styles.actionCardIcon}>
              <SuitIcon suit="hearts" size={32} />
            </View>
            <View style={styles.actionCardText}>
              <Text style={styles.actionCardTitle}>Join Room</Text>
              <Text style={styles.actionCardSub}>Enter a room code to join</Text>
            </View>
            <Text style={styles.actionCardArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Suits decoration */}
        <View style={styles.footer}>
          <SuitIcon suit="spades"   size={18} style={{ opacity: 0.3 }} />
          <SuitIcon suit="hearts"   size={18} style={{ opacity: 0.3 }} />
          <SuitIcon suit="diamonds" size={18} style={{ opacity: 0.3 }} />
          <SuitIcon suit="clubs"    size={18} style={{ opacity: 0.3 }} />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:      { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1, padding: Spacing.lg, gap: Spacing.lg },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingTop:     Spacing.sm,
  },
  greeting: { fontSize: FontSize.sm, color: Colors.textMuted },
  playerName: {
    fontSize:   FontSize.xl,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },
  profileBtn: {
    width:          48,
    height:         48,
    borderRadius:   Radius.full,
    backgroundColor: Colors.bgCard,
    alignItems:     'center',
    justifyContent: 'center',
  },
  profileEmoji: { fontSize: 26 },

  offlineBadge: {
    backgroundColor: Colors.bgSurface,
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf:       'flex-start',
  },
  offlineBadgeText: { fontSize: FontSize.xs, color: Colors.warning, fontWeight: FontWeight.medium },

  mainActions: { gap: Spacing.md },
  sectionTitle: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
    color:      Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  actionCard: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    gap:             Spacing.md,
  },
  actionCardPrimary: {
    backgroundColor: Colors.bgSurface,
    borderWidth:     1,
    borderColor:     Colors.accent + '44',
  },
  actionCardIcon: {
    width:          52,
    height:         52,
    borderRadius:   Radius.lg,
    backgroundColor: Colors.bg,
    alignItems:     'center',
    justifyContent: 'center',
  },
  actionCardText: { flex: 1 },
  actionCardTitle: {
    fontSize:   FontSize.lg,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },
  actionCardSub: {
    fontSize: FontSize.sm,
    color:    Colors.textSecondary,
    marginTop: 2,
  },
  actionCardArrow: {
    fontSize: FontSize.xxl,
    color:    Colors.textMuted,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    marginTop: 'auto',
    paddingBottom: Spacing.md,
  },
});
