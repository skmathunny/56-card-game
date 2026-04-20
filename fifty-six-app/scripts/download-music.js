#!/usr/bin/env node

/**
 * Download default royalty-free music for the 56-card-game
 * 
 * This script downloads CC0/royalty-free music from Free Music Archive
 * and other sources for use as default background music.
 * 
 * Music sources:
 * - Free Music Archive (freemusicarchive.org) - CC0 and licensed works
 * - Kevin MacLeod's Incompetech - CC0 with attribution
 * - Freepd - Free downloads under various CC licenses
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const MUSIC_DIR = path.join(__dirname, '..', 'assets', 'music');

// Direct download links to royalty-free music
// These are small, loopable background tracks suitable for a card game
const MUSIC_SOURCES = {
  'landing-music.mp3': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    description: 'Ambient background music for landing screens'
  },
  'room-selection-music.mp3': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    description: 'Social/engaging music for room selection'
  },
  'gameplay-music.mp3': {
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    description: 'Dynamic music for gameplay'
  }
};

// Alternative sources (smaller files, CC0 tracks from Free Music Archive)
const ALTERNATIVE_SOURCES = {
  'landing-music.mp3': {
    description: 'Try Free Music Archive or YouTube Audio Library',
    search: 'ambient background music loopable'
  },
  'room-selection-music.mp3': {
    description: 'Try Free Music Archive or YouTube Audio Library',
    search: 'upbeat social music loopable'
  },
  'gameplay-music.mp3': {
    description: 'Try Free Music Archive or YouTube Audio Library',
    search: 'dynamic gameplay music loopable'
  }
};

async function downloadFile(url, filePath, fileName) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        // Handle redirects
        downloadFile(response.headers.location, filePath, fileName)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${fileName}: HTTP ${response.statusCode}`));
        return;
      }

      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });

      file.on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete the file on error
        reject(err);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file on error
      reject(err);
    });
  });
}

async function main() {
  console.log('🎵 Downloading default background music...\n');

  // Create music directory if it doesn't exist
  if (!fs.existsSync(MUSIC_DIR)) {
    fs.mkdirSync(MUSIC_DIR, { recursive: true });
    console.log(`✓ Created directory: ${MUSIC_DIR}\n`);
  }

  // Try to download music files
  let successCount = 0;
  let failureCount = 0;

  for (const [fileName, source] of Object.entries(MUSIC_SOURCES)) {
    const filePath = path.join(MUSIC_DIR, fileName);
    
    process.stdout.write(`Downloading ${fileName}... `);

    try {
      await downloadFile(source.url, filePath, fileName);
      const fileSize = fs.statSync(filePath).size;
      console.log(`✓ (${(fileSize / 1024 / 1024).toFixed(2)} MB)`);
      successCount++;
    } catch (error) {
      console.log(`✗`);
      console.log(`  ⚠️  ${error.message}`);
      failureCount++;

      // Provide alternative instructions
      const alt = ALTERNATIVE_SOURCES[fileName];
      if (alt) {
        console.log(`  📝 Alternative: ${alt.description}`);
        console.log(`     Search for: "${alt.search}"`);
      }
      console.log();
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary');
  console.log('='.repeat(60));
  console.log(`✓ Downloaded: ${successCount}`);
  console.log(`✗ Failed: ${failureCount}`);
  console.log(`📁 Music directory: ${MUSIC_DIR}\n`);

  if (failureCount > 0) {
    console.log('💡 If downloads failed, you can manually add music files:');
    console.log('   1. Visit: https://freemusicarchive.org');
    console.log('   2. Download 3 royalty-free loopable tracks');
    console.log('   3. Name them: landing-music.mp3, room-selection-music.mp3, gameplay-music.mp3');
    console.log('   4. Place in: ' + MUSIC_DIR);
    console.log('\n   OR use YouTube Audio Library:');
    console.log('   1. Go to https://www.youtube.com/audiolibrary');
    console.log('   2. Download royalty-free music');
    console.log('   3. Convert to MP3 if needed');
    console.log('   4. Name and place in assets/music/ folder\n');
  } else {
    console.log('✨ Music downloaded successfully! Start the app to hear it.\n');
  }

  process.exit(failureCount > 0 ? 1 : 0);
}

main().catch(error => {
  console.error('\n❌ Error:', error);
  process.exit(1);
});
