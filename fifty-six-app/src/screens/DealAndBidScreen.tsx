import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  ScrollView,
  TouchableOpacity,
  LayoutChangeEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import { Button } from '../components/common';
import { ExitMenu } from '../components/common/ExitMenu';
import { useTransport } from '../services/transportContext';
import { useGameExit } from '../hooks/useGameExit';
import { useGameStore } from '../store/gameSlice';
import { useLobbyStore } from '../store/lobbySlice';
import { SUIT_SYMBOLS } from '../constants/cards';
import { getCardImage, getDeckTheme } from '../decks/deckRegistry';
import type { Suit } from '../constants/cards';
import type { PublicPlayer } from '../store/gameSlice';

type Nav = NativeStackNavigationProp<any>;

const TRUMP_OPTIONS: Array<{ label: string; value: string }> = [
  { label: '♠', value: 'spades' },
  { label: '♥', value: 'hearts' },
  { label: '♦', value: 'diamonds' },
  { label: '♣', value: 'clubs' },
  { label: 'NT', value: 'no-trumps' },
];

const BID_TIMER_SECONDS = 30;

function buildBidAmounts(playerCount: number): number[] {
  const min = playerCount === 4 ? 14 : 28;
  const max = playerCount === 4 ? 28 : 56;
  return Array.from({ length: max - min + 1 }, (_, i) => min + i);
}

// ── Player avatar chip ─────────────────────────────────────────────────────

interface PlayerChipProps {
  player: PublicPlayer;
  teamColor: string;
  isCurrentBidder: boolean;
  isMe: boolean;
  lastBid?: string;
}

function PlayerChip({ player, teamColor, isCurrentBidder, isMe, lastBid }: PlayerChipProps) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isCurrentBidder) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isCurrentBidder]);

  return (
    <View style={styles.chipWrapper}>
      <Animated.View
        style={[
          styles.chip,
          isCurrentBidder && { borderColor: teamColor, borderWidth: 2, transform: [{ scale: pulseAnim }] },
          isMe && !isCurrentBidder && { borderColor: teamColor + '88', borderWidth: 1.5 },
        ]}
      >
        <Text style={styles.chipAvatar}>{player.avatarUrl}</Text>
        {isCurrentBidder && (
          <View style={[styles.bidderDot, { backgroundColor: teamColor }]} />
        )}
      </Animated.View>
      <Text style={[styles.chipName, isCurrentBidder && { color: teamColor, fontWeight: FontWeight.bold }]} numberOfLines={1}>
        {isMe ? 'You' : player.displayName.split(' ')[0]}
      </Text>
      {lastBid != null && (
        <Text style={[styles.chipBid, lastBid === 'Pass' && { opacity: 0.4 }]}>{lastBid}</Text>
      )}
    </View>
  );
}

// ── Countdown timer ────────────────────────────────────────────────────────

interface TimerProps {
  seconds: number;
}

