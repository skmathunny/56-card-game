import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useGameStore } from '../store/gameSlice';
import { useLobbyStore } from '../store/lobbySlice';
import { useUIStore } from '../store/uiSlice';
import { leaveAndCleanup } from '../utils/leaveAndCleanup';
import type { GameTransport } from '../services/GameTransport';

// ── Helpers ──────────────────────────────────────────────────────────────────

function mockTransport(overrides: Partial<GameTransport> = {}): GameTransport {
  return {
    joinRoom:   vi.fn().mockResolvedValue({ room: { id: 'r1', code: 'ABC12', players: [] }, yourPlayer: { id: 'p1' } }),
    leaveRoom:  vi.fn(),
    disconnect: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  } as unknown as GameTransport;
}

const MOCK_GAME_STATE: any = {
  id: 'game-1',
  roomId: 'r1',
  playerCount: 4,
  roundNumber: 2,
  phase: 'playing',
  players: [],
  teams: { A: { id: 'A', tables: 7, roundPoints: 0 }, B: { id: 'B', tables: 7, roundPoints: 0 } },
  dealerSeatIndex: 0,
  currentPlayerSeatIndex: 1,
  biddingState: { bids: [], currentBidderSeatIndex: 0, currentHighBid: null, isComplete: false },
  winningBid: null,
  trump: null,
  tricks: [],
  currentTrick: null,
  winner: null,
};

const MOCK_ROOM_SETTINGS: any = {
  playerCount: 4,
  startingTables: 7,
  bidTimerSeconds: 30,
  playTimerSeconds: 30,
  expiryHours: 4,
  deckId: 'default',
};

function populateStores() {
  useGameStore.getState().setGameState(MOCK_GAME_STATE, []);
  useGameStore.getState().addChatMessage({ id: 'msg1', playerId: 'p1', displayName: 'Alice', message: 'hi', timestamp: Date.now() });
  useLobbyStore.getState().setRoom('r1', 'ABC12', MOCK_ROOM_SETTINGS);
  useLobbyStore.getState().setMyPlayer('p1');
  useUIStore.getState().setChatOpen(true);
  useUIStore.getState().setTrickHistoryOpen(true);
}

// ── Store reset between tests ─────────────────────────────────────────────────

beforeEach(() => {
  useGameStore.getState().clearGame();
  useLobbyStore.getState().clearLobby();
  useUIStore.getState().resetUI();
});

// ── leaveAndCleanup unit tests ────────────────────────────────────────────────

