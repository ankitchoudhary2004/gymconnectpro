// ============================================
// GymTrack Pro - Design Theme
// ============================================

export const colors = {
  // Primary palette
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',
  primaryDark: '#5A4BD1',

  // Accent
  accent: '#00D2FF',
  accentLight: '#74E9FF',

  // Status
  success: '#00B894',
  successLight: '#55EFC4',
  warning: '#FDCB6E',
  warningDark: '#E17055',
  danger: '#FF6B6B',
  dangerLight: '#FF8A8A',

  // Backgrounds
  background: '#0F0F1A',
  surface: '#1A1A2E',
  surfaceLight: '#232342',
  surfaceElevated: '#2A2A4A',

  // Text
  text: '#FFFFFF',
  textSecondary: '#B0B0CC',
  textMuted: '#6C6C8A',
  textInverse: '#0F0F1A',

  // Borders
  border: '#2E2E4E',
  borderLight: '#3E3E5E',

  // Gradients
  gradientPrimary: ['#6C5CE7', '#A29BFE'],
  gradientAccent: ['#00D2FF', '#6C5CE7'],
  gradientSuccess: ['#00B894', '#55EFC4'],
  gradientDanger: ['#FF6B6B', '#E17055'],
  gradientDark: ['#1A1A2E', '#0F0F1A'],
  gradientCard: ['#232342', '#1A1A2E'],

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
  overlayLight: 'rgba(0, 0, 0, 0.3)',

  // QR
  qrBackground: '#FFFFFF',
  qrForeground: '#0F0F1A',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
  full: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 28,
  hero: 36,
};

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  glow: {
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 10,
  },
};

const theme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
};

export default theme;