function BidTimer({ seconds }: TimerProps) {
  const urgent = seconds <= 10;
  return (
    <View style={[styles.timerRing, urgent && { borderColor: Colors.warning }]}>
      <Text style={[styles.timerText, urgent && { color: Colors.warning }]}>{seconds}</Text>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function DealAndBidScreen() {
  const navigation = useNavigation<Nav>();
  const transport  = useTransport();
  const { gameState, myHand } = useGameStore();
  const { myPlayerId, settings } = useLobbyStore();
  const { exitRound, exitGame, logout, isLoading } = useGameExit();
  const deckId = settings?.deckId;
  const deckTheme = getDeckTheme(deckId);

  const [selectedAmount, setSelectedAmount] = useState(() => {
    const pc = useGameStore.getState().gameState?.playerCount ?? 4;
    return pc === 4 ? 14 : 28;
  });
  const [selectedTrump,  setSelectedTrump]  = useState('spades');
  const [acting, setActing]                 = useState(false);
  const [handHeight, setHandHeight]         = useState(0);
  const [timeLeft, setTimeLeft]             = useState(BID_TIMER_SECONDS);
  const [showExitMenu, setShowExitMenu]     = useState(false);

  const cardHeight = handHeight > 0 ? Math.min(handHeight * 0.82, 220) : 76;
  const cardWidth  = cardHeight * (52 / 76);

  // Dealing animation
  const cardAnims = useRef<Animated.Value[]>([]);
  useEffect(() => {
    if (myHand.length === 0) return;
    cardAnims.current = myHand.map(() => new Animated.Value(-300));
    Animated.stagger(120, cardAnims.current.map((anim, i) =>
      Animated.timing(anim, { toValue: 0, duration: 250, delay: i * 120, useNativeDriver: true })
    )).start();
  }, [myHand.length]);

  // Navigate to play when bidding ends
  useEffect(() => {
    if (gameState?.phase === 'playing') navigation.replace(ROUTES.PLAY);
  }, [gameState?.phase]);

  // Countdown timer — resets each time the current bidder changes
  const currentBidderSeat = gameState?.biddingState.currentBidderSeatIndex ?? -1;
  useEffect(() => {
    if (gameState?.phase !== 'bidding') return;
    setTimeLeft(BID_TIMER_SECONDS);
    const id = setInterval(() => {
      setTimeLeft(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, [currentBidderSeat, gameState?.phase]);

  if (!gameState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Dealing cards…</Text>
      </View>
    );
  }

  const currentBidder = gameState.players[gameState.biddingState.currentBidderSeatIndex];
  const isMyTurn      = gameState.phase === 'bidding' && currentBidder?.id === myPlayerId;

  const BID_AMOUNTS  = buildBidAmounts(gameState.playerCount);
  const baseBid      = gameState.playerCount === 4 ? 14 : 28;
  const highBid      = gameState.biddingState.currentHighBid;
  // Find the highest bid amount in the bidding history
  const highestBidAmount = gameState.biddingState.bids
    .filter(b => b.type === 'bid')
    .reduce((max, b) => Math.max(max, b.amount ?? 0), 0);
  const minBid = highestBidAmount > 0 ? highestBidAmount + 1 : baseBid;
  const validAmounts = BID_AMOUNTS.filter((a) => a >= minBid);

  useEffect(() => {
    if (selectedAmount < minBid) setSelectedAmount(minBid);
  }, [minBid]);

  // Build last-bid label per player
  const lastBidByPlayer: Record<string, string> = {};
  for (const bid of gameState.biddingState.bids) {
    if (bid.type === 'pass')     lastBidByPlayer[bid.playerId] = 'Pass';
    else if (bid.type === 'double')   lastBidByPlayer[bid.playerId] = '×2';
    else if (bid.type === 'redouble') lastBidByPlayer[bid.playerId] = '×4';
    else lastBidByPlayer[bid.playerId] =
      `${bid.amount} ${bid.trump === 'no-trumps' ? 'NT' : SUIT_SYMBOLS[bid.trump as Suit] ?? ''}`;
  }

  const handleBid = async () => {
    setActing(true);
    await transport.placeBid({ gameId: gameState.id, amount: selectedAmount, trump: selectedTrump });
    setActing(false);
  };
  const handlePass = async () => {
    setActing(true);
    await transport.pass({ gameId: gameState.id });
    setActing(false);
  };
  const handleDouble = async () => {
    setActing(true);
    await transport.double({ gameId: gameState.id });
    setActing(false);
  };
  const handleRedouble = async () => {
    setActing(true);
    await transport.redouble({ gameId: gameState.id });
    setActing(false);
  };

  const myPlayer  = gameState.players.find(p => p.id === myPlayerId);
  const myTeamId  = myPlayer?.teamId ?? 'A';

  // Check if current player can double/redouble
  const highBidPlayer = highBid ? gameState.players.find(p => p.id === highBid.playerId) : null;
  const canDouble = highBid && highBid.type === 'bid' && highBidPlayer && highBidPlayer.teamId !== myTeamId;
  const canRedouble = highBid && highBid.type === 'double' && highBidPlayer && highBidPlayer.teamId !== myTeamId;

  return (
    <SafeAreaView style={styles.safe}>

      {/* ── Header with menu button ── */}
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}>
        <TouchableOpacity onPress={() => setShowExitMenu(true)} style={{ padding: Spacing.sm }}>
          <Text style={{ fontSize: FontSize.large }}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* ── Teams + avatars + timer ── */}
      <View style={styles.teamsPanel}>
        {(['A', 'B'] as const).map((team, idx) => {
          const color      = team === 'A' ? Colors.teamA : Colors.teamB;
          const players    = gameState.players.filter(p => p.teamId === team);
          const isMyTeam   = myTeamId === team;
          return (
            <React.Fragment key={team}>
              <View style={[styles.teamCol, { alignItems: idx === 0 ? 'flex-start' : 'flex-end' }]}>
                {/* Team header */}
                <View style={[styles.teamHeader, { borderColor: color + '55', backgroundColor: color + '12' }]}>
                  <Text style={[styles.teamLabel, { color }]}>
                    Team {team}{isMyTeam ? ' ★' : ''}
                  </Text>
                  <Text style={[styles.tablesValue, { color }]}>
                    {gameState.teams[team].tables} tables
                  </Text>
                </View>

                {/* Player chips */}
                <View style={[styles.teamPlayers, { justifyContent: idx === 0 ? 'flex-start' : 'flex-end' }]}>
                  {players.map(p => (
                    <PlayerChip
                      key={p.id}
                      player={p}
                      teamColor={color}
                      isCurrentBidder={p.id === currentBidder?.id}
                      isMe={p.id === myPlayerId}
                      lastBid={lastBidByPlayer[p.id]}
                    />
                  ))}
                </View>
              </View>

              {/* Timer in the centre between the two teams */}
              {idx === 0 && (
                <View style={styles.timerCol}>
                  <Text style={styles.roundBadgeText}>R{gameState.roundNumber}</Text>
                  {gameState.phase === 'bidding' && <BidTimer seconds={timeLeft} />}
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* ── Current high bid banner ── */}
      {highBid && (
        <View style={styles.highBidBanner}>
          <Text style={styles.highBidLabel}>Current bid</Text>
          <Text style={styles.highBidValue}>
            {highBid.amount}{' '}
            {highBid.trump === 'no-trumps' ? 'NT' : SUIT_SYMBOLS[highBid.trump as Suit] ?? ''}
          </Text>
          {highBid.type === 'double'   && <Text style={styles.highBidMod}>×2</Text>}
          {highBid.type === 'redouble' && <Text style={styles.highBidMod}>×4</Text>}
        </View>
      )}

      {/* ── Player hand ── */}
      <View
        style={styles.handSection}
        onLayout={(e: LayoutChangeEvent) => setHandHeight(e.nativeEvent.layout.height)}
      >
        <Text style={styles.handLabel}>Your hand</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hand}>
          {myHand.map((card, i) => {
            const isRed    = card.suit === 'hearts' || card.suit === 'diamonds';
            const anim     = cardAnims.current[i] ?? new Animated.Value(0);
            const imgSrc   = getCardImage(deckId, card.id);
            return (
              <Animated.View
                key={card.id}
                style={[styles.card, { width: cardWidth, height: cardHeight, transform: [{ translateY: anim }] }]}
              >
                {imgSrc ? (
                  <Image
                    source={imgSrc}
                    style={{ width: cardWidth, height: cardHeight, borderRadius: Radius.md }}
                    resizeMode="cover"
                  />
                ) : (
                  <>
                    <Text style={[styles.cardRank, { color: isRed ? Colors.red : deckTheme.rankColor.black, fontSize: cardHeight * 0.16 }]}>
                      {card.rank}
                    </Text>
                    <Text style={[styles.cardSuit, { color: isRed ? Colors.red : deckTheme.rankColor.black, fontSize: cardHeight * 0.22 }]}>
                      {SUIT_SYMBOLS[card.suit]}
                    </Text>
                  </>
                )}
              </Animated.View>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Bidding controls ── */}
      {gameState.phase === 'bidding' && (
        <View style={styles.bidControls}>
          {isMyTurn ? (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.amountRow}>
                {validAmounts.map((a) => (
                  <TouchableOpacity
                    key={a}
                    onPress={() => setSelectedAmount(a)}
                    style={[styles.amountBtn, selectedAmount === a && styles.amountBtnActive]}
                  >
                    <Text style={[styles.amountText, selectedAmount === a && styles.amountTextActive]}>{a}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

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

              <View style={styles.actionRow}>
                <Button label="Pass"   onPress={handlePass}   variant="ghost"     style={{ flex: 1 }} loading={acting} />
                {canDouble && (
                  <Button label="Double" onPress={handleDouble} variant="secondary" style={{ flex: 1 }} loading={acting} />
                )}
                {canRedouble && (
                  <Button label="Redouble" onPress={handleRedouble} variant="secondary" style={{ flex: 1 }} loading={acting} />
                )}
                <Button label={`Bid ${selectedAmount}`} onPress={handleBid} style={{ flex: 2 }} loading={acting} />
              </View>
            </>
          ) : (
            <View style={styles.waitingWrap}>
              <Text style={styles.waitingText}>
                Waiting for {currentBidder?.displayName ?? '…'}
              </Text>
            </View>
          )}
        </View>
      )}

      {gameState.phase === 'dealing' && (
        <View style={styles.waitingWrap}><Text style={styles.waitingText}>Dealing cards…</Text></View>
      )}
      {gameState.phase === 'scoring' && (
        <View style={styles.waitingWrap}><Text style={styles.waitingText}>Preparing next round…</Text></View>
      )}

      {/* Exit menu */}
      <ExitMenu
        visible={showExitMenu}
        isLoading={isLoading}
        canExitRound={true}
        canExitGame={true}
        onExitRound={exitRound}
        onExitGame={exitGame}
        onLogout={logout}
        onClose={() => setShowExitMenu(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: Colors.bg },
  loading:     { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: FontSize.lg },

  // ── Teams panel ──
  teamsPanel: {
    flexDirection:     'row',
    alignItems:        'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical:   Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
  },
  teamCol: {
    flex: 1,
    gap:  Spacing.xs,
  },
  teamHeader: {
    borderRadius:      Radius.md,
    borderWidth:       1,
    paddingHorizontal: Spacing.sm,
    paddingVertical:   Spacing.xs,
  },
  teamLabel: {
    fontSize:      FontSize.xs,
    fontWeight:    FontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tablesValue: { fontSize: FontSize.lg, fontWeight: FontWeight.heavy, color: Colors.textPrimary },

  teamPlayers: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.xs,
  },

  // ── Player chip ──
  chipWrapper: { alignItems: 'center', width: 52 },
  chip: {
    width:           44,
    height:          44,
    borderRadius:    Radius.full,
    backgroundColor: Colors.bgCard,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     0,
    borderColor:     'transparent',
  },
  chipAvatar: { fontSize: 22 },
  bidderDot: {
    position:     'absolute',
    bottom:       0,
    right:        0,
    width:        10,
    height:       10,
    borderRadius: 5,
    borderWidth:  1.5,
    borderColor:  Colors.bg,
  },
  chipName: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, textAlign: 'center' },
  chipBid:  { fontSize: 9, color: Colors.textMuted, textAlign: 'center' },

  // ── Timer ──
  timerCol: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.sm, gap: 4 },
  roundBadgeText: { fontSize: FontSize.xs, color: Colors.textMuted },
  timerRing: {
    width:        52,
    height:       52,
    borderRadius: 26,
    borderWidth:  3,
    borderColor:  Colors.bgSurface,
    alignItems:   'center',
    justifyContent: 'center',
  },
  timerText: { fontSize: FontSize.lg, fontWeight: FontWeight.heavy, color: Colors.textPrimary },

  // ── High bid banner ──
  highBidBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.bgSurface,
  },
  highBidLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  highBidValue: { fontSize: FontSize.xl, fontWeight: FontWeight.heavy, color: Colors.accent },
  highBidMod:   { fontSize: FontSize.sm, color: Colors.warning, fontWeight: FontWeight.bold },

  // ── Hand ──
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
    backgroundColor: Colors.cardFace,
    borderRadius:    Radius.md,
    padding:         Spacing.xs,
    justifyContent:  'space-between',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.3,
    shadowRadius:    4,
    elevation:       4,
  },
  cardRank: { fontWeight: FontWeight.heavy },
  cardSuit: { alignSelf: 'flex-end' },

  // ── Bid controls ──
  bidControls: {
    backgroundColor: Colors.bgCard,
    borderTopWidth:  1,
    borderTopColor:  Colors.bgSurface,
    padding:         Spacing.md,
    gap:             Spacing.sm,
  },
  amountRow: { gap: Spacing.xs, paddingVertical: Spacing.xs },
  amountBtn: {
    width:           40,
    height:          40,
    borderRadius:    Radius.md,
    backgroundColor: Colors.bg,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     'transparent',
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
  trumpBtnActive:  { borderColor: Colors.accent, backgroundColor: Colors.bgSurface },
  trumpText:       { fontSize: FontSize.lg, color: Colors.textPrimary },
  trumpTextActive: { fontWeight: FontWeight.bold },

  actionRow: { flexDirection: 'row', gap: Spacing.sm },

  waitingWrap: { alignItems: 'center', padding: Spacing.lg },
  waitingText: { fontSize: FontSize.md, color: Colors.textSecondary, fontStyle: 'italic' },
});
