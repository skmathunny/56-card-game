import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Colors, Radius, Spacing, FontSize, FontWeight } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export function Button({
  label,
  onPress,
  variant  = 'primary',
  size     = 'md',
  disabled = false,
  loading  = false,
  style,
  textStyle,
  fullWidth = false,
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'ghost' ? Colors.accent : Colors.textPrimary} />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`], textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   Radius.lg,
  },
  fullWidth: { width: '100%' },
  disabled:  { opacity: 0.45 },

  // Variants
  primary:   { backgroundColor: Colors.accent },
  secondary: { backgroundColor: Colors.bgSurface },
  ghost:     { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.accent },
  danger:    { backgroundColor: Colors.error },

  // Sizes
  size_sm: { paddingHorizontal: Spacing.md,  paddingVertical: Spacing.xs  },
  size_md: { paddingHorizontal: Spacing.lg,  paddingVertical: Spacing.sm + 4 },
  size_lg: { paddingHorizontal: Spacing.xl,  paddingVertical: Spacing.md  },

  // Label base
  label: { fontWeight: FontWeight.bold },

  label_primary:   { color: Colors.textPrimary },
  label_secondary: { color: Colors.textPrimary },
  label_ghost:     { color: Colors.accent },
  label_danger:    { color: Colors.textPrimary },

  labelSize_sm: { fontSize: FontSize.sm },
  labelSize_md: { fontSize: FontSize.md },
  labelSize_lg: { fontSize: FontSize.lg },
});