describe('leaveAndCleanup', () => {
  it('calls leaveRoom with the roomId when roomId is set', async () => {
    const transport = mockTransport();
    populateStores();
    const { clearGame } = useGameStore.getState();
    const { clearLobby } = useLobbyStore.getState();
    const { resetUI } = useUIStore.getState();

    await leaveAndCleanup(transport, 'r1', clearGame, clearLobby, resetUI, false);

    expect(transport.leaveRoom).toHaveBeenCalledWith({ roomId: 'r1' });
  });

  it('does NOT call leaveRoom when roomId is null', async () => {
    const transport = mockTransport();
    const { clearGame } = useGameStore.getState();
    const { clearLobby } = useLobbyStore.getState();
    const { resetUI } = useUIStore.getState();

    await leaveAndCleanup(transport, null, clearGame, clearLobby, resetUI, false);

    expect(transport.leaveRoom).not.toHaveBeenCalled();
  });

  it('clears game state after leaveAndCleanup', async () => {
    const transport = mockTransport();
    populateStores();

    const { clearGame } = useGameStore.getState();
    const { clearLobby } = useLobbyStore.getState();
    const { resetUI } = useUIStore.getState();

    await leaveAndCleanup(transport, 'r1', clearGame, clearLobby, resetUI, false);

    const game = useGameStore.getState();
    expect(game.gameState).toBeNull();
    expect(game.myHand).toEqual([]);
    expect(game.roundSummary).toBeNull();
    expect(game.roundHistory).toEqual([]);
    expect(game.chatMessages).toEqual([]);
    expect(game.unreadChatCount).toBe(0);
  });

  it('clears lobby state after leaveAndCleanup', async () => {
    const transport = mockTransport();
    populateStores();

    const { clearGame } = useGameStore.getState();
    const { clearLobby } = useLobbyStore.getState();
    const { resetUI } = useUIStore.getState();

    await leaveAndCleanup(transport, 'r1', clearGame, clearLobby, resetUI, false);

    const lobby = useLobbyStore.getState();
    expect(lobby.roomId).toBeNull();
    expect(lobby.roomCode).toBeNull();
    expect(lobby.myPlayerId).toBeNull();
    expect(lobby.players).toEqual([]);
    expect(lobby.isHost).toBe(false);
  });

  it('resets UI state after leaveAndCleanup', async () => {
    const transport = mockTransport();
    populateStores();

    const { clearGame } = useGameStore.getState();
    const { clearLobby } = useLobbyStore.getState();
    const { resetUI } = useUIStore.getState();

    await leaveAndCleanup(transport, 'r1', clearGame, clearLobby, resetUI, false);

    const ui = useUIStore.getState();
    expect(ui.isChatOpen).toBe(false);
    expect(ui.isTrickHistoryOpen).toBe(false);
    expect(ui.isRoundSummaryVisible).toBe(false);
    expect(ui.selectedCardId).toBeNull();
    expect(ui.trickHistoryVotePrompt).toBeNull();
  });

  it('does NOT call disconnect when disconnectSocket=false (exitRound/exitGame)', async () => {
    const transport = mockTransport();
    populateStores();

    const { clearGame } = useGameStore.getState();
    const { clearLobby } = useLobbyStore.getState();
    const { resetUI } = useUIStore.getState();

    await leaveAndCleanup(transport, 'r1', clearGame, clearLobby, resetUI, false);

    expect(transport.disconnect).not.toHaveBeenCalled();
  });

  it('calls disconnect when disconnectSocket=true (logout)', async () => {
    const transport = mockTransport();
    populateStores();

    const { clearGame } = useGameStore.getState();
    const { clearLobby } = useLobbyStore.getState();
    const { resetUI } = useUIStore.getState();

    await leaveAndCleanup(transport, 'r1', clearGame, clearLobby, resetUI, true);

    expect(transport.disconnect).toHaveBeenCalled();
  });

  it('continues cleanup even if leaveRoom throws', async () => {
    const transport = mockTransport({ leaveRoom: vi.fn().mockImplementation(() => { throw new Error('socket closed'); }) });
    populateStores();

    const { clearGame } = useGameStore.getState();
    const { clearLobby } = useLobbyStore.getState();
    const { resetUI } = useUIStore.getState();

    await expect(leaveAndCleanup(transport, 'r1', clearGame, clearLobby, resetUI, false))
      .resolves.not.toThrow();

    expect(useGameStore.getState().gameState).toBeNull();
    expect(useLobbyStore.getState().roomId).toBeNull();
  });

  it('continues cleanup even if disconnect throws', async () => {
    const transport = mockTransport({ disconnect: vi.fn().mockRejectedValue(new Error('socket error')) });
    populateStores();

    const { clearGame } = useGameStore.getState();
    const { clearLobby } = useLobbyStore.getState();
    const { resetUI } = useUIStore.getState();

    await expect(leaveAndCleanup(transport, 'r1', clearGame, clearLobby, resetUI, true))
      .resolves.not.toThrow();

    expect(useGameStore.getState().gameState).toBeNull();
  });
});

// ── Store state transitions ───────────────────────────────────────────────────

