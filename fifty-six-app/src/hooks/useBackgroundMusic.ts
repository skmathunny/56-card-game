import { useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { useNavigation } from '@react-navigation/native';
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
  const navigation = useNavigation();
  const soundRefs = useRef<{ [key in MusicSection]: Audio.Sound | null }>({
    landing: null,
    roomSelection: null,
    gameplay: null,
    null: null,
  });
  const currentSectionRef = useRef<MusicSection>(null);
  const isInitializedRef = useRef(false);
  const currentRouteRef = useRef<string>('');
  const userInteractedRef = useRef(false);
  const pendingSectionRef = useRef<MusicSection>(null);

  // Determine which section a route belongs to
  const getSection = (routeName: string): MusicSection => {
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
      
      try {
        await sound.playAsync();
      } catch (playError: any) {
        // Handle NotAllowedError - user interaction not yet occurred
        if (playError?.name === 'NotAllowedError' || playError?.message?.includes('play() failed')) {
          console.log('⏸️  Deferring music playback until user interaction...');
          return; // Will retry after user interaction
        }
        throw playError;
      }

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

    // If user hasn't interacted yet, save for later
    if (!userInteractedRef.current) {
      pendingSectionRef.current = newSection;
      return;
    }

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

  // Handle first user interaction to trigger deferred music
  const handleUserInteraction = async () => {
    if (userInteractedRef.current) return; // Already interacted
    
    userInteractedRef.current = true;
    console.log('✓ User interaction detected, starting music...');

    // If there's a pending section, start music for it
    if (pendingSectionRef.current) {
      const { musicEnabled } = useMusicStore.getState();
      if (musicEnabled) {
        const sound = soundRefs.current[pendingSectionRef.current];
        if (sound) {
          await fadeIn(sound, 300);
          currentSectionRef.current = pendingSectionRef.current;
        }
      }
      pendingSectionRef.current = null;
    }
  };

  // Initialize on mount and setup navigation listener
  useEffect(() => {
    if (!isInitializedRef.current) {
      initializeAudio();
    }

    // Setup user interaction listeners for browser (handles initial autoplay policy)
    const handleInteraction = () => {
      handleUserInteraction();
      // Remove listeners after first interaction
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };

    document.addEventListener('touchstart', handleInteraction);
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    // Listen for navigation changes
    const unsubscribe = navigation.addListener('state', () => {
      // Get the current route from navigation state
      const state = (navigation as any).getState?.();
      if (state?.routes?.length > 0) {
        const currentRoute = state.routes[state.index];
        const newRouteName = currentRoute?.name;
        
        if (newRouteName && newRouteName !== currentRouteRef.current) {
          currentRouteRef.current = newRouteName;
          const newSection = getSection(newRouteName);
          switchMusic(newSection);
        }
      }
    });

    return () => {
      unsubscribe?.();
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [navigation]);

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
