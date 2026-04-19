import { v4 as uuid } from 'uuid';
import { GameState } from '../models/GameState';
import { Player, Team } from '../models/Player';
import { dealHands, firstBidderSeatIndex, nextAnticlockwise } from './Dealer';
import { createBiddingState, validateBid, applyBid, resolveWinningBid, PlaceBidInput, BidError } from './BiddingEngine';
import { validatePlay, applyPlay, resolveTrick, PlayError } from './TrickEngine';
import { scoreRound, applyRoundResult, checkWinner, RoundResult } from './ScoringEngine';

export type EngineError = BidError | PlayError | 'WRONG_PHASE' | 'PLAYER_NOT_FOUND';

export interface GameEngineResult {
  state: GameState;
  error?: EngineError;
  roundResult?: RoundResult;
}

export function createGame(
  roomId: string,
  players: Omit<Player, 'hand'>[],
  startingTables: number,
): GameState {
  const playerCount = players.length as 4 | 6 | 8;
  const teams: { A: Team; B: Team } = {
    A: { id: 'A', playerIds: players.filter(p => p.teamId === 'A').map(p => p.id), tables: startingTables, roundPoints: 0 },
    B: { id: 'B', playerIds: players.filter(p => p.teamId === 'B').map(p => p.id), tables: startingTables, roundPoints: 0 },
  };

  const dealerSeatIndex = 0;
  const hands = dealHands(playerCount, players as Player[]);
  const playersWithHands: Player[] = (players as Player[]).map(p => ({ ...p, hand: hands[p.id] }));

  return {
    id: uuid(),
    roomId,
    playerCount,
    roundNumber: 1,
    phase: 'dealing',
    players: playersWithHands,
    teams,
    dealerSeatIndex,
    currentPlayerSeatIndex: firstBidderSeatIndex(dealerSeatIndex, playerCount),
    biddingState: createBiddingState(firstBidderSeatIndex(dealerSeatIndex, playerCount)),
    winningBid: null,
    trump: null,
    tricks: [],
    currentTrick: null,
    winner: null,
  };
}

export function startBidding(state: GameState): GameEngineResult {
  if (state.phase !== 'dealing') return { state, error: 'WRONG_PHASE' };
  return { state: { ...state, phase: 'bidding' } };
}

export function placeBid(state: GameState, playerId: string, input: PlaceBidInput): GameEngineResult {
  if (state.phase !== 'bidding') return { state, error: 'WRONG_PHASE' };

  const player = state.players.find(p => p.id === playerId);
  if (!player) return { state, error: 'PLAYER_NOT_FOUND' };

  const error = validateBid(state.biddingState, input, player.seatIndex, state.playerCount);
  if (error) return { state, error };

  const newBiddingState = applyBid(state.biddingState, input, player.seatIndex, state.playerCount);

  if (newBiddingState.isComplete) {
    const dealer = state.players.find(p => p.seatIndex === state.dealerSeatIndex);
    const winningBid = resolveWinningBid(newBiddingState, dealer?.id ?? state.players[0].id, state.playerCount);
    const bidder = state.players.find(p => p.id === winningBid.playerId);
    return {
      state: {
        ...state,
        biddingState: newBiddingState,
        winningBid,
        trump: winningBid.trump,
        phase: 'playing',
        currentPlayerSeatIndex: bidder?.seatIndex ?? state.dealerSeatIndex,
        currentTrick: { id: 1, ledSuit: null, cards: [], winnerId: null, points: 0 },
      },
    };
  }

  return {
    state: {
      ...state,
      biddingState: newBiddingState,
      currentPlayerSeatIndex: newBiddingState.currentBidderSeatIndex,
    },
  };
}

export function playCard(state: GameState, playerId: string, cardId: string): GameEngineResult {
  if (state.phase !== 'playing') return { state, error: 'WRONG_PHASE' };
  if (!state.currentTrick) return { state, error: 'WRONG_PHASE' };

  const player = state.players.find(p => p.id === playerId);
  if (!player) return { state, error: 'PLAYER_NOT_FOUND' };

  const card = player.hand.find(c => c.id === cardId);
  if (!card) return { state, error: 'CARD_NOT_IN_HAND' };

  const error = validatePlay(state.currentTrick, player, card, state.currentPlayerSeatIndex, state.playerCount);
  if (error) return { state, error };

  const updatedTrick = applyPlay(state.currentTrick, playerId, card);
  const updatedPlayers = state.players.map(p =>
    p.id === playerId ? { ...p, hand: p.hand.filter(c => c.id !== cardId) } : p,
  );

  // Trick complete when all players have played
  if (updatedTrick.cards.length === state.playerCount) {
    const resolvedTrick = resolveTrick(updatedTrick, state.trump ?? 'no-trumps');
    const tricks = [...state.tricks, resolvedTrick];
    const winner = state.players.find(p => p.id === resolvedTrick.winnerId);
    if (!winner) return { state, error: 'PLAYER_NOT_FOUND' };

    // Update round points for winning team
    const winnerTeam = winner.teamId;
    const teams = {
      ...state.teams,
      [winnerTeam]: {
        ...state.teams[winnerTeam],
        roundPoints: state.teams[winnerTeam].roundPoints + resolvedTrick.points,
      },
    };

    const deckSize = state.playerCount === 4 ? 24 : 48;
    const totalTricks = deckSize / state.playerCount;
    if (tricks.length === totalTricks) {
      return {
        state: {
          ...state,
          players: updatedPlayers,
          teams,
          tricks,
          currentTrick: null,
          phase: 'scoring',
          currentPlayerSeatIndex: winner.seatIndex,
        },
      };
    }

    // Next trick
    const nextTrickId = tricks.length + 1;
    return {
      state: {
        ...state,
        players: updatedPlayers,
        teams,
        tricks,
        currentTrick: { id: nextTrickId, ledSuit: null, cards: [], winnerId: null, points: 0 },
        currentPlayerSeatIndex: winner.seatIndex,
      },
    };
  }

  // Trick still in progress — advance to next player
  return {
    state: {
      ...state,
      players: updatedPlayers,
      currentTrick: updatedTrick,
      currentPlayerSeatIndex: nextAnticlockwise(player.seatIndex, state.playerCount),
    },
  };
}

export function scoreRoundAndAdvance(state: GameState): GameEngineResult {
  if (state.phase !== 'scoring' || !state.winningBid) return { state, error: 'WRONG_PHASE' };

  const result = scoreRound(state.winningBid, state.teams, state.players);
  const updatedTeams = applyRoundResult(state.teams, result);
  const gameWinner = checkWinner(updatedTeams);

  if (gameWinner) {
    return {
      state: { ...state, teams: updatedTeams, phase: 'complete', winner: gameWinner },
      roundResult: result,
    };
  }

  // Deal next round
  const nextDealer = nextAnticlockwise(state.dealerSeatIndex, state.playerCount);
  const hands = dealHands(state.playerCount, state.players);
  const refreshedPlayers = state.players.map(p => ({ ...p, hand: hands[p.id] }));
  const firstBidder = firstBidderSeatIndex(nextDealer, state.playerCount);

  return {
    state: {
      ...state,
      phase: 'dealing',
      roundNumber: state.roundNumber + 1,
      players: refreshedPlayers,
      teams: updatedTeams,
      dealerSeatIndex: nextDealer,
      currentPlayerSeatIndex: firstBidder,
      biddingState: createBiddingState(firstBidder),
      winningBid: null,
      trump: null,
      tricks: [],
      currentTrick: null,
    },
    roundResult: result,
  };
}
