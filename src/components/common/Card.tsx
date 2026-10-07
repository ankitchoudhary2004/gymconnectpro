// ============================================
// GymTrack Pro - Reusable Card Component
// ============================================
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, fontSize, fontWeight, spacing, shadows } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  gradient?: boolean;
  gradientColors?: readonly [string, string, ...string[]];
}

export function Card({ children, onPress, style, gradient = false, gradientColors }: CardProps) {
  const content = gradient ? (
    <LinearGradient
      colors={gradientColors || (colors.gradientCard as [string, string])}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, style]}
    >
      {children}
    </LinearGradient>
  ) : (
    <View style={[styles.card, style]}>{children}</View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

// Stat card with icon, value, and label
interface StatCardProps {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  color?: string;
  onPress?: () => void;
  style?: ViewStyle;
}

export function StatCard({ icon, value, label, color = colors.primary, onPress, style }: StatCardProps) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.statCard, style]}
      {...(onPress ? { onPress, activeOpacity: 0.85 } : {})}
    >
      <View style={[styles.statIconContainer, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Wrapper>
  );
}

// Section header
interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction}>
          <Text style={styles.sectionAction}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Alert banner
interface AlertBannerProps {
  type: 'success' | 'warning' | 'danger' | 'info';
  message: string;
  icon?: React.ReactNode;
  onDismiss?: () => void;
}

export function AlertBanner({ type, message, icon, onDismiss }: AlertBannerProps) {
  const alertColors = {
    success: { bg: colors.success + '15', border: colors.success, text: colors.successLight },
    warning: { bg: colors.warning + '15', border: colors.warning, text: colors.warning },
    danger: { bg: colors.danger + '15', border: colors.danger, text: colors.dangerLight },
    info: { bg: colors.accent + '15', border: colors.accent, text: colors.accentLight },
  };

  const c = alertColors[type];

  return (
    <View style={[styles.alertBanner, { backgroundColor: c.bg, borderLeftColor: c.border }]}>
      {icon && <View style={styles.alertIcon}>{icon}</View>}
      <Text style={[styles.alertText, { color: c.text }]}>{message}</Text>
      {onDismiss && (
        <TouchableOpacity onPress={onDismiss} style={styles.alertDismiss}>
          <Text style={{ color: c.text, fontSize: fontSize.lg }}>×</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    flex: 1,
    ...shadows.sm,
  },
  statIconContainer: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  statValue: {
    fontSize: fontSize.xxl,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    fontWeight: fontWeight.medium,
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  sectionAction: {
    fontSize: fontSize.sm,
    color: colors.primaryLight,
    fontWeight: fontWeight.medium,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderLeftWidth: 4,
    marginBottom: spacing.md,
  },
  alertIcon: {
    marginRight: spacing.sm,
  },
  alertText: {
    flex: 1,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  alertDismiss: {
    marginLeft: spacing.sm,
    padding: spacing.xs,
  },
});
