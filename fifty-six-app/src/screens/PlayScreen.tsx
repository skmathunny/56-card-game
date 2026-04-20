import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  useWindowDimensions,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import { useTransport } from '../services/transportContext';
import { useGameStore } from '../store/gameSlice';
import { useUIStore } from '../store/uiSlice';
import { useLobbyStore } from '../store/lobbySlice';
import { useGameExit } from '../hooks/useGameExit';
import { CardView } from '../components/game/CardView';
import { ChatPanel } from '../components/game/ChatPanel';
import { TrickHistoryPanel } from '../components/game/TrickHistoryPanel';
import { ExitMenu } from '../components/common/ExitMenu';
import { SUIT_SYMBOLS } from '../constants/cards';
import type { Suit } from '../constants/cards';
import type { Card } from '../constants/cards';

type Nav = NativeStackNavigationProp<any>;

const TEAM_COLORS = { A: Colors.teamA, B: Colors.teamB };

interface TimerProps {
  seconds: number;
}

function PlayTimer({ seconds }: TimerProps) {
  const urgent = seconds <= 10;
  return (
    <View style={[styles.timerRing, urgent && { borderColor: Colors.warning }]}>
      <Text style={[styles.timerText, urgent && { color: Colors.warning }]}>{seconds}</Text>
    </View>
  );
}

