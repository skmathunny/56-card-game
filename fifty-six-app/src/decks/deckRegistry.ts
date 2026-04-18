export interface DeckTheme {
  id: string;
  name: string;
  cardBackground: string;
  cardBorder: string;
  rankColor: { red: string; black: string };
  cardBack: string;
}

export const DECK_THEMES: Record<string, DeckTheme> = {
  classic: {
    id: 'classic',
    name: '🃏 Classic',
    cardBackground: '#FFFFFF',
    cardBorder: '#DDDDDD',
    rankColor: { red: '#CC0000', black: '#1a1a2e' },
    cardBack: '#1a6bb5',
  },
  dark: {
    id: 'dark',
    name: '🌙 Dark',
    cardBackground: '#2D2D44',
    cardBorder: '#555577',
    rankColor: { red: '#FF6B6B', black: '#CCCCEE' },
    cardBack: '#1a1a2e',
  },
  emerald: {
    id: 'emerald',
    name: '💚 Emerald',
    cardBackground: '#F0FFF4',
    cardBorder: '#48BB78',
    rankColor: { red: '#E53E3E', black: '#276749' },
    cardBack: '#276749',
  },
};

export const DEFAULT_DECK_ID = 'classic';

export function getDeckTheme(deckId?: string): DeckTheme {
  return DECK_THEMES[deckId ?? DEFAULT_DECK_ID] ?? DECK_THEMES[DEFAULT_DECK_ID];
}
