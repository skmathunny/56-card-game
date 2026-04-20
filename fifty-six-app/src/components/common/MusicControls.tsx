import React from 'react';
import { View, Text, Switch, Slider, StyleSheet } from 'react-native';
import { useMusicStore } from '../store/musicSlice';

interface MusicControlsProps {
  containerStyle?: any;
}

/**
 * Music Controls Component
 * Allows users to toggle music on/off and adjust volume
 * Can be added to any settings/profile screen
 */
export function MusicControls({ containerStyle }: MusicControlsProps) {
  const { musicEnabled, masterVolume, setMusicEnabled, setMasterVolume } = useMusicStore();

  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.title}>🎵 Background Music</Text>

      {/* Music Toggle */}
      <View style={styles.controlRow}>
        <Text style={styles.label}>Enable Music</Text>
        <Switch
          value={musicEnabled}
          onValueChange={setMusicEnabled}
          trackColor={{ false: '#767577', true: '#81c784' }}
          thumbColor={musicEnabled ? '#4caf50' : '#f4f3f4'}
        />
      </View>

      {/* Volume Slider */}
      {musicEnabled && (
        <View style={styles.volumeSection}>
          <Text style={styles.label}>Volume: {Math.round(masterVolume * 100)}%</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            step={0.05}
            value={masterVolume}
            onValueChange={setMasterVolume}
            minimumTrackTintColor="#4caf50"
            maximumTrackTintColor="#ccc"
            thumbTintColor="#4caf50"
          />
        </View>
      )}

      {/* Info Text */}
      <Text style={styles.infoText}>
        {musicEnabled
          ? 'Music plays in landing, room selection, and gameplay sections'
          : 'Background music is disabled'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  volumeSection: {
    marginTop: 8,
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 8,
  },
});