describe('gameStore state transitions', () => {
  it('setGameState populates gameState and hand', () => {
    const hand: any[] = [{ suit: 'hearts', rank: 'A' }];
    useGameStore.getState().setGameState(MOCK_GAME_STATE, hand);
    expect(useGameStore.getState().gameState?.phase).toBe('playing');
    expect(useGameStore.getState().myHand).toHaveLength(1);
  });

  it('setRoundSummary appends to roundHistory', () => {
    useGameStore.getState().setGameState(MOCK_GAME_STATE, []);
    const summary: any = {
      bidTeam: 'A', bidAmount: 15, success: true, tablesChange: 1,
      doubled: false, redoubled: false,
      finalTeamPoints: { A: 16, B: 12 }, tricks: [],
    };
    useGameStore.getState().setRoundSummary(summary, []);
    expect(useGameStore.getState().roundHistory).toHaveLength(1);
    expect(useGameStore.getState().roundHistory[0].roundNumber).toBe(2);
  });

  it('setRoundSummary preserves tricks in roundSummary', () => {
    useGameStore.getState().setGameState(MOCK_GAME_STATE, []);
    const tricks: any[] = [{ id: 1, ledSuit: 'hearts', cards: [], winnerId: 'p1', points: 2 }];
    const summary: any = {
      bidTeam: 'A', bidAmount: 15, success: true, tablesChange: 1,
      doubled: false, redoubled: false,
      finalTeamPoints: { A: 16, B: 12 }, tricks,
    };
    useGameStore.getState().setRoundSummary(summary, tricks);
    expect(useGameStore.getState().roundSummary?.tricks).toHaveLength(1);
  });

  it('clearGame resets all fields to initial values', () => {
    populateStores();
    useGameStore.getState().clearGame();
    const state = useGameStore.getState();
    expect(state.gameState).toBeNull();
    expect(state.myHand).toEqual([]);
    expect(state.roundSummary).toBeNull();
    expect(state.roundHistory).toEqual([]);
    expect(state.chatMessages).toEqual([]);
    expect(state.unreadChatCount).toBe(0);
    expect(state.disconnectedPlayers.size).toBe(0);
  });

  it('accumulated roundHistory is cleared on clearGame', () => {
    useGameStore.getState().setGameState(MOCK_GAME_STATE, []);
    const summary: any = {
      bidTeam: 'A', bidAmount: 15, success: true, tablesChange: 1,
      doubled: false, redoubled: false,
      finalTeamPoints: { A: 16, B: 12 }, tricks: [],
    };
    useGameStore.getState().setRoundSummary(summary, []);
    expect(useGameStore.getState().roundHistory).toHaveLength(1);

    useGameStore.getState().clearGame();
    expect(useGameStore.getState().roundHistory).toHaveLength(0);
  });

  it('disconnectedPlayers set is cleared on clearGame', () => {
    useGameStore.getState().setPlayerDisconnected('p2');
    expect(useGameStore.getState().disconnectedPlayers.has('p2')).toBe(true);
    useGameStore.getState().clearGame();
    expect(useGameStore.getState().disconnectedPlayers.size).toBe(0);
  });

  it('markChatRead zeroes unread count', () => {
    useGameStore.getState().addChatMessage({ id: 'm1', playerId: 'p1', displayName: 'A', message: 'hi', timestamp: 1 });
    useGameStore.getState().addChatMessage({ id: 'm2', playerId: 'p2', displayName: 'B', message: 'yo', timestamp: 2 });
    expect(useGameStore.getState().unreadChatCount).toBe(2);
    useGameStore.getState().markChatRead();
    expect(useGameStore.getState().unreadChatCount).toBe(0);
  });
});

// ── Exit then create new room (lifecycle) ─────────────────────────────────────

describe('exit → create new room lifecycle', () => {
  it('stores are clean after exitRound, ready for a new joinRoom', async () => {
    const transport = mockTransport();
    populateStores();

    // simulate exitRound
    await leaveAndCleanup(
      transport, 'r1',
      useGameStore.getState().clearGame,
      useLobbyStore.getState().clearLobby,
      useUIStore.getState().resetUI,
      false,
    );

    // verify stores are clean
    expect(useGameStore.getState().gameState).toBeNull();
    expect(useLobbyStore.getState().roomId).toBeNull();
    expect(useUIStore.getState().isChatOpen).toBe(false);

    // simulate joining new room
    useLobbyStore.getState().setRoom('r2', 'XYZ99', MOCK_ROOM_SETTINGS);
    useLobbyStore.getState().setMyPlayer('p2');
    expect(useLobbyStore.getState().roomId).toBe('r2');
    expect(useLobbyStore.getState().myPlayerId).toBe('p2');
  });

  it('stores are clean after exitGame, ready for a new joinRoom', async () => {
    const transport = mockTransport();
    populateStores();

    // simulate exitGame
    await leaveAndCleanup(
      transport, 'r1',
      useGameStore.getState().clearGame,
      useLobbyStore.getState().clearLobby,
      useUIStore.getState().resetUI,
      false,
    );

    expect(useGameStore.getState().gameState).toBeNull();
    expect(useLobbyStore.getState().roomId).toBeNull();

    // second room
    useLobbyStore.getState().setRoom('r3', 'AAA00', MOCK_ROOM_SETTINGS);
    expect(useLobbyStore.getState().roomId).toBe('r3');
  });

  it('stores are clean after logout and socket is disconnected', async () => {
    const transport = mockTransport();
    populateStores();

    // simulate logout
    await leaveAndCleanup(
      transport, 'r1',
      useGameStore.getState().clearGame,
      useLobbyStore.getState().clearLobby,
      useUIStore.getState().resetUI,
      true,
    );

    expect(transport.disconnect).toHaveBeenCalledOnce();
    expect(useGameStore.getState().gameState).toBeNull();
    expect(useLobbyStore.getState().roomId).toBeNull();
  });

  it('round history does NOT carry over into a new game after exit', async () => {
    const transport = mockTransport();
    // play through a round
    useGameStore.getState().setGameState(MOCK_GAME_STATE, []);
    const summary: any = {
      bidTeam: 'A', bidAmount: 16, success: true, tablesChange: 2,
      doubled: false, redoubled: false,
      finalTeamPoints: { A: 18, B: 10 }, tricks: [],
    };
    useGameStore.getState().setRoundSummary(summary, []);
    expect(useGameStore.getState().roundHistory).toHaveLength(1);
    useLobbyStore.getState().setRoom('r1', 'ABC12', MOCK_ROOM_SETTINGS);

    // exit
    await leaveAndCleanup(
      transport, 'r1',
      useGameStore.getState().clearGame,
      useLobbyStore.getState().clearLobby,
      useUIStore.getState().resetUI,
      false,
    );

    // new game starts fresh
    const newGameState = { ...MOCK_GAME_STATE, id: 'game-2', roundNumber: 1 };
    useLobbyStore.getState().setRoom('r4', 'NEW01', MOCK_ROOM_SETTINGS);
    useGameStore.getState().setGameState(newGameState, []);

    expect(useGameStore.getState().roundHistory).toHaveLength(0);
    expect(useGameStore.getState().gameState?.id).toBe('game-2');
  });

  it('multiple exits in sequence leave stores clean each time', async () => {
    for (let i = 0; i < 3; i++) {
      const transport = mockTransport();
      populateStores();

      await leaveAndCleanup(
        transport, 'r1',
        useGameStore.getState().clearGame,
        useLobbyStore.getState().clearLobby,
        useUIStore.getState().resetUI,
        false,
      );

      expect(useGameStore.getState().gameState).toBeNull();
      expect(useLobbyStore.getState().roomId).toBeNull();
      expect(useUIStore.getState().isChatOpen).toBe(false);
    }
  });
});

