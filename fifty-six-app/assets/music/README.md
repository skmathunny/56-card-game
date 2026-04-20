# Background Music Setup

This folder contains the background music files for the 56-card game application.

## Music Tracks

The app supports three different background music tracks for different sections:

### 1. Landing Music (`landing-music.mp3`)
- **Plays on**: Splash screen, Login, Profile setup, Home screen, Profile screen
- **Vibe**: Welcoming, atmospheric
- **Recommended**: Soft, elegant background music (120-140 BPM)

### 2. Room Selection Music (`room-selection-music.mp3`)
- **Plays on**: Create room, Join room, Waiting room screens
- **Vibe**: Engaging, social
- **Recommended**: Upbeat, social background music (100-130 BPM)

### 3. Gameplay Music (`gameplay-music.mp3`)
- **Plays on**: Deal and bid, Play, Round summary, End game screens
- **Vibe**: Focused, competitive
- **Recommended**: Dynamic, engaging gameplay music (120-160 BPM)

## How to Add Music

1. **Obtain or Create Audio Files**
   - Use royalty-free music from sites like:
     - [Free Music Archive](https://freemusicarchive.org/)
     - [Incompetech](https://incompetech.com/)
     - [Epidemic Sound](https://www.epidemicsound.com/)
     - [YouTube Audio Library](https://www.youtube.com/audiolibrary)

2. **Convert to MP3 Format** (if needed)
   - Use tools like [FFmpeg](https://ffmpeg.org/) or online converters
   - Ensure files are in MP3 format for best compatibility

3. **Optimize Audio File Size**
   - Recommended: 128-192 kbps bitrate
   - Duration: 1-3 minutes (loops automatically)
   - Example FFmpeg command:
     ```bash
     ffmpeg -i input.wav -b:a 192k output.mp3
     ```

4. **Place Files in This Directory**
   - `landing-music.mp3` - for landing screens
   - `room-selection-music.mp3` - for room selection screens
   - `gameplay-music.mp3` - for gameplay screens

5. **Restart the App**
   - The app will automatically detect and load the music files
   - You'll see logs confirming which tracks were loaded

## Features

✅ **Automatic Track Switching** - Music changes as you navigate between screens
✅ **Smooth Fade Transitions** - Crossfade effect between tracks (300ms)
✅ **Loop Support** - All tracks automatically loop
✅ **Volume Control** - User can adjust master volume in settings
✅ **Music Toggle** - Users can enable/disable background music
✅ **Background Playback** - Music continues playing when app is backgrounded

## Volume Control

Users can control music volume in the app settings:
- Toggle music on/off
- Adjust master volume (0-100%)

## Troubleshooting

### "Could not load X music - file not found"
- Ensure MP3 file is placed in the correct folder
- Check filename matches exactly (case-sensitive on some systems)
- Verify file is in valid MP3 format

### Music cuts out or is distorted
- Reduce bitrate to 128 kbps
- Check for corrupted audio file
- Try re-encoding the file

### Music doesn't loop properly
- Verify file has no silence at the end
- Try using an audio editor to ensure seamless looping
- Check file duration is not too long

## Free Music Resources

Some recommended royalty-free music packs for card games:
- **Ambient/Background**: "Chill Vibes", "Lo-Fi Study Beats"
- **Social**: "Upbeat Piano", "Casual Gaming"
- **Gameplay**: "Action Background", "Card Game Music"

## License Note

Make sure any music you use is properly licensed for your use case:
- ✅ Creative Commons (with proper attribution)
- ✅ Royalty-free licenses
- ✅ Purchased commercial licenses
- ❌ Copyrighted material without permission
