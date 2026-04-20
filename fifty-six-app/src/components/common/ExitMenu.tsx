import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';

export interface ExitMenuProps {
  visible: boolean;
  onClose: () => void;
  onExitRound?: () => Promise<void> | void;      // Leave current round, back to waiting room
  onExitGame?: () => Promise<void> | void;       // Leave game entirely
  onLogout: () => Promise<void> | void;          // Logout from app
  canExitRound?: boolean;        // Show exit round option
  canExitGame?: boolean;         // Show exit game option
  isLoading?: boolean;           // Show loading indicator
}

/**
 * Exit Menu Component
 * Provides options to:
 * - Exit the current round
 * - Exit the game
 * - Logout from the app
 */
export function ExitMenu({
  visible,
  onClose,
  onExitRound,
  onExitGame,
  onLogout,
  canExitRound = true,
  canExitGame = true,
  isLoading = false,
}: ExitMenuProps) {
  const [confirming, setConfirming] = useState<'round' | 'game' | 'logout' | null>(null);

  const handleExitRound = () => {
    console.log('🎯 Menu: Exit Round tapped, showing confirmation...');
    setConfirming('round');
    Alert.alert('Exit Round?', 'You will leave this round and return to the waiting room.', [
      { text: 'Cancel', onPress: () => {
        console.log('🎯 Menu: Exit Round cancelled');
        setConfirming(null);
      }},
      {
        text: 'Exit Round',
        onPress: async () => {
          console.log('🎯 Menu: Exit Round confirmed, calling handler...');
          setConfirming(null);
          try {
            const result = onExitRound?.();
            if (result && typeof result.then === 'function') {
              console.log('🎯 Menu: Awaiting async handler...');
              await result;
              console.log('🎯 Menu: Handler completed');
            } else {
              console.log('🎯 Menu: Handler is sync');
            }
          } catch (error) {
            console.error('🎯 Menu: Handler error:', error);
            Alert.alert('Error', 'An error occurred: ' + (error instanceof Error ? error.message : String(error)));
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleExitGame = () => {
    console.log('🎯 Menu: Exit Game tapped, showing confirmation...');
    setConfirming('game');
    Alert.alert('Exit Game?', 'You will leave this game and return to the home screen.', [
      { text: 'Cancel', onPress: () => {
        console.log('🎯 Menu: Exit Game cancelled');
        setConfirming(null);
      }},
      {
        text: 'Exit Game',
        onPress: async () => {
          console.log('🎯 Menu: Exit Game confirmed, calling handler...');
          setConfirming(null);
          try {
            const result = onExitGame?.();
            if (result && typeof result.then === 'function') {
              console.log('🎯 Menu: Awaiting async handler...');
              await result;
              console.log('🎯 Menu: Handler completed');
            } else {
              console.log('🎯 Menu: Handler is sync');
            }
          } catch (error) {
            console.error('🎯 Menu: Handler error:', error);
            Alert.alert('Error', 'An error occurred: ' + (error instanceof Error ? error.message : String(error)));
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const handleLogout = () => {
    console.log('🎯 Menu: Logout tapped, showing confirmation...');
    setConfirming('logout');
    Alert.alert('Logout?', 'You will be logged out from the app.', [
      { text: 'Cancel', onPress: () => {
        console.log('🎯 Menu: Logout cancelled');
        setConfirming(null);
      }},
      {
        text: 'Logout',
        onPress: async () => {
          console.log('🎯 Menu: Logout confirmed, calling handler...');
          setConfirming(null);
          try {
            const result = onLogout();
            if (result && typeof result.then === 'function') {
              console.log('🎯 Menu: Awaiting async handler...');
              await result;
              console.log('🎯 Menu: Handler completed');
            } else {
              console.log('🎯 Menu: Handler is sync');
            }
          } catch (error) {
            console.error('🎯 Menu: Handler error:', error);
            Alert.alert('Error', 'An error occurred: ' + (error instanceof Error ? error.message : String(error)));
          }
        },
        style: 'destructive',
      },
    ]);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.menuContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Menu</Text>
            <TouchableOpacity onPress={onClose} disabled={isLoading}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Loading State */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.loadingText}>Processing...</Text>
            </View>
          )}

          {/* Menu Options */}
          {!isLoading && (
            <View style={styles.optionsContainer}>
              {/* Exit Round Option */}
              {canExitRound && onExitRound && (
                <TouchableOpacity
                  style={[styles.option, styles.optionWarning]}
                  onPress={handleExitRound}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionIcon}>↩️</Text>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Exit Round</Text>
                    <Text style={styles.optionDescription}>Return to waiting room</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Exit Game Option */}
              {canExitGame && onExitGame && (
                <TouchableOpacity
                  style={[styles.option, styles.optionDanger]}
                  onPress={handleExitGame}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionIcon}>🚪</Text>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Exit Game</Text>
                    <Text style={styles.optionDescription}>Return to home screen</Text>
                  </View>
                </TouchableOpacity>
              )}

              {/* Logout Option */}
              <TouchableOpacity
                style={[styles.option, styles.optionLogout]}
                onPress={handleLogout}
                activeOpacity={0.7}
              >
                <Text style={styles.optionIcon}>🚪</Text>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Logout</Text>
                  <Text style={styles.optionDescription}>Exit the app</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Close Button */}
          {!isLoading && (
            <TouchableOpacity style={styles.closeButtonFull} onPress={onClose}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.large,
  },
  menuContainer: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.large,
    width: '100%',
    maxWidth: 400,
    paddingTop: Spacing.large,
    paddingBottom: Spacing.large,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.large,
    marginBottom: Spacing.large,
  },
  title: {
    fontSize: FontSize.large,
    fontWeight: FontWeight.bold,
    color: Colors.text,
  },
  closeButton: {
    fontSize: FontSize.xlarge,
    color: Colors.textSecondary,
  },
  loadingContainer: {
    paddingVertical: Spacing.xlarge,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.medium,
    fontSize: FontSize.medium,
    color: Colors.textSecondary,
  },
  optionsContainer: {
    paddingHorizontal: Spacing.large,
    marginBottom: Spacing.large,
    gap: Spacing.medium,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.medium,
    borderRadius: Radius.medium,
    marginBottom: Spacing.small,
  },
  optionWarning: {
    backgroundColor: 'rgba(255, 152, 0, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  optionDanger: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  optionLogout: {
    backgroundColor: 'rgba(156, 39, 176, 0.1)',
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  optionIcon: {
    fontSize: FontSize.xlarge,
    marginRight: Spacing.medium,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FontSize.medium,
    fontWeight: FontWeight.semibold,
    color: Colors.text,
    marginBottom: Spacing.xsmall,
  },
  optionDescription: {
    fontSize: FontSize.small,
    color: Colors.textSecondary,
  },
  closeButtonFull: {
    marginHorizontal: Spacing.large,
    paddingVertical: Spacing.medium,
    backgroundColor: Colors.textSecondary,
    borderRadius: Radius.medium,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: FontSize.medium,
    fontWeight: FontWeight.semibold,
    color: Colors.surface,
  },
});
