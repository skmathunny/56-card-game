import React from 'react';
import {
  Modal as RNModal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, Spacing, Radius, FontSize, FontWeight } from '../../constants/theme';

interface ModalProps {
  visible: boolean;
  title?: string;
  onClose?: () => void;
  children: React.ReactNode;
}

export function Modal({ visible, title, onClose, children }: ModalProps) {
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.sheet}>
          {(title || onClose) && (
            <View style={styles.header}>
              {title && <Text style={styles.title}>{title}</Text>}
              {onClose && (
                <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.close}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {children}
        </View>
      </KeyboardAvoidingView>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: Colors.bgOverlay,
    justifyContent:  'center',
    alignItems:      'center',
    padding:         Spacing.lg,
  },
  sheet: {
    width:           '100%',
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    padding:         Spacing.lg,
  },
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    marginBottom:   Spacing.md,
  },
  title: {
    fontSize:   FontSize.lg,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },
  close: {
    fontSize: FontSize.md,
    color:    Colors.textSecondary,
  },
});
