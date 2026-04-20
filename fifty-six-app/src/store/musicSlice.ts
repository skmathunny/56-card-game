import { create } from 'zustand';

interface MusicSettings {
  musicEnabled: boolean;
  masterVolume: number; // 0-1
  setMusicEnabled: (enabled: boolean) => void;
  setMasterVolume: (volume: number) => void;
}

/**
 * Store for background music settings
 * Users can toggle music on/off and adjust volume
 */
export const useMusicStore = create<MusicSettings>((set) => ({
  musicEnabled: true,
  masterVolume: 0.5,
  setMusicEnabled: (enabled: boolean) => set({ musicEnabled: enabled }),
  setMasterVolume: (volume: number) => set({ masterVolume: Math.max(0, Math.min(1, volume)) }),
}));
