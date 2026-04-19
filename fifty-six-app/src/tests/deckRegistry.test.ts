import { describe, it, expect, vi, beforeAll } from 'vitest';

// ── Mock image-map modules so PNG require() calls resolve in Node.js ──────────
// Factories must be self-contained (no external refs) because vi.mock is hoisted.

function buildMap(id: string) {
  const ranks = ['J', '9', 'A', '10', 'K', 'Q', '7', '8'];
  const suits = ['spades', 'hearts', 'diamonds', 'clubs'];
  const map: Record<string, string> = { back: `${id}-back` };
  for (const s of suits) for (const r of ranks) map[`${r}_${s}`] = `${id}-${r}_${s}`;
  return { default: map };
}

vi.mock('../decks/images/classic',  () => buildMap('classic'));
vi.mock('../decks/images/royal',    () => buildMap('royal'));
vi.mock('../decks/images/minimal',  () => buildMap('minimal'));
vi.mock('../decks/images/orthodox', () => buildMap('orthodox'));

const RANKS = ['J', '9', 'A', '10', 'K', 'Q', '7', '8'];
const SUITS = ['spades', 'hearts', 'diamonds', 'clubs'];

// Import after mocks are registered
import {
  getDeckTheme,
  getCardImage,
  getCardBackImage,
  DECK_THEMES,
  DECK_CONFIGS,
  DEFAULT_DECK_ID,
} from '../decks/deckRegistry';

// ── getDeckTheme ──────────────────────────────────────────────────────────────

describe('getDeckTheme', () => {
  it('returns the classic theme for the default ID', () => {
    const theme = getDeckTheme('classic');
    expect(theme.id).toBe('classic');
    expect(theme.cardBackground).toBe('#FFFFFF');
  });

  it('returns the royal theme when requested', () => {
    const theme = getDeckTheme('royal');
    expect(theme.id).toBe('royal');
    expect(theme.cardBackground).toBe('#2D2D44');
  });

  it('returns the minimal theme when requested', () => {
    const theme = getDeckTheme('minimal');
    expect(theme.id).toBe('minimal');
  });

  it('returns the orthodox theme when requested', () => {
    const theme = getDeckTheme('orthodox');
    expect(theme.id).toBe('orthodox');
    expect(theme.cardBorder).toBe('#3A8A3A');
  });

  it('falls back to classic for an unknown deck ID', () => {
    const theme = getDeckTheme('nonexistent');
    expect(theme.id).toBe('classic');
  });

  it('falls back to classic when called with no argument', () => {
    const theme = getDeckTheme(undefined);
    expect(theme.id).toBe('classic');
  });

  it('each theme has red and black rank colours', () => {
    for (const theme of Object.values(DECK_THEMES)) {
      expect(theme.rankColor).toHaveProperty('red');
      expect(theme.rankColor).toHaveProperty('black');
    }
  });
});

// ── DEFAULT_DECK_ID ───────────────────────────────────────────────────────────

describe('DEFAULT_DECK_ID', () => {
  it('is classic', () => {
    expect(DEFAULT_DECK_ID).toBe('classic');
  });
});

// ── DECK_CONFIGS ──────────────────────────────────────────────────────────────

describe('DECK_CONFIGS', () => {
  it('contains all four registered decks', () => {
    const ids = DECK_CONFIGS.map(d => d.id);
    expect(ids).toContain('classic');
    expect(ids).toContain('royal');
    expect(ids).toContain('minimal');
    expect(ids).toContain('orthodox');
  });

  it('every config has id, name, emoji, and description', () => {
    for (const deck of DECK_CONFIGS) {
      expect(deck.id).toBeTruthy();
      expect(deck.name).toBeTruthy();
      expect(deck.emoji).toBeTruthy();
      expect(deck.description).toBeTruthy();
    }
  });
});

// ── getCardImage ──────────────────────────────────────────────────────────────

describe('getCardImage', () => {
  it('returns an image for a valid deck and card', () => {
    expect(getCardImage('classic', 'J_spades')).toBe('classic-J_spades');
  });

  it('returns images for all game ranks in all suits and all decks', () => {
    const decks = ['classic', 'royal', 'minimal', 'orthodox'];
    for (const deckId of decks) {
      for (const suit of SUITS) {
        for (const rank of RANKS) {
          const img = getCardImage(deckId, `${rank}_${suit}`);
          expect(img).toBeTruthy();
        }
      }
    }
  });

  it('strips the _2 suffix for duplicate cards in two-deck games', () => {
    expect(getCardImage('classic', 'J_spades_2')).toBe('classic-J_spades');
    expect(getCardImage('classic', '9_hearts_2')).toBe('classic-9_hearts');
    expect(getCardImage('classic', 'A_clubs_2')).toBe('classic-A_clubs');
  });

  it('returns null for an unknown deck ID', () => {
    expect(getCardImage('nonexistent', 'J_spades')).toBeNull();
  });

  it('returns null for an unknown card ID within a valid deck', () => {
    expect(getCardImage('classic', 'invalid_card')).toBeNull();
  });

  it('uses classic when deckId is undefined', () => {
    expect(getCardImage(undefined, 'K_hearts')).toBe('classic-K_hearts');
  });
});

// ── getCardBackImage ──────────────────────────────────────────────────────────

describe('getCardBackImage', () => {
  it('returns the back image for each deck', () => {
    expect(getCardBackImage('classic')).toBe('classic-back');
    expect(getCardBackImage('royal')).toBe('royal-back');
    expect(getCardBackImage('minimal')).toBe('minimal-back');
    expect(getCardBackImage('orthodox')).toBe('orthodox-back');
  });

  it('uses classic when deckId is undefined', () => {
    expect(getCardBackImage(undefined)).toBe('classic-back');
  });

  it('returns null for an unknown deck ID', () => {
    expect(getCardBackImage('nonexistent')).toBeNull();
  });
});