// ── Phase-specific exit scenarios ─────────────────────────────────────────────

describe('exit during different game phases', () => {
  it('exit during bidding phase clears state correctly', async () => {
    const transport = mockTransport();
    const biddingState = {
      ...MOCK_GAME_STATE,
      phase: 'bidding',
      biddingState: {
        bids: [{ id: 'b1', playerId: 'p1', amount: 15, trump: null, type: 'bid', timestamp: 1 }],
        currentBidderSeatIndex: 1,
        currentHighBid: null,
        isComplete: false,
      },
    };
    useLobbyStore.getState().setRoom('r1', 'ABC12', MOCK_ROOM_SETTINGS);
    useGameStore.getState().setGameState(biddingState, []);

    await leaveAndCleanup(
      transport, 'r1',
      useGameStore.getState().clearGame,
      useLobbyStore.getState().clearLobby,
      useUIStore.getState().resetUI,
      false,
    );

    expect(useGameStore.getState().gameState).toBeNull();
    expect(transport.leaveRoom).toHaveBeenCalledWith({ roomId: 'r1' });
  });

  it('exit during playing phase clears selected card in UI', async () => {
    const transport = mockTransport();
    useLobbyStore.getState().setRoom('r1', 'ABC12', MOCK_ROOM_SETTINGS);
    useGameStore.getState().setGameState({ ...MOCK_GAME_STATE, phase: 'playing' }, []);
    useUIStore.getState().selectCard('card-ace-hearts');
    expect(useUIStore.getState().selectedCardId).toBe('card-ace-hearts');

    await leaveAndCleanup(
      transport, 'r1',
      useGameStore.getState().clearGame,
      useLobbyStore.getState().clearLobby,
      useUIStore.getState().resetUI,
      false,
    );

    expect(useUIStore.getState().selectedCardId).toBeNull();
  });

  it('exit during round summary clears roundSummary and UI flag', async () => {
    const transport = mockTransport();
    useLobbyStore.getState().setRoom('r1', 'ABC12', MOCK_ROOM_SETTINGS);
    useGameStore.getState().setGameState(MOCK_GAME_STATE, []);
    const summary: any = {
      bidTeam: 'B', bidAmount: 20, success: false, tablesChange: -3,
      doubled: true, redoubled: false,
      finalTeamPoints: { A: 28, B: 0 }, tricks: [],
    };
    useGameStore.getState().setRoundSummary(summary, []);
    useUIStore.getState().setRoundSummaryVisible(true);

    await leaveAndCleanup(
      transport, 'r1',
      useGameStore.getState().clearGame,
      useLobbyStore.getState().clearLobby,
      useUIStore.getState().resetUI,
      false,
    );

    expect(useGameStore.getState().roundSummary).toBeNull();
    expect(useUIStore.getState().isRoundSummaryVisible).toBe(false);
  });

  it('exit at game-complete phase clears winner state', async () => {
    const transport = mockTransport();
    const completeState = { ...MOCK_GAME_STATE, phase: 'complete', winner: 'A' };
    useLobbyStore.getState().setRoom('r1', 'ABC12', MOCK_ROOM_SETTINGS);
    useGameStore.getState().setGameState(completeState, []);

    await leaveAndCleanup(
      transport, 'r1',
      useGameStore.getState().clearGame,
      useLobbyStore.getState().clearLobby,
      useUIStore.getState().resetUI,
      false,
    );

    expect(useGameStore.getState().gameState).toBeNull();
  });
});

