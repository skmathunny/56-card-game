import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import { Button } from '../components/common';
import { ExitMenu } from '../components/common/ExitMenu';
import { useGameStore } from '../store/gameSlice';
import { useGameExit } from '../hooks/useGameExit';
import { useUIStore } from '../store/uiSlice';
import { SUIT_SYMBOLS } from '../constants/cards';
import type { Suit } from '../constants/cards';

type Nav = NativeStackNavigationProp<any>;

const TEAM_COLORS = { A: Colors.teamA, B: Colors.teamB };

export default function RoundSummaryScreen() {
  const navigation  = useNavigation<Nav>();
  const { roundSummary, roundHistory, gameState, clearRoundSummary } = useGameStore();
  const { setRoundSummaryVisible } = useUIStore();
  const { exitGame, logout, isLoading } = useGameExit();
  const [tricksExpanded, setTricksExpanded] = useState(false);
  const [showExitMenu, setShowExitMenu] = useState(false);

  const handleContinue = () => {
    clearRoundSummary();
    setRoundSummaryVisible(false);
    if (gameState?.phase === 'complete') {
      navigation.replace(ROUTES.END_GAME);
    } else {
      navigation.replace(ROUTES.DEAL_AND_BID);
    }
  };

  if (!roundSummary || !gameState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading summary…</Text>
      </View>
    );
  }

  const bidTeamColor = TEAM_COLORS[roundSummary.bidTeam];

  const previousRounds = roundHistory.slice(0, -1); // all except the round just played

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header with menu button */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}>
        <TouchableOpacity onPress={() => setShowExitMenu(true)} style={{ padding: Spacing.sm }}>
          <Text style={{ fontSize: FontSize.large }}>⚙️</Text>
        </TouchableOpacity>
      </View>
      
      <ScrollView contentContainerStyle={styles.container}>
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
                <Text style={styles.pointsValue}>{roundSummary.finalTeamPoints[team]}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Trick history for this round */}
        {roundSummary.tricks.length > 0 && (
          <View style={styles.trickHistoryCard}>
            <TouchableOpacity
              style={styles.trickHistoryHeader}
              onPress={() => setTricksExpanded(v => !v)}
              activeOpacity={0.7}
            >
              <Text style={styles.trickHistoryTitle}>Trick History</Text>
              <Text style={styles.trickHistoryChevron}>{tricksExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {tricksExpanded && roundSummary.tricks.map((trick, idx) => {
              const winner = gameState.players.find(p => p.id === trick.winnerId);
              return (
                <View key={trick.id} style={styles.trickRow}>
                  <View style={styles.trickRowHeader}>
                    <Text style={styles.trickNum}>Trick {idx + 1}</Text>
                    {trick.points > 0 && (
                      <Text style={styles.trickPoints}>{trick.points} pts</Text>
                    )}
                    {winner && (
                      <Text style={styles.trickWinner}>
                        Won by {winner.avatarUrl} {winner.displayName}
                      </Text>
                    )}
                  </View>
                  <View style={styles.trickCards}>
                    {trick.cards.map(tc => {
                      const player = gameState.players.find(p => p.id === tc.playerId);
                      const isRed  = tc.card.suit === 'hearts' || tc.card.suit === 'diamonds';
                      return (
                        <View key={`${tc.playerId}-${tc.card.id}`} style={styles.miniCardItem}>
                          <View style={styles.miniCard}>
                            <Text style={[styles.miniRank, { color: isRed ? Colors.red : '#1a1a2e' }]}>
                              {tc.card.rank}
                            </Text>
                            <Text style={[styles.miniSuit, { color: isRed ? Colors.red : '#1a1a2e' }]}>
                              {SUIT_SYMBOLS[tc.card.suit as Suit]}
                            </Text>
                          </View>
                          <Text style={styles.miniPlayerName} numberOfLines={1}>
                            {player?.displayName ?? '?'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* Game history */}
        {previousRounds.length > 0 && (
          <View style={styles.historyCard}>
            <Text style={styles.historyTitle}>Game History</Text>

            {/* Header row */}
            <View style={styles.historyHeader}>
              <Text style={[styles.historyHeaderCell, { width: 32 }]}>Rd</Text>
              <Text style={[styles.historyHeaderCell, { flex: 1 }]}>Team</Text>
              <Text style={[styles.historyHeaderCell, { width: 48, textAlign: 'center' }]}>Bid</Text>
              <Text style={[styles.historyHeaderCell, { width: 60, textAlign: 'right' }]}>Result</Text>
            </View>

            {previousRounds.map((r) => {
              const color = TEAM_COLORS[r.bidTeam];
              const change = r.success ? `+${r.tablesChange}` : `-${r.tablesChange}`;
              return (
                <View key={r.roundNumber} style={styles.historyRow}>
                  <Text style={[styles.historyCell, { width: 32, color: Colors.textMuted }]}>
                    R{r.roundNumber}
                  </Text>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={[styles.historyCell, { color, fontWeight: FontWeight.bold }]}>
                      Team {r.bidTeam}
                    </Text>
                    <Text style={[styles.historyOutcome, { color: r.success ? Colors.success : Colors.error }]}>
                      {r.success ? '✓' : '✗'}
                    </Text>
                  </View>
                  <Text style={[styles.historyCell, { width: 48, textAlign: 'center', color: Colors.textSecondary }]}>
                    {r.bidAmount}{r.doubled ? '×2' : r.redoubled ? '×4' : ''}
                  </Text>
                  <Text style={[styles.historyCell, { width: 60, textAlign: 'right', fontWeight: FontWeight.bold, color: r.success ? Colors.success : Colors.error }]}>
                    {change} tbl
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Button label="Next Round" onPress={handleContinue} fullWidth size="lg" />
      </ScrollView>

      {/* Exit menu */}
      <ExitMenu
        visible={showExitMenu}
        isLoading={isLoading}
        canExitRound={false}
        canExitGame={true}
        onExitGame={exitGame}
        onLogout={logout}
        onClose={() => setShowExitMenu(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: FontSize.lg },

  container: {
    padding: Spacing.lg,
    gap:     Spacing.lg,
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

  historyCard: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    gap:             Spacing.xs,
  },
  historyTitle: {
    fontSize:      FontSize.sm,
    color:         Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom:  Spacing.xs,
  },
  historyHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingBottom:  Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
    marginBottom:   Spacing.xs,
  },
  historyHeaderCell: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: FontWeight.medium },
  historyRow: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
  },
  historyCell:    { fontSize: FontSize.sm },
  historyOutcome: { fontSize: FontSize.xs, fontWeight: FontWeight.heavy },

  trickHistoryCard: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    gap:             Spacing.md,
  },
  trickHistoryHeader: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  trickHistoryTitle: {
    fontSize:      FontSize.sm,
    color:         Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  trickHistoryChevron: { fontSize: FontSize.xs, color: Colors.textMuted },

  trickRow: {
    backgroundColor: Colors.bg,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    gap:             Spacing.sm,
  },
  trickRowHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  trickNum:       { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  trickPoints: {
    fontSize:          FontSize.xs,
    color:             Colors.warning,
    backgroundColor:   Colors.bgCard,
    borderRadius:      Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   2,
  },
  trickWinner: { fontSize: FontSize.xs, color: Colors.textSecondary, marginLeft: 'auto' },

  trickCards:    { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  miniCardItem:  { alignItems: 'center', gap: 4 },
  miniCard: {
    width:           36,
    height:          50,
    backgroundColor: Colors.cardFace,
    borderRadius:    Radius.sm,
    borderWidth:     1,
    borderColor:     Colors.cardBorder,
    padding:         2,
    justifyContent:  'space-between',
    alignItems:      'center',
  },
  miniRank:       { fontSize: FontSize.xs, fontWeight: FontWeight.heavy, alignSelf: 'flex-start' },
  miniSuit:       { fontSize: FontSize.sm },
  miniPlayerName: { fontSize: FontSize.xs, color: Colors.textMuted, maxWidth: 48, textAlign: 'center' },
});