export default function PlayScreen() {
  const navigation = useNavigation<Nav>();
  const transport  = useTransport();
  const { gameState, myHand, unreadChatCount } = useGameStore();
  const { myPlayerId }                         = useLobbyStore();
  const {
    selectedCardId, selectCard,
    isChatOpen, setChatOpen,
    isTrickHistoryOpen, setTrickHistoryOpen,
    trickHistoryVotePrompt, dismissTrickHistoryVote,
    isRoundSummaryVisible,
  } = useUIStore();
  const { width, height } = useWindowDimensions();
  const { exitRound, exitGame, logout, isLoading } = useGameExit();
  const [teamPopup, setTeamPopup] = useState<'A' | 'B' | null>(null);
  const [showExitMenu, setShowExitMenu] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30);

  const cardHeight  = Math.min(height * 0.22, 160);
  const cardWidth   = Math.round(cardHeight * (52 / 76));
  const cardOverlap = Math.round(cardWidth * 0.38);

  // Opponent played cards and trick area use 65% of hand card size
  const oppCardHeight = Math.round(cardHeight * 0.65);
  const oppCardWidth  = Math.round(cardWidth  * 0.65);


  useEffect(() => {
    if (isRoundSummaryVisible) navigation.replace(ROUTES.ROUND_SUMMARY);
  }, [isRoundSummaryVisible]);

  useEffect(() => {
    if (gameState?.phase === 'complete') navigation.replace(ROUTES.END_GAME);
  }, [gameState?.phase]);

  // Check whose turn it is
  const isMyTurn =
    gameState?.phase === 'playing' &&
    gameState?.players[gameState.currentPlayerSeatIndex]?.id === myPlayerId;

  // Legal cards: server sends full public state; we highlight based on led suit
  const ledSuit    = gameState?.currentTrick?.ledSuit;
  const handHasSuit = ledSuit
    ? myHand.some((c) => c.suit === ledSuit)
    : false;
  const isLegal = (card: Card) => {
    if (!isMyTurn) return true;
    if (!ledSuit) return true;
    if (!handHasSuit) return true;
    return card.suit === ledSuit;
  };

  // Play timer — resets each time the current player changes
  const { settings } = useLobbyStore();
  const playTimerSeconds = settings?.playTimerSeconds ?? 30;
  const currentPlayerSeat = gameState?.currentPlayerSeatIndex ?? -1;
  useEffect(() => {
    if (gameState?.phase !== 'playing' || !isMyTurn) return;
    setTimeLeft(playTimerSeconds);
    const id = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          // Auto-play lowest legal card when timer expires
          const legalCards = myHand.filter(card => isLegal(card));
          if (legalCards.length > 0) {
            // Sort by rank (lowest first) then by suit
            const lowestCard = legalCards.sort((a, b) => {
              if (a.rank !== b.rank) return a.rank - b.rank;
              return a.suit.localeCompare(b.suit);
            })[0];
            transport.playCard({ gameId: gameState.id, cardId: lowestCard.id });
          }
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [currentPlayerSeat, gameState?.phase, isMyTurn, myHand, transport, gameState?.id, playTimerSeconds]);

  if (!gameState) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading game…</Text>
      </View>
    );
  }

  const handleCardPress = async (card: Card) => {
    if (!isMyTurn) return;
    if (!isLegal(card)) return;

    if (selectedCardId !== card.id) {
      selectCard(card.id);
      return;
    }

    // Second tap: confirm play
    selectCard(null);
    await transport.playCard({ gameId: gameState.id, cardId: card.id });
  };

  const handleVoteTrickHistory = (vote: boolean) => {
    transport.voteTrickHistory({ gameId: gameState.id, vote });
    dismissTrickHistoryVote();
  };

  const currentPlayer = gameState.players[gameState.currentPlayerSeatIndex];
  const trump = gameState.trump;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <View style={styles.teams}>
          {(['A', 'B'] as const).map((team) => (
            <TouchableOpacity key={team} onPress={() => setTeamPopup(team)}
              style={[styles.teamChip, { backgroundColor: TEAM_COLORS[team] + '22', borderColor: TEAM_COLORS[team] + '66' }]}>
              <Text style={[styles.teamLabel, { color: TEAM_COLORS[team] }]}>Team {team}</Text>
              <Text style={[styles.teamTables, { color: TEAM_COLORS[team] }]}>{gameState.teams[team].tables}▼</Text>
              <Text style={styles.teamPts}>{gameState.teams[team].roundPoints}pt</Text>
            </TouchableOpacity>
          ))}
        </View>

        {trump && (
          <View style={styles.trumpBadge}>
            <Text style={styles.trumpLabel}>Trump</Text>
            <Text style={[
              styles.trumpValue,
              (trump === 'hearts' || trump === 'diamonds') && { color: Colors.red },
            ]}>
              {trump === 'no-trumps' ? 'NT' : SUIT_SYMBOLS[trump as Suit]}
            </Text>
          </View>
        )}

        {gameState.winningBid && (
          <View style={styles.bidBadge}>
            <Text style={styles.bidBadgeText}>
              Bid {gameState.winningBid.amount}
              {gameState.winningBid.trump === 'no-trumps' ? ' NT' : ` ${SUIT_SYMBOLS[gameState.winningBid.trump as Suit] ?? ''}`}
            </Text>
          </View>
        )}

        {/* Controls */}
        <View style={styles.topControls}>
          <TouchableOpacity
            onPress={() => transport.requestTrickHistory({ gameId: gameState.id })}
            style={styles.iconBtn}
          >
            <Text style={styles.iconBtnText}>📋</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setChatOpen(true)} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>💬</Text>
            {unreadChatCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadChatCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowExitMenu(true)} style={styles.iconBtn}>
            <Text style={styles.iconBtnText}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Table: opponents around the top */}
      <View style={styles.table}>
        {/* Opponents (seats other than mine) */}
        <View style={styles.opponents}>
          {gameState.players
            .filter((p) => p.id !== myPlayerId)
            .map((p) => {
              const isCurrent = gameState.players[gameState.currentPlayerSeatIndex]?.id === p.id;
              const playedCard = gameState.currentTrick?.cards.find((c) => c.playerId === p.id);
              return (
                <View key={p.id} style={[styles.opponentSlot, isCurrent && styles.opponentActive]}>
                  <Text style={styles.opponentAvatar}>{p.avatarUrl}</Text>
                  <Text style={styles.opponentName} numberOfLines={1}>{p.displayName}</Text>
                  {playedCard ? (
                    <CardView card={playedCard.card} width={oppCardWidth} height={oppCardHeight} />
                  ) : (
                    <View style={[styles.opponentCardBack, { width: oppCardWidth, height: oppCardHeight }]} />
                  )}
                  {isCurrent && <View style={styles.turnIndicator} />}
                </View>
              );
            })}
        </View>

        {/* Center trick area */}
        <View style={styles.centerTrick}>
          {gameState.currentTrick?.cards.map((tc) => {
            const player = gameState.players.find((p) => p.id === tc.playerId);
            return (
              <View key={`${tc.playerId}-${tc.card.id}`} style={styles.trickCardWrap}>
                <Text style={styles.trickPlayerName}>{player?.displayName ?? ''}</Text>
                <CardView card={tc.card} width={oppCardWidth} height={oppCardHeight} />
              </View>
            );
          })}
          {(!gameState.currentTrick || gameState.currentTrick.cards.length === 0) && (
            <Text style={styles.trickEmpty}>Play a card to lead</Text>
          )}
        </View>

        {/* Turn label */}
        <View style={styles.turnLabel}>
          {isMyTurn ? (
            <View style={styles.myTurnContainer}>
              <Text style={styles.yourTurnText}>
                {selectedCardId ? 'Tap again to play' : 'Your turn — select a card'}
              </Text>
              <PlayTimer seconds={timeLeft} />
            </View>
          ) : (
            <Text style={styles.waitingTurnText}>
              {currentPlayer?.displayName ?? '…'}'s turn
            </Text>
          )}
        </View>
      </View>

      {/* Player hand */}
      <View style={[styles.handArea, { paddingBottom: Math.round(cardHeight * 0.12) + Spacing.sm }]}>
        <View style={styles.hand}>
          {myHand.map((card, i) => (
            <View
              key={card.id}
              style={[
                styles.handCardWrap,
                { zIndex: i, marginLeft: i === 0 ? 0 : -cardOverlap },
                selectedCardId === card.id && styles.handCardSelected,
              ]}
            >
              <CardView
                card={card}
                selected={selectedCardId === card.id}
                legal={isLegal(card)}
                onPress={() => handleCardPress(card)}
                width={cardWidth}
                height={cardHeight}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Trick count */}
      <View style={styles.trickCount}>
        <Text style={styles.trickCountText}>
          Tricks: A {gameState.tricks.filter((t) => {
            const w = gameState.players.find((p) => p.id === t.winnerId);
            return w?.teamId === 'A';
          }).length} – B {gameState.tricks.filter((t) => {
            const w = gameState.players.find((p) => p.id === t.winnerId);
            return w?.teamId === 'B';
          }).length}
        </Text>
      </View>

      {/* Chat drawer */}
      <Modal visible={isChatOpen} animationType="slide" transparent onRequestClose={() => setChatOpen(false)}>
        <View style={styles.drawerOverlay}>
          <View style={styles.drawer}>
            <ChatPanel onClose={() => setChatOpen(false)} />
          </View>
        </View>
      </Modal>

      {/* Trick history drawer */}
      <Modal visible={isTrickHistoryOpen} animationType="slide" transparent onRequestClose={() => setTrickHistoryOpen(false)}>
        <View style={styles.drawerOverlay}>
          <View style={styles.drawer}>
            <TrickHistoryPanel onClose={() => setTrickHistoryOpen(false)} />
          </View>
        </View>
      </Modal>

      {/* Team detail popup */}
      <Modal visible={!!teamPopup} animationType="fade" transparent onRequestClose={() => setTeamPopup(null)}>
        <TouchableOpacity style={styles.voteOverlay} activeOpacity={1} onPress={() => setTeamPopup(null)}>
          <View style={[styles.voteCard, { borderTopWidth: 3, borderTopColor: teamPopup ? TEAM_COLORS[teamPopup] : Colors.accent }]}>
            {teamPopup && (
              <>
                <Text style={[styles.voteTitle, { color: TEAM_COLORS[teamPopup] }]}>Team {teamPopup}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm }}>
                  <Text style={styles.voteBody}>{gameState.teams[teamPopup].tables} tables remaining</Text>
                  <Text style={styles.voteBody}>{gameState.teams[teamPopup].roundPoints} pts this round</Text>
                </View>
                <ScrollView>
                  {gameState.players.filter(p => p.teamId === teamPopup).map(p => {
                    const tricksWon = gameState.tricks.filter(t => t.winnerId === p.id).length;
                    const isCurrent = gameState.players[gameState.currentPlayerSeatIndex]?.id === p.id;
                    return (
                      <View key={p.id} style={styles.teamPopupRow}>
                        <Text style={styles.teamPopupAvatar}>{p.avatarUrl}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.teamPopupName, isCurrent && { color: Colors.accent }]}>
                            {p.displayName}{p.id === myPlayerId ? ' (You)' : ''}
                          </Text>
                        </View>
                        <Text style={styles.teamPopupTricks}>{tricksWon} tricks</Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Trick history vote prompt */}
      <Modal visible={!!trickHistoryVotePrompt} animationType="fade" transparent>
        <View style={styles.voteOverlay}>
          <View style={styles.voteCard}>
            <Text style={styles.voteTitle}>Trick History Request</Text>
            <Text style={styles.voteBody}>
              {trickHistoryVotePrompt?.requestingPlayerName} wants to view the trick history.
            </Text>
            <View style={styles.voteButtons}>
              <TouchableOpacity
                style={[styles.voteBtn, styles.voteBtnNo]}
                onPress={() => handleVoteTrickHistory(false)}
              >
                <Text style={styles.voteBtnText}>Deny</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteBtn, styles.voteBtnYes]}
                onPress={() => handleVoteTrickHistory(true)}
              >
                <Text style={styles.voteBtnText}>Allow</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  safe:    { flex: 1, backgroundColor: Colors.bg },
  loading: { flex: 1, backgroundColor: Colors.bg, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: Colors.textSecondary, fontSize: FontSize.lg },

  topBar: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
    gap:            Spacing.sm,
    flexWrap:       'wrap',
  },
  teams:     { flexDirection: 'row', gap: Spacing.sm },
  teamChip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderWidth:     1,
  },
  teamLabel:  { fontSize: FontSize.xs, fontWeight: FontWeight.heavy },
  teamTables: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  teamPts:    { fontSize: FontSize.xs, color: Colors.textMuted },

  teamPopupRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
  },
  teamPopupAvatar: { fontSize: 24 },
  teamPopupName:   { fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: FontWeight.medium },
  teamPopupTricks: { fontSize: FontSize.xs, color: Colors.textMuted, width: 52, textAlign: 'right' },

  trumpBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  trumpLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  trumpValue: { fontSize: FontSize.md, fontWeight: FontWeight.heavy, color: Colors.textPrimary },

  bidBadge: {
    backgroundColor: Colors.bgSurface,
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
  },
  bidBadgeText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.bold },

  topControls: { marginLeft: 'auto', flexDirection: 'row', gap: Spacing.sm },
  iconBtn: {
    width:          36,
    height:         36,
    borderRadius:   Radius.full,
    backgroundColor: Colors.bgCard,
    alignItems:     'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 16 },
  badge: {
    position:        'absolute',
    top:             -2,
    right:           -2,
    backgroundColor: Colors.accent,
    borderRadius:    Radius.full,
    width:           16,
    height:          16,
    alignItems:      'center',
    justifyContent:  'center',
  },
  badgeText: { fontSize: 9, color: '#fff', fontWeight: FontWeight.bold },

  table: { flex: 1, padding: Spacing.md, gap: Spacing.sm },

  opponents: {
    flexDirection:  'row',
    justifyContent: 'space-evenly',
    flexWrap:       'wrap',
    gap:            Spacing.sm,
  },
  opponentSlot: {
    alignItems:      'center',
    gap:             4,
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.lg,
    padding:         Spacing.sm,
    minWidth:        80,
    borderWidth:     1.5,
    borderColor:     'transparent',
  },
  opponentActive: { borderColor: Colors.accent },
  opponentAvatar: { fontSize: 22 },
  opponentName:   { fontSize: FontSize.xs, color: Colors.textSecondary, maxWidth: 56 },
  opponentCardBack: {
    width:           36,
    height:          52,
    backgroundColor: Colors.bgSurface,
    borderRadius:    Radius.sm,
    borderWidth:     1,
    borderColor:     Colors.bgCard,
  },
  turnIndicator: {
    width:           6,
    height:          6,
    borderRadius:    Radius.full,
    backgroundColor: Colors.accent,
  },

  centerTrick: {
    flex:           1,
    flexDirection:  'row',
    flexWrap:       'wrap',
    justifyContent: 'center',
    alignItems:     'center',
    gap:            Spacing.sm,
    backgroundColor: Colors.bgCard,
    borderRadius:   Radius.xl,
    padding:        Spacing.md,
    minHeight:      80,
  },
  trickCardWrap: { alignItems: 'center', gap: 4 },
  trickPlayerName: { fontSize: FontSize.xs, color: Colors.textMuted },
  trickEmpty: { color: Colors.textMuted, fontSize: FontSize.sm, fontStyle: 'italic' },

  turnLabel: { alignItems: 'center', paddingVertical: Spacing.xs },
  myTurnContainer: { alignItems: 'center', gap: Spacing.sm },
  yourTurnText:    { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.accent },
  waitingTurnText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontStyle: 'italic' },

  timerRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.bg,
  },
  timerText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.accent,
  },

  handArea: {
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
  },
  hand: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems:     'flex-end',
  },
  handCardWrap: { position: 'relative' },
  handCardSelected: { zIndex: 99 },

  trickCount: {
    alignItems:    'center',
    paddingBottom: Spacing.sm,
  },
  trickCountText: { fontSize: FontSize.xs, color: Colors.textMuted },

  // Drawers
  drawerOverlay: {
    flex:            1,
    backgroundColor: Colors.bgOverlay,
    justifyContent:  'flex-end',
  },
  drawer: {
    height:          '60%',
    borderTopLeftRadius:  Radius.xl,
    borderTopRightRadius: Radius.xl,
    overflow:        'hidden',
  },

  // Vote modal
  voteOverlay: {
    flex:            1,
    backgroundColor: Colors.bgOverlay,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         Spacing.xl,
  },
  voteCard: {
    width:           '100%',
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
    gap:             Spacing.md,
  },
  voteTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  voteBody:  { fontSize: FontSize.md, color: Colors.textSecondary },
  voteButtons: { flexDirection: 'row', gap: Spacing.md },
  voteBtn: {
    flex:            1,
    paddingVertical: Spacing.sm + 4,
    borderRadius:    Radius.lg,
    alignItems:      'center',
  },
  voteBtnNo:  { backgroundColor: Colors.bgSurface },
  voteBtnYes: { backgroundColor: Colors.accent },
  voteBtnText: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
});