// ── lobbyStore unit tests ─────────────────────────────────────────────────────

describe('lobbyStore', () => {
  it('setRoom populates roomId, roomCode, settings', () => {
    useLobbyStore.getState().setRoom('r1', 'ABC12', MOCK_ROOM_SETTINGS);
    const s = useLobbyStore.getState();
    expect(s.roomId).toBe('r1');
    expect(s.roomCode).toBe('ABC12');
    expect(s.settings?.playerCount).toBe(4);
  });

  it('setMyPlayer records myPlayerId', () => {
    useLobbyStore.getState().setMyPlayer('player-uuid');
    expect(useLobbyStore.getState().myPlayerId).toBe('player-uuid');
  });

  it('setPlayers marks isHost correctly for current player', () => {
    useLobbyStore.getState().setMyPlayer('host-id');
    useLobbyStore.getState().setPlayers([
      { id: 'host-id', displayName: 'Host', avatarUrl: '', seatIndex: 0, teamId: 'A', isAI: false, isHost: true },
      { id: 'p2', displayName: 'P2', avatarUrl: '', seatIndex: 1, teamId: 'B', isAI: false, isHost: false },
    ]);
    expect(useLobbyStore.getState().isHost).toBe(true);
  });

  it('setPlayers marks isHost=false for non-host player', () => {
    useLobbyStore.getState().setMyPlayer('p2');
    useLobbyStore.getState().setPlayers([
      { id: 'host-id', displayName: 'Host', avatarUrl: '', seatIndex: 0, teamId: 'A', isAI: false, isHost: true },
      { id: 'p2', displayName: 'P2', avatarUrl: '', seatIndex: 1, teamId: 'B', isAI: false, isHost: false },
    ]);
    expect(useLobbyStore.getState().isHost).toBe(false);
  });

  it('clearLobby resets all fields', () => {
    useLobbyStore.getState().setRoom('r5', 'ZZZ99', MOCK_ROOM_SETTINGS);
    useLobbyStore.getState().setMyPlayer('px');
    useLobbyStore.getState().clearLobby();
    const s = useLobbyStore.getState();
    expect(s.roomId).toBeNull();
    expect(s.roomCode).toBeNull();
    expect(s.settings).toBeNull();
    expect(s.players).toEqual([]);
    expect(s.myPlayerId).toBeNull();
    expect(s.isHost).toBe(false);
  });
});

// ── uiStore unit tests ────────────────────────────────────────────────────────

describe('uiStore', () => {
  it('resetUI clears all UI state', () => {
    useUIStore.getState().setChatOpen(true);
    useUIStore.getState().setTrickHistoryOpen(true);
    useUIStore.getState().setRoundSummaryVisible(true);
    useUIStore.getState().selectCard('card-123');
    useUIStore.getState().showTrickHistoryVote({ requestingPlayerName: 'Bob' });

    useUIStore.getState().resetUI();
    const ui = useUIStore.getState();
    expect(ui.isChatOpen).toBe(false);
    expect(ui.isTrickHistoryOpen).toBe(false);
    expect(ui.isRoundSummaryVisible).toBe(false);
    expect(ui.selectedCardId).toBeNull();
    expect(ui.trickHistoryVotePrompt).toBeNull();
  });

  it('showTrickHistoryVote / dismissTrickHistoryVote round-trip', () => {
    useUIStore.getState().showTrickHistoryVote({ requestingPlayerName: 'Charlie' });
    expect(useUIStore.getState().trickHistoryVotePrompt?.requestingPlayerName).toBe('Charlie');
    useUIStore.getState().dismissTrickHistoryVote();
    expect(useUIStore.getState().trickHistoryVotePrompt).toBeNull();
  });
});
