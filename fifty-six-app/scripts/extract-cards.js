#!/usr/bin/env node
/**
 * Extracts individual card images from a 13×4 card spritesheet.
 *
 * Spritesheet layout expected:
 *   Columns (0–12): A, 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K
 *   Rows    (0–3):  clubs, diamonds, hearts, spades
 *   Row 4 (optional): anything at col 2 = card back
 *
 * Usage:
 *   Place the spritesheet at scripts/card-spritesheet.png
 *   node scripts/extract-cards.js [deckId]
 *   Default deckId: classic
 *
 * Output: assets/cards/<deckId>/{rank}_{suit}.png  +  back.png
 */

const { Jimp } = require('jimp');
const path = require('path');
const fs   = require('fs');

// Usage: node extract-cards.js [deckId] [rows] [suitOrder]
//   deckId     — output folder name under assets/cards/ (default: classic)
//   rows       — total row count: 4 (suits only) or 5 (suits + back row). Auto-detected if omitted.
//   suitOrder  — comma-separated suit names top-to-bottom (default: clubs,diamonds,hearts,spades)
//                e.g. hearts,diamonds,clubs,spades
const deckId      = process.argv[2] ?? 'classic';
const rowsArg     = process.argv[3] ? parseInt(process.argv[3], 10) : null;
const suitOrderArg = process.argv[4] ? process.argv[4].split(',') : null;
const SPRITESHEET = path.join(__dirname, 'card-spritesheet.png');

if (!fs.existsSync(SPRITESHEET)) {
  console.error(`ERROR: spritesheet not found at ${SPRITESHEET}`);
  console.error('Save the card spritesheet image to that path and re-run.');
  process.exit(1);
}

// Cards used in 56 — maps game rank → spritesheet column index
const RANK_COL = { J: 10, '9': 8, A: 0, '10': 9, K: 12, Q: 11, '7': 6, '8': 7 };
// Suit → row index (derived from suitOrder arg or default)
const DEFAULT_SUIT_ORDER = ['clubs', 'diamonds', 'hearts', 'spades'];
const suitOrder = suitOrderArg ?? DEFAULT_SUIT_ORDER;
const SUIT_ROW = Object.fromEntries(suitOrder.map((s, i) => [s, i]));

const OUT_DIR = path.join(__dirname, '..', 'assets', 'cards', deckId);
fs.mkdirSync(OUT_DIR, { recursive: true });

(async () => {
  const img = await Jimp.read(SPRITESHEET);
  const totalW = img.width;
  const totalH = img.height;

  const COLS = 13;
  const cellW = Math.floor(totalW / COLS);

  // Row count: use explicit arg if provided, otherwise auto-detect.
  // Heuristic: a 5th row exists when totalH is clearly not divisible into 4 equal card-height rows.
  // We check if totalH % 4 leaves a remainder large enough to be a real extra row (> 40% of a card height).
  let TOTAL_ROWS;
  if (rowsArg) {
    TOTAL_ROWS = rowsArg;
  } else {
    const cellHFor4 = Math.floor(totalH / 4);
    const remainder = totalH - 4 * cellHFor4;
    TOTAL_ROWS = remainder > cellHFor4 * 0.4 ? 5 : 4;
  }
  const SUIT_ROWS = 4;
  const hasExtraRow = TOTAL_ROWS === 5;
  const cellH = Math.floor(totalH / TOTAL_ROWS);

  console.log(`Spritesheet: ${totalW}×${totalH}  →  cell: ${cellW}×${cellH}  (${TOTAL_ROWS} rows detected)`);

  let count = 0;

  for (const [suit, row] of Object.entries(SUIT_ROW)) {
    for (const [rank, col] of Object.entries(RANK_COL)) {
      const x = col * cellW;
      const y = row * cellH;
      const cropped = img.clone().crop({ x, y, w: cellW, h: cellH });
      const outPath = path.join(OUT_DIR, `${rank}_${suit}.png`);
      await cropped.write(outPath);
      count++;
      process.stdout.write(`  ✓ ${rank}_${suit}.png\r`);
    }
  }

  // Card back — in the extra 5th row at column 2, or if no extra row, use A_spades
  // as a placeholder (replace manually with a real back image).
  if (hasExtraRow) {
    const backX = 2 * cellW;
    const backY = SUIT_ROWS * cellH;
    const back  = img.clone().crop({ x: backX, y: backY, w: cellW, h: cellH });
    await back.write(path.join(OUT_DIR, 'back.png'));
    console.log('\n  ✓ back.png  (from extra row)');
  } else {
    // No extra row — copy the existing back placeholder or warn
    const existingBack = path.join(OUT_DIR, 'back.png');
    if (!fs.existsSync(existingBack)) {
      console.log('\n  ⚠ No extra row found for back card. Place back.png manually in', OUT_DIR);
    } else {
      console.log('\n  ℹ back.png already exists — skipped (no extra row in spritesheet)');
    }
    count--; // don't count back in total
  }
  count++;

  console.log(`\n✓ Extracted ${count} images → assets/cards/${deckId}/`);
  console.log('Restart the Expo bundler to pick up the new images.');
})().catch(err => {
  console.error('Extraction failed:', err.message);
  process.exit(1);
});
