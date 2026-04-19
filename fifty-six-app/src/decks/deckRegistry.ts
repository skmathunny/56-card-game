import classicImages  from './images/classic';
import royalImages    from './images/royal';
import minimalImages  from './images/minimal';
import orthodoxImages from './images/orthodox';

// ── Color themes (used as fallback when image deck not available) ─────────────

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
  royal: {
    id: 'royal',
    name: '👑 Royal',
    cardBackground: '#2D2D44',
    cardBorder: '#555577',
    rankColor: { red: '#FF6B6B', black: '#CCCCEE' },
    cardBack: '#1a1a2e',
  },
  minimal: {
    id: 'minimal',
    name: '◻ Minimal',
    cardBackground: '#F5F5FA',
    cardBorder: '#CCCCDD',
    rankColor: { red: '#CC2222', black: '#222244' },
    cardBack: '#5A5A78',
  },
  orthodox: {
    id: 'orthodox',
    name: '🎴 Orthodox',
    cardBackground: '#FFFFFF',
    cardBorder: '#3A8A3A',
    rankColor: { red: '#CC0000', black: '#1a1a1a' },
    cardBack: '#145014',
  },
};

export const DEFAULT_DECK_ID = 'classic';

export function getDeckTheme(deckId?: string): DeckTheme {
  return DECK_THEMES[deckId ?? DEFAULT_DECK_ID] ?? DECK_THEMES[DEFAULT_DECK_ID];
}

// ── Image maps — static require() calls satisfy Metro bundler ─────────────────

const IMAGE_MAPS: Record<string, Record<string, any>> = {
  classic:  classicImages,
  royal:    royalImages,
  minimal:  minimalImages,
  orthodox: orthodoxImages,
};

/**
 * Returns the image source for a card, or null if no image deck is loaded.
 * Strips the `_2` suffix used for duplicate cards in 2-deck games so both
 * copies map to the same image file.
 *
 * To register a new deck:
 *   1. Drop PNG files into assets/cards/<deckId>/
 *   2. Add an entry to src/decks/deckConfig.json
 *   3. Run scripts/generate-card-assets.js (creates src/decks/images/<deckId>.ts)
 *   4. Import the new image map above and add it to IMAGE_MAPS
 */
export function getCardImage(deckId: string | undefined, cardId: string): any | null {
  const map = IMAGE_MAPS[deckId ?? DEFAULT_DECK_ID];
  if (!map) return null;
  const baseId = cardId.replace(/_2$/, '');
  return map[baseId] ?? null;
}

export function getCardBackImage(deckId: string | undefined): any | null {
  const map = IMAGE_MAPS[deckId ?? DEFAULT_DECK_ID];
  return map?.back ?? null;
}

// ── Deck metadata list (for UI pickers) ──────────────────────────────────────

export interface DeckConfig {
  id: string;
  name: string;
  emoji: string;
  description: string;
}

import deckConfigJson from './deckConfig.json';
export const DECK_CONFIGS: DeckConfig[] = deckConfigJson.decks;
