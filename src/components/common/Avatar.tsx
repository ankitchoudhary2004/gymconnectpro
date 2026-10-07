// ============================================
// GymTrack Pro - Reusable Avatar Component
// ============================================
import React from 'react';
import { View, Text, Image, StyleSheet, StyleProp, ViewStyle, ImageStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, borderRadius, fontSize, fontWeight } from '../../theme';

interface AvatarProps {
  name?: string;
  photoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  style?: StyleProp<ViewStyle>;
}

const sizeConfig = {
  sm: { dimension: 32, font: fontSize.xs, radius: borderRadius.sm },
  md: { dimension: 44, font: fontSize.sm, radius: borderRadius.md },
  lg: { dimension: 56, font: fontSize.lg, radius: borderRadius.lg },
  xl: { dimension: 80, font: fontSize.xxl, radius: borderRadius.xl },
};

export default function Avatar({ name, photoUrl, size = 'md', style }: AvatarProps) {
  const cfg = sizeConfig[size];

  const getInitials = (n?: string) => {
    if (!n) return '?';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.substring(0, 2).toUpperCase();
  };

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={[
          styles.image,
          {
            width: cfg.dimension,
            height: cfg.dimension,
            borderRadius: cfg.radius,
          },
          style as StyleProp<ImageStyle>,
        ]}
      />
    );
  }

  return (
    <LinearGradient
      colors={['#6C5CE7', '#A29BFE']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.fallback,
        {
          width: cfg.dimension,
          height: cfg.dimension,
          borderRadius: cfg.radius,
        },
        style,
      ]}
    >
      <Text style={[styles.initials, { fontSize: cfg.font }]}>
        {getInitials(name)}
      </Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.surfaceLight,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.text,
    fontWeight: fontWeight.bold,
  },
});
