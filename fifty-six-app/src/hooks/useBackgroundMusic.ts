import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { useRoute } from '@react-navigation/native';
import { ROUTES } from '../navigation/routes';
import { useMusicStore } from '../store/musicSlice';

// Music track URIs - Default royalty-free music
const MUSIC_TRACKS = {
  landing: require('../../assets/music/landing-music.mp3'),
  roomSelection: require('../../assets/music/room-selection-music.mp3'),
  gameplay: require('../../assets/music/gameplay-music.mp3'),
};

// Screen categorization
const LANDING_SCREENS = [ROUTES.SPLASH, ROUTES.LOGIN, ROUTES.PROFILE_SETUP, ROUTES.HOME, ROUTES.PROFILE];
const ROOM_SELECTION_SCREENS = [ROUTES.CREATE_ROOM, ROUTES.JOIN_ROOM, ROUTES.WAITING_ROOM];
const GAMEPLAY_SCREENS = [ROUTES.DEAL_AND_BID, ROUTES.PLAY, ROUTES.ROUND_SUMMARY, ROUTES.END_GAME];

type MusicSection = 'landing' | 'roomSelection' | 'gameplay' | null;

/**
 * Hook to manage background music across different app sections
 * Automatically switches tracks based on current screen
 * Handles fade in/out transitions
 */
export function useBackgroundMusic() {
  const route = useRoute();
  const soundRefs = useRef<{ [key in MusicSection]: Audio.Sound | null }>({
    landing: null,
    roomSelection: null,
    gameplay: null,
    null: null,
  });
  const currentSectionRef = useRef<MusicSection>(null);
  const isInitializedRef = useRef(false);

  // Determine which section the current screen belongs to
  const getCurrentSection = (): MusicSection => {
    const routeName = route.name as string;
    if (LANDING_SCREENS.includes(routeName)) return 'landing';
    if (ROOM_SELECTION_SCREENS.includes(routeName)) return 'roomSelection';
    if (GAMEPLAY_SCREENS.includes(routeName)) return 'gameplay';
    return null;
  };

  // Initialize audio mode and load sounds
  const initializeAudio = async () => {
    try {
      await Audio.setAudioModeAsync({
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });

      // Preload all sounds
      const sections: MusicSection[] = ['landing', 'roomSelection', 'gameplay'];
      for (const section of sections) {
        if (section) {
          try {
            const sound = new Audio.Sound();
            await sound.loadAsync(MUSIC_TRACKS[section]);
            await sound.setIsLoopingAsync(true);
            soundRefs.current[section] = sound;
            console.log(`✓ Loaded ${section} background music`);
          } catch (error) {
            console.warn(`⚠️  Could not load ${section} music:`, error);
          }
        }
      }
      isInitializedRef.current = true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  };

  // Fade out a sound
  const fadeOut = async (sound: Audio.Sound | null, duration: number = 500) => {
    if (!sound) return;
    try {
      const steps = 10;
      const interval = duration / steps;
      const volumeStep = 1 / steps;
      let currentVolume = 1;

      for (let i = 0; i < steps; i++) {
        await new Promise(resolve => setTimeout(resolve, interval));
        currentVolume -= volumeStep;
        await sound.setVolumeAsync(Math.max(0, currentVolume));
      }
      await sound.pauseAsync();
      await sound.setVolumeAsync(1); // Reset for next playback
    } catch (error) {
      console.warn('Error fading out:', error);
    }
  };

  // Fade in a sound
  const fadeIn = async (sound: Audio.Sound | null, duration: number = 500) => {
    if (!sound) return;
    try {
      const { masterVolume } = useMusicStore.getState();
      await sound.setVolumeAsync(0);
      await sound.playAsync();

      const steps = 10;
      const interval = duration / steps;
      const volumeStep = masterVolume / steps;
      let currentVolume = 0;

      for (let i = 0; i < steps; i++) {
        await new Promise(resolve => setTimeout(resolve, interval));
        currentVolume += volumeStep;
        await sound.setVolumeAsync(Math.min(masterVolume, currentVolume));
      }
    } catch (error) {
      console.warn('Error fading in:', error);
    }
  };

  // Switch to a new music section
  const switchMusic = async (newSection: MusicSection) => {
    const { musicEnabled, masterVolume } = useMusicStore.getState();
    
    if (newSection === currentSectionRef.current) return; // Already playing this section

    // Fade out current music
    if (currentSectionRef.current) {
      const currentSound = soundRefs.current[currentSectionRef.current];
      await fadeOut(currentSound, 300);
    }

    // Fade in new music if enabled and sound exists
    if (newSection && musicEnabled) {
      const newSound = soundRefs.current[newSection];
      if (newSound) {
        await fadeIn(newSound, 300);
      }
    }

    currentSectionRef.current = newSection;
  };

  // Initialize on mount
  useEffect(() => {
    if (!isInitializedRef.current) {
      initializeAudio();
    }
  }, []);

  // Switch music when route changes
  useEffect(() => {
    const newSection = getCurrentSection();
    switchMusic(newSection);
  }, [route.name]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(soundRefs.current).forEach(async (sound) => {
        if (sound) {
          try {
            await sound.unloadAsync();
          } catch (error) {
            console.warn('Error unloading sound:', error);
          }
        }
      });
    };
  }, []);
}
