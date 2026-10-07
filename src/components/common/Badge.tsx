// ============================================
// GymTrack Pro - Reusable Badge Component
// ============================================
import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { colors, borderRadius, fontSize, fontWeight, spacing } from '../../theme';

export type BadgeVariant =
  | 'active'
  | 'expired'
  | 'expiring_soon'
  | 'frozen'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

const variantStyles: Record<BadgeVariant, { bg: string; text: string; border: string }> = {
  active: {
    bg: colors.success + '20',
    text: colors.successLight,
    border: colors.success + '40',
  },
  success: {
    bg: colors.success + '20',
    text: colors.successLight,
    border: colors.success + '40',
  },
  expiring_soon: {
    bg: colors.warning + '20',
    text: colors.warning,
    border: colors.warning + '40',
  },
  warning: {
    bg: colors.warning + '20',
    text: colors.warning,
    border: colors.warning + '40',
  },
  expired: {
    bg: colors.danger + '20',
    text: colors.dangerLight,
    border: colors.danger + '40',
  },
  danger: {
    bg: colors.danger + '20',
    text: colors.dangerLight,
    border: colors.danger + '40',
  },
  frozen: {
    bg: colors.accent + '20',
    text: colors.accentLight,
    border: colors.accent + '40',
  },
  info: {
    bg: colors.accent + '20',
    text: colors.accentLight,
    border: colors.accent + '40',
  },
  neutral: {
    bg: colors.surfaceElevated,
    text: colors.textSecondary,
    border: colors.border,
  },
};

export default function Badge({
  label,
  variant = 'neutral',
  size = 'md',
  style,
  textStyle,
  icon,
}: BadgeProps) {
  const conf = variantStyles[variant] || variantStyles.neutral;

  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: conf.bg,
          borderColor: conf.border,
          paddingVertical: isSmall ? 2 : spacing.xs,
          paddingHorizontal: isSmall ? spacing.xs + 2 : spacing.sm + 2,
        },
        style,
      ]}
    >
      {icon && <View style={styles.iconContainer}>{icon}</View>}
      <Text
        style={[
          styles.text,
          {
            color: conf.text,
            fontSize: isSmall ? fontSize.xs - 1 : fontSize.xs,
          },
          textStyle,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: borderRadius.round,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: 4,
  },
  text: {
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
