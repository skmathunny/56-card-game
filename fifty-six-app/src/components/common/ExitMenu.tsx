import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../constants/theme';

export interface ExitMenuProps {
  visible: boolean;
  onClose: () => void;
  onExitRound?: () => Promise<void> | void;
  onExitGame?: () => Promise<void> | void;
  onLogout: () => Promise<void> | void;
  canExitRound?: boolean;
  canExitGame?: boolean;
  isLoading?: boolean;
}

const CONFIRM_CONFIG = {
  round:  { label: 'Exit Round',  message: 'Leave this round and return to the waiting room?', danger: false },
  game:   { label: 'Exit Game',   message: 'Leave this game and return to the home screen?',   danger: true  },
  logout: { label: 'Logout',      message: 'You will be logged out of the app.',               danger: true  },
} as const;

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

  const handleConfirm = async () => {
    const action = confirming;
    setConfirming(null);
    if (action === 'round')  await onExitRound?.();
    if (action === 'game')   await onExitGame?.();
    if (action === 'logout') await onLogout();
  };

  const handleClose = () => {
    if (!isLoading) {
      setConfirming(null);
      onClose();
    }
  };

  const cfg = confirming ? CONFIRM_CONFIG[confirming] : null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.menuContainer}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{confirming ? 'Confirm' : 'Menu'}</Text>
            {!isLoading && (
              <TouchableOpacity onPress={handleClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Loading */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={Colors.accent} />
              <Text style={styles.loadingText}>Processing…</Text>
            </View>
          )}

          {/* Confirmation panel */}
          {!isLoading && confirming && cfg && (
            <View style={styles.confirmContainer}>
              <Text style={styles.confirmMessage}>{cfg.message}</Text>
              <View style={styles.confirmButtons}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => setConfirming(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmButton, cfg.danger ? styles.confirmDanger : styles.confirmWarning]}
                  onPress={handleConfirm}
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmButtonText}>{cfg.label}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Menu options */}
          {!isLoading && !confirming && (
            <View style={styles.optionsContainer}>
              {canExitRound && onExitRound && (
                <TouchableOpacity
                  style={[styles.option, styles.optionWarning]}
                  onPress={() => setConfirming('round')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionIcon}>↩️</Text>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Exit Round</Text>
                    <Text style={styles.optionDescription}>Return to waiting room</Text>
                  </View>
                </TouchableOpacity>
              )}

              {canExitGame && onExitGame && (
                <TouchableOpacity
                  style={[styles.option, styles.optionDanger]}
                  onPress={() => setConfirming('game')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionIcon}>🚪</Text>
                  <View style={styles.optionContent}>
                    <Text style={styles.optionTitle}>Exit Game</Text>
                    <Text style={styles.optionDescription}>Return to home screen</Text>
                  </View>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.option, styles.optionLogout]}
                onPress={() => setConfirming('logout')}
                activeOpacity={0.7}
              >
                <Text style={styles.optionIcon}>🔓</Text>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>Logout</Text>
                  <Text style={styles.optionDescription}>Exit the app</Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Cancel button (menu list only) */}
          {!isLoading && !confirming && (
            <TouchableOpacity style={styles.closeButtonFull} onPress={handleClose} activeOpacity={0.7}>
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
    backgroundColor: Colors.bgOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  menuContainer: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.xl,
    width: '100%',
    maxWidth: 400,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
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
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
  },
  closeButton: {
    fontSize: FontSize.xl,
    color: Colors.textSecondary,
  },

  loadingContainer: {
    paddingVertical: Spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textSecondary,
  },

  confirmContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.lg,
  },
  confirmMessage: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  backButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  confirmWarning: { backgroundColor: Colors.warning },
  confirmDanger:  { backgroundColor: Colors.error   },
  confirmButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: '#fff',
  },

  optionsContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Radius.md,
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
    borderLeftColor: Colors.accent,
  },
  optionIcon: {
    fontSize: FontSize.xl,
    marginRight: Spacing.md,
  },
  optionContent: { flex: 1 },
  optionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  optionDescription: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },

  closeButtonFull: {
    marginHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.bgCard,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.textSecondary,
  },
});
