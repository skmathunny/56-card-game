import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import { Button } from '../components/common';
import { useTransport } from '../services/transportContext';
import { useGameStore } from '../store/gameSlice';
import { useLobbyStore } from '../store/lobbySlice';
import { SUIT_SYMBOLS } from '../constants/cards';
import type { Suit } from '../constants/cards';

type Nav = NativeStackNavigationProp<any>;

const TRUMP_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '♠', value: 'spades' },
  { label: '♥', value: 'hearts' },
  { label: '♦', value: 'diamonds' },
  { label: '♣', value: 'clubs' },
  { label: 'NT', value: 'no-trumps' },
];

function buildBidAmounts(playerCount: number): number[] {
  const min = playerCount === 4 ? 14 : 28;
  const max = playerCount === 4 ? 28 : 56;
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

export default function DealAndBidScreen() {
  const navigation = useNavigation<Nav>();
  const transport  = useTransport();
  const { gameState, myHand } = useGameStore();
  const { myPlayerId }        = useLobbyStore();

  const [selectedAmount, setSelectedAmount] = useState(14);
  const [selectedTrump,  setSelectedTrump]  = useState('spades');
  const [acting, setActing]                 = useState(false);

  // Dealing animation: cards fly in one by one
  const cardAnims = useRef<Animated.Value[]>([]);

  useEffect(() => {
    if (myHand.length === 0) return;
    cardAnims.current = myHand.map(() => new Animated.Value(-300));
    const anims = cardAnims.current.map((anim, i) =>
      Animated.timing(anim, {
        toValue:        0,
        duration:       250,
        delay:          i * 120,
        useNativeDriver: true,
      })
    );
    Animated.stagger(120, anims).start();
  }, [myHand.length]);

  // Navigate to play when bidding ends
  useEffect(() => {
    if (gameState?.phase === 'playing') {
      navigation.replace(ROUTES.PLAY);
    }
  }, [gameState?.phase]);

  if (!gameState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Dealing cards…</Text>
      </View>
    );
  }

  const isMyTurn =
    gameState.phase === 'bidding' &&
    gameState.players[gameState.biddingState.currentBidderSeatIndex]?.id === myPlayerId;

  const BID_AMOUNTS  = buildBidAmounts(gameState.playerCount);
  const baseBid      = gameState.playerCount === 4 ? 14 : 28;
  const highBid      = gameState.biddingState.currentHighBid;
  const minBid       = highBid ? (highBid.amount ?? baseBid) + 1 : baseBid;
  const validAmounts = BID_AMOUNTS.filter((a) => a >= minBid);

  // Keep selectedAmount at or above the current minimum
  useEffect(() => {
    if (selectedAmount < minBid) setSelectedAmount(minBid);
  }, [minBid]);

  const handleBid = async () => {
    if (!gameState) return;
    setActing(true);
    await transport.placeBid({ gameId: gameState.id, amount: selectedAmount, trump: selectedTrump });
    setActing(false);
  };

  const handlePass = async () => {
    if (!gameState) return;
    setActing(true);
    await transport.pass({ gameId: gameState.id });
    setActing(false);
  };

  const handleDouble = async () => {
    if (!gameState) return;
    setActing(true);
    await transport.double({ gameId: gameState.id });
    setActing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Teams scoreboard */}
      <View style={styles.scoreboard}>
        {(['A', 'B'] as const).map((team) => {
          const color = team === 'A' ? Colors.teamA : Colors.teamB;
          return (
            <View key={team} style={[styles.teamScore, { backgroundColor: color + '18', borderRadius: 10, padding: Spacing.sm, borderWidth: 1, borderColor: color + '44' }]}>
              <Text style={[styles.teamLabel, { color }]}>Team {team}</Text>
              <Text style={[styles.tablesValue, { color }]}>{gameState.teams[team].tables} tables</Text>
            </View>
          );
        })}
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>Round {gameState.roundNumber}</Text>
        </View>
      </View>

      {/* Bid history */}
      <View style={styles.bidHistoryWrap}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bidHistory}>
          {gameState.biddingState.bids.map((bid) => {
            const player = gameState.players.find((p) => p.id === bid.playerId);
            return (
              <View key={bid.id} style={[styles.bidChip, bid.type === 'pass' && styles.bidChipPass]}>
                <Text style={styles.bidChipName}>{player?.displayName ?? '?'}</Text>
                <Text style={styles.bidChipValue}>
                  {bid.type === 'pass'
                    ? 'Pass'
                    : bid.type === 'double'
                    ? '×2'
                    : bid.type === 'redouble'
                    ? '×4'
                    : `${bid.amount} ${bid.trump === 'no-trumps' ? 'NT' : SUIT_SYMBOLS[bid.trump as Suit] ?? ''}`}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      </View>

      {/* Current high bid */}
      {highBid && (
        <View style={styles.highBidBanner}>
          <Text style={styles.highBidLabel}>Current bid</Text>
          <Text style={styles.highBidValue}>
            {highBid.amount} {highBid.trump === 'no-trumps' ? 'NT' : SUIT_SYMBOLS[highBid.trump as Suit] ?? ''}
          </Text>
        </View>
      )}

      {/* Player hand */}
      <View style={styles.handSection}>
        <Text style={styles.handLabel}>Your hand</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hand}>
          {myHand.map((card, i) => {
            const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
            const anim  = cardAnims.current[i] ?? new Animated.Value(0);
            return (
              <Animated.View
                key={card.id}
                style={[styles.card, { transform: [{ translateY: anim }] }]}
              >
                <Text style={[styles.cardRank, { color: isRed ? Colors.red : '#1a1a2e' }]}>
                  {card.rank}
                </Text>
                <Text style={[styles.cardSuit, { color: isRed ? Colors.red : '#1a1a2e' }]}>
                  {SUIT_SYMBOLS[card.suit]}
                </Text>
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>

      {/* Bidding controls */}
      {gameState.phase === 'bidding' && (
        <View style={styles.bidControls}>
          {isMyTurn ? (
            <>
              {/* Amount selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.amountRow}>
                {validAmounts.map((a) => (
                  <TouchableOpacity
                    key={a}
                    onPress={() => setSelectedAmount(a)}
                    style={[styles.amountBtn, selectedAmount === a && styles.amountBtnActive]}
                  >
                    <Text style={[styles.amountText, selectedAmount === a && styles.amountTextActive]}>
                      {a}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Trump selector */}
              <View style={styles.trumpRow}>
                {TRUMP_OPTIONS.map((t) => (
                  <TouchableOpacity
                    key={t.value}
                    onPress={() => setSelectedTrump(t.value)}
                    style={[styles.trumpBtn, selectedTrump === t.value && styles.trumpBtnActive]}
                  >
                    <Text style={[
                      styles.trumpText,
                      (t.value === 'hearts' || t.value === 'diamonds') && { color: Colors.red },
                      selectedTrump === t.value && styles.trumpTextActive,
                    ]}>
                      {t.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Action buttons */}
              <View style={styles.actionRow}>
                <Button label="Pass" onPress={handlePass} variant="ghost" style={{ flex: 1 }} loading={acting} />
                {highBid && (
                  <Button label="Double" onPress={handleDouble} variant="secondary" style={{ flex: 1 }} loading={acting} />
                )}
                <Button label={`Bid ${selectedAmount}`} onPress={handleBid} style={{ flex: 2 }} loading={acting} />
              </View>
            </>
          ) : (
            <View style={styles.waitingWrap}>
              <Text style={styles.waitingText}>
                Waiting for {gameState.players[gameState.biddingState.currentBidderSeatIndex]?.displayName ?? '…'}
              </Text>
            </View>
          )}
        </View>
      )}

      {gameState.phase === 'dealing' && (
        <View style={styles.waitingWrap}>
          <Text style={styles.waitingText}>Dealing cards…</Text>
        </View>
      )}

      {gameState.phase === 'scoring' && (
        <View style={styles.waitingWrap}>
          <Text style={styles.waitingText}>Preparing next round…</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: FontSize.lg },

  scoreboard: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
    gap: Spacing.md,
  },
  teamScore:   { flex: 1 },
  teamLabel: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tablesValue: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.textPrimary },
  roundBadge: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.xs,
  },
  roundText: { fontSize: FontSize.xs, color: Colors.textSecondary },

  bidHistoryWrap: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
  },
  bidHistory: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm },
  bidChip: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   Spacing.xs,
    alignItems:      'center',
    minWidth:        52,
  },
  bidChipPass:  { opacity: 0.5 },
  bidChipName:  { fontSize: FontSize.xs, color: Colors.textMuted },
  bidChipValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  highBidBanner: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.bgSurface,
  },
  highBidLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  highBidValue: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.accent },

  handSection: { flex: 1, paddingTop: Spacing.md, gap: Spacing.sm },
  handLabel: {
    paddingHorizontal: Spacing.lg,
    fontSize:          FontSize.xs,
    color:             Colors.textMuted,
    textTransform:     'uppercase',
    letterSpacing:     1.5,
  },
  hand: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: 4 },
  card: {
    width:          52,
    height:         76,
    backgroundColor: Colors.cardFace,
    borderRadius:   Radius.md,
    padding:        Spacing.xs,
    justifyContent: 'space-between',
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 2 },
    shadowOpacity:  0.3,
    shadowRadius:   4,
    elevation:      4,
  },
  cardRank: { fontSize: FontSize.sm, fontWeight: FontWeight.heavy },
  cardSuit: { fontSize: FontSize.md, alignSelf: 'flex-end' },

  bidControls: {
    backgroundColor: Colors.bgCard,
    borderTopWidth: 1,
    borderTopColor: Colors.bgSurface,
    padding:        Spacing.md,
    gap:            Spacing.sm,
  },
  amountRow: { gap: Spacing.xs, paddingVertical: Spacing.xs },
  amountBtn: {
    width:          40,
    height:         40,
    borderRadius:   Radius.md,
    backgroundColor: Colors.bg,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    1,
    borderColor:    'transparent',
  },
  amountBtnActive:  { borderColor: Colors.accent, backgroundColor: Colors.bgSurface },
  amountText:       { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  amountTextActive: { color: Colors.accent, fontWeight: FontWeight.bold },

  trumpRow: { flexDirection: 'row', gap: Spacing.sm },
  trumpBtn: {
    flex:            1,
    height:          44,
    backgroundColor: Colors.bg,
    borderRadius:    Radius.md,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1.5,
    borderColor:     'transparent',
  },
  trumpBtnActive: { borderColor: Colors.accent, backgroundColor: Colors.bgSurface },
  trumpText:      { fontSize: FontSize.lg, color: Colors.textPrimary },
  trumpTextActive:{ fontWeight: FontWeight.bold },

  actionRow: { flexDirection: 'row', gap: Spacing.sm },

  waitingWrap: {
    alignItems: 'center',
    padding:    Spacing.lg,
  },
  waitingText: { fontSize: FontSize.md, color: Colors.textSecondary, fontStyle: 'italic' },
});
