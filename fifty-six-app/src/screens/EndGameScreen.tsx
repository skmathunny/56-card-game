import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import { Button } from '../components/common';
import { useGameStore } from '../store/gameSlice';
import { useLobbyStore } from '../store/lobbySlice';
import { useTransport } from '../services/transportContext';

type Nav = NativeStackNavigationProp<any>;

const TEAM_COLORS = { A: Colors.teamA, B: Colors.teamB };

export default function EndGameScreen() {
  const navigation   = useNavigation<Nav>();
  const transport    = useTransport();
  const { gameState, roundHistory, clearGame } = useGameStore();
  const { roomId, players, myPlayerId, clearLobby } = useLobbyStore();

  if (!gameState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  const winner = gameState.winner;
  const loser  = winner === 'A' ? 'B' : 'A';
  const [showHistory, setShowHistory] = useState(false);
  const lastRound = roundHistory.length > 0 ? roundHistory[roundHistory.length - 1] : null;

  const handleRematch = async () => {
    if (!roomId) return;
    // Rematch: host triggers a new game in the same room → goes to waiting room
    navigation.replace(ROUTES.WAITING_ROOM);
  };

  const handleLeave = () => {
    if (roomId) transport.leaveRoom({ roomId });
    clearGame();
    clearLobby();
    navigation.replace(ROUTES.HOME);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Winner banner */}
        <View style={[styles.winnerBanner, { borderColor: winner ? TEAM_COLORS[winner] + '88' : Colors.accent }]}>
          <Text style={styles.trophyEmoji}>🏆</Text>
          {winner ? (
            <>
              <Text style={[styles.winnerText, { color: TEAM_COLORS[winner] }]}>
                Team {winner} Wins!
              </Text>
              <Text style={styles.loserText}>Team {loser} ran out of tables</Text>
            </>
          ) : (
            <Text style={styles.winnerText}>Game Over</Text>
          )}

          {lastRound && (
            <View style={[styles.lastRoundBadge, { backgroundColor: lastRound.success ? Colors.success + '22' : Colors.error + '22', borderColor: lastRound.success ? Colors.success + '55' : Colors.error + '55' }]}>
              <Text style={[styles.lastRoundTitle, { color: lastRound.success ? Colors.success : Colors.error }]}>
                {lastRound.success ? '🏆' : '💔'} Team {lastRound.bidTeam} {lastRound.success ? 'Won' : 'Failed'} — Round {lastRound.roundNumber}
              </Text>
              <Text style={styles.lastRoundSub}>
                Bid {lastRound.bidAmount}
                {lastRound.doubled ? ' (Doubled)' : lastRound.redoubled ? ' (Redoubled)' : ''}
                {'  '}
                {lastRound.success ? `+${lastRound.tablesChange} tables` : `-${lastRound.tablesChange} tables`}
              </Text>
            </View>
          )}
        </View>

        {/* Final standings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Final Standings</Text>
          {(['A', 'B'] as const).map((team) => (
            <View key={team} style={styles.standingRow}>
              <View style={styles.standingLeft}>
                <Text style={[styles.standingTeamBadge, { backgroundColor: TEAM_COLORS[team] + '33', color: TEAM_COLORS[team] }]}>
                  Team {team}
                </Text>
                <View style={styles.teamPlayers}>
                  {players
                    .filter((p) => p.teamId === team)
                    .map((p) => (
                      <Text key={p.id} style={styles.playerName}>
                        {p.avatarUrl} {p.displayName}{p.id === myPlayerId ? ' (You)' : ''}
                      </Text>
                    ))}
                </View>
              </View>
              <View style={styles.standingRight}>
                <Text style={[styles.tablesRemaining, { color: TEAM_COLORS[team] }]}>
                  {gameState.teams[team].tables}
                </Text>
                <Text style={styles.tablesUnit}>tables</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Game stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Game Stats</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{gameState.roundNumber}</Text>
              <Text style={styles.statLabel}>Rounds Played</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{gameState.tricks.length}</Text>
              <Text style={styles.statLabel}>Total Tricks</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>{gameState.playerCount}</Text>
              <Text style={styles.statLabel}>Players</Text>
            </View>
            <View style={styles.statCell}>
              <Text style={styles.statValue}>
                {gameState.winningBid?.amount ?? '—'}
              </Text>
              <Text style={styles.statLabel}>Last Bid</Text>
            </View>
          </View>
        </View>

        {/* Round history toggle */}
        {roundHistory.length > 0 && (
          <View style={styles.card}>
            <TouchableOpacity style={styles.historyToggle} onPress={() => setShowHistory(v => !v)}>
              <Text style={styles.cardTitle}>Round History</Text>
              <Text style={styles.historyToggleIcon}>{showHistory ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showHistory && roundHistory.map((r) => (
              <View key={r.roundNumber} style={styles.historyRow}>
                <Text style={styles.historyRound}>R{r.roundNumber}</Text>
                <Text style={[styles.historyTeam, { color: TEAM_COLORS[r.bidTeam] }]}>
                  Team {r.bidTeam}
                </Text>
                <Text style={styles.historyBid}>
                  {r.bidAmount}{r.doubled ? '×2' : r.redoubled ? '×4' : ''}
                </Text>
                <Text style={[styles.historyResult, { color: r.success ? Colors.success : Colors.error }]}>
                  {r.success ? `+${r.tablesChange}` : `-${r.tablesChange}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Button label="Play Again" onPress={handleRematch} fullWidth size="lg" />
          <Button label="Back to Home" onPress={handleLeave} variant="ghost" fullWidth size="lg" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: FontSize.lg },

  scroll: { padding: Spacing.lg, gap: Spacing.lg },

  winnerBanner: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.xl,
    alignItems:      'center',
    gap:             Spacing.sm,
    borderWidth:     2,
  },
  trophyEmoji: { fontSize: 64 },
  winnerText:  { fontSize: FontSize.xxl, fontWeight: FontWeight.heavy, textAlign: 'center' },
  loserText:   { fontSize: FontSize.sm, color: Colors.textMuted },

  lastRoundBadge: {
    marginTop:       Spacing.sm,
    borderWidth:     1,
    borderRadius:    Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems:      'center',
    gap:             2,
    width:           '100%',
  },
  lastRoundTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, textAlign: 'center' },
  lastRoundSub:   { fontSize: FontSize.xs, color: Colors.textSecondary, textAlign: 'center' },

  card: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    gap:             Spacing.md,
  },
  cardTitle: {
    fontSize:      FontSize.sm,
    fontWeight:    FontWeight.medium,
    color:         Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  standingRow: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
  },
  standingLeft:  { flex: 1, gap: Spacing.xs },
  standingTeamBadge: {
    alignSelf:         'flex-start',
    fontSize:          FontSize.xs,
    fontWeight:        FontWeight.bold,
    borderRadius:      Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   2,
  },
  teamPlayers: { gap: 2 },
  playerName:  { fontSize: FontSize.sm, color: Colors.textSecondary },

  standingRight: { alignItems: 'flex-end' },
  tablesRemaining: { fontSize: FontSize.xxl, fontWeight: FontWeight.heavy },
  tablesUnit:      { fontSize: FontSize.xs, color: Colors.textMuted },

  statsGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.sm,
  },
  statCell: {
    flex:            1,
    minWidth:        '45%',
    backgroundColor: Colors.bg,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    alignItems:      'center',
    gap:             4,
  },
  statValue: { fontSize: FontSize.xxl, fontWeight: FontWeight.heavy, color: Colors.textPrimary },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, textAlign: 'center' },

  historyToggle: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  historyToggleIcon: { fontSize: FontSize.xs, color: Colors.textMuted },

  historyRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.sm,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
  },
  historyRound: { fontSize: FontSize.xs, color: Colors.textMuted, width: 24 },
  historyTeam:  { fontSize: FontSize.sm, fontWeight: FontWeight.bold, flex: 1 },
  historyBid:   { fontSize: FontSize.sm, color: Colors.textSecondary, width: 40, textAlign: 'center' },
  historyResult:{ fontSize: FontSize.sm, fontWeight: FontWeight.bold, width: 36, textAlign: 'right' },

  actions: { gap: Spacing.sm, paddingBottom: Spacing.lg },
});
