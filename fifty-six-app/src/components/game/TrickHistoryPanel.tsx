import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';
import { useGameStore, Trick } from '../../store/gameSlice';
import { SUIT_SYMBOLS } from '../../constants/cards';
import type { Suit } from '../../constants/cards';

interface TrickHistoryPanelProps {
  onClose: () => void;
}

export function TrickHistoryPanel({ onClose }: TrickHistoryPanelProps) {
  const gameState = useGameStore((s) => s.gameState);
  const tricks    = gameState?.tricks ?? [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Trick History</Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {tricks.length === 0 ? (
          <Text style={styles.empty}>No tricks played yet</Text>
        ) : (
          tricks.map((trick, idx) => {
            const winner = gameState?.players.find((p) => p.id === trick.winnerId);
            return (
              <View key={trick.id} style={styles.trickCard}>
                <View style={styles.trickHeader}>
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
                <View style={styles.cardsRow}>
                  {trick.cards.map((tc) => {
                    const player = gameState?.players.find((p) => p.id === tc.playerId);
                    const isRed  = tc.card.suit === 'hearts' || tc.card.suit === 'diamonds';
                    return (
                      <View key={`${tc.playerId}-${tc.card.id}`} style={styles.trickCardItem}>
                        <View style={styles.miniCard}>
                          <Text style={[styles.miniRank, { color: isRed ? Colors.red : '#1a1a2e' }]}>
                            {tc.card.rank}
                          </Text>
                          <Text style={[styles.miniSuit, { color: isRed ? Colors.red : '#1a1a2e' }]}>
                            {SUIT_SYMBOLS[tc.card.suit as Suit]}
                          </Text>
                        </View>
                        <Text style={styles.playerName} numberOfLines={1}>
                          {player?.displayName ?? '?'}
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgCard },

  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
  },
  title:     { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  closeText: { fontSize: FontSize.md, color: Colors.textSecondary },

  scroll: { padding: Spacing.md, gap: Spacing.md },
  empty:  { color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },

  trickCard: {
    backgroundColor: Colors.bg,
    borderRadius:    Radius.lg,
    padding:         Spacing.md,
    gap:             Spacing.sm,
  },
  trickHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexWrap: 'wrap' },
  trickNum:    { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  trickPoints: {
    fontSize:          FontSize.xs,
    color:             Colors.warning,
    backgroundColor:   Colors.bgCard,
    borderRadius:      Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   2,
  },
  trickWinner: { fontSize: FontSize.xs, color: Colors.textSecondary, marginLeft: 'auto' },

  cardsRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  trickCardItem: { alignItems: 'center', gap: 4 },

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
  miniRank: { fontSize: FontSize.xs, fontWeight: FontWeight.heavy, alignSelf: 'flex-start' },
  miniSuit: { fontSize: FontSize.sm },

  playerName: { fontSize: FontSize.xs, color: Colors.textMuted, maxWidth: 48, textAlign: 'center' },
});
