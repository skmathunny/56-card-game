import { create } from 'zustand';

interface UIStore {
  selectedCardId: string | null;
  isChatOpen: boolean;
  isTrickHistoryOpen: boolean;
  isRoundSummaryVisible: boolean;
  trickHistoryVotePrompt: { requestingPlayerName: string } | null;

  selectCard(cardId: string | null): void;
  setChatOpen(open: boolean): void;
  setTrickHistoryOpen(open: boolean): void;
  setRoundSummaryVisible(visible: boolean): void;
  showTrickHistoryVote(prompt: { requestingPlayerName: string }): void;
  dismissTrickHistoryVote(): void;
  resetUI(): void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedCardId: null,
  isChatOpen: false,
  isTrickHistoryOpen: false,
  isRoundSummaryVisible: false,
  trickHistoryVotePrompt: null,

  selectCard(cardId) {
    set({ selectedCardId: cardId });
  },

  setChatOpen(open) {
    set({ isChatOpen: open });
  },

  setTrickHistoryOpen(open) {
    set({ isTrickHistoryOpen: open });
  },

  setRoundSummaryVisible(visible) {
    set({ isRoundSummaryVisible: visible });
  },

  showTrickHistoryVote(prompt) {
    set({ trickHistoryVotePrompt: prompt });
  },

  dismissTrickHistoryVote() {
    set({ trickHistoryVotePrompt: null });
  },

  resetUI() {
    set({
      selectedCardId: null,
      isChatOpen: false,
      isTrickHistoryOpen: false,
      isRoundSummaryVisible: false,
      trickHistoryVotePrompt: null,
    });
  },
}));
