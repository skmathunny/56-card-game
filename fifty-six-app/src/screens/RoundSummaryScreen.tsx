import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import { Button } from '../components/common';
import { useGameStore } from '../store/gameSlice';
import { useUIStore } from '../store/uiSlice';

type Nav = NativeStackNavigationProp<any>;

const TEAM_COLORS = { A: Colors.teamA, B: Colors.teamB };

export default function RoundSummaryScreen() {
  const navigation  = useNavigation<Nav>();
  const { roundSummary, gameState, clearRoundSummary } = useGameStore();
  const { setRoundSummaryVisible } = useUIStore();

  const handleContinue = () => {
    clearRoundSummary();
    setRoundSummaryVisible(false);
    // Server will push next round's dealing state; navigate back to deal screen
    navigation.replace(ROUTES.DEAL_AND_BID);
  };

  if (!roundSummary || !gameState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading summary…</Text>
      </View>
    );
  }

  const bidTeamColor = TEAM_COLORS[roundSummary.bidTeam];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Result banner */}
        <View style={[styles.resultBanner, roundSummary.success ? styles.successBanner : styles.failBanner]}>
          <Text style={styles.resultEmoji}>{roundSummary.success ? '🏆' : '💔'}</Text>
          <Text style={styles.resultTitle}>
            Team {roundSummary.bidTeam} {roundSummary.success ? 'Won!' : 'Failed'}
          </Text>
          <Text style={styles.resultSub}>
            Bid {roundSummary.bidAmount}
            {roundSummary.doubled   ? ' (Doubled)'    : ''}
            {roundSummary.redoubled ? ' (Redoubled)'  : ''}
          </Text>
        </View>

        {/* Tables change */}
        <View style={styles.tablesCard}>
          <Text style={styles.tablesLabel}>Tables Change</Text>
          <View style={styles.tablesRow}>
            <Text style={[styles.tablesChange, { color: bidTeamColor }]}>
              Team {roundSummary.bidTeam}
              {' '}
              {roundSummary.success
                ? `+${roundSummary.tablesChange} 📈`
                : `-${roundSummary.tablesChange} 📉`}
            </Text>
          </View>
        </View>

        {/* Current standings */}
        <View style={styles.standingsCard}>
          <Text style={styles.standingsTitle}>Standings</Text>
          {(['A', 'B'] as const).map((team) => (
            <View key={team} style={styles.standingRow}>
              <Text style={[styles.standingTeam, { color: TEAM_COLORS[team] }]}>Team {team}</Text>
              <View style={styles.tablesBar}>
                <View
                  style={[
                    styles.tablesBarFill,
                    {
                      flex: gameState.teams[team].tables,
                      backgroundColor: TEAM_COLORS[team],
                    },
                  ]}
                />
                <View style={{ flex: Math.max(0, 10 - gameState.teams[team].tables) }} />
              </View>
              <Text style={styles.standingTables}>{gameState.teams[team].tables} tables</Text>
            </View>
          ))}
        </View>

        {/* Points this round */}
        <View style={styles.pointsCard}>
          <Text style={styles.pointsTitle}>Round Points</Text>
          <View style={styles.pointsRow}>
            {(['A', 'B'] as const).map((team) => (
              <View key={team} style={styles.pointsTeam}>
                <Text style={[styles.pointsTeamLabel, { color: TEAM_COLORS[team] }]}>Team {team}</Text>
                <Text style={styles.pointsValue}>{gameState.teams[team].roundPoints}</Text>
              </View>
            ))}
          </View>
        </View>

        <Button label="Next Round" onPress={handleContinue} fullWidth size="lg" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: FontSize.lg },

  container: {
    flex:    1,
    padding: Spacing.lg,
    gap:     Spacing.lg,
    justifyContent: 'center',
  },

  resultBanner: {
    borderRadius: Radius.xl,
    padding:      Spacing.xl,
    alignItems:   'center',
    gap:          Spacing.sm,
  },
  successBanner: { backgroundColor: Colors.success + '33', borderWidth: 1, borderColor: Colors.success + '66' },
  failBanner:    { backgroundColor: Colors.error   + '22', borderWidth: 1, borderColor: Colors.error   + '44' },

  resultEmoji: { fontSize: 48 },
  resultTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.heavy, color: Colors.textPrimary },
  resultSub:   { fontSize: FontSize.md,  color: Colors.textSecondary },

  tablesCard: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    gap:             Spacing.sm,
    alignItems:      'center',
  },
  tablesLabel: { fontSize: FontSize.sm, color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1 },
  tablesRow:   { flexDirection: 'row', gap: Spacing.lg },
  tablesChange: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy },

  standingsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    gap:             Spacing.md,
  },
  standingsTitle: {
    fontSize:   FontSize.sm,
    color:      Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  standingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  standingTeam: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, width: 52 },
  tablesBar: {
    flex:            1,
    height:          12,
    flexDirection:   'row',
    backgroundColor: Colors.bg,
    borderRadius:    Radius.full,
    overflow:        'hidden',
  },
  tablesBarFill:  { borderRadius: Radius.full },
  standingTables: { fontSize: FontSize.sm, color: Colors.textSecondary, width: 56, textAlign: 'right' },

  pointsCard: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    gap:             Spacing.md,
  },
  pointsTitle: {
    fontSize:   FontSize.sm,
    color:      Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pointsRow:       { flexDirection: 'row', justifyContent: 'space-around' },
  pointsTeam:      { alignItems: 'center', gap: Spacing.xs },
  pointsTeamLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.bold },
  pointsValue:     { fontSize: FontSize.hero, fontWeight: FontWeight.heavy, color: Colors.textPrimary },
});
