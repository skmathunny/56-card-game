export const Colors = {
  // Backgrounds
  bg:          '#1A1A2E',
  bgCard:      '#16213E',
  bgSurface:   '#0F3460',
  bgOverlay:   'rgba(0,0,0,0.7)',

  // Accent
  accent:      '#E94560',
  accentDim:   '#B03348',

  // Teams
  teamA:       '#4FC3F7',
  teamB:       '#FFB74D',

  // Suits
  red:         '#EF5350',
  black:       '#E0E0E0',

  // Text
  textPrimary:   '#FFFFFF',
  textSecondary: '#A0AEC0',
  textMuted:     '#4A5568',

  // Status
  success: '#48BB78',
  warning: '#ECC94B',
  error:   '#FC8181',

  // Cards
  cardFace:   '#FAFAFA',
  cardBorder: '#CBD5E0',
} as const;

export const Spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  xxl: 48,
} as const;

export const Radius = {
  sm:   4,
  md:   8,
  lg:   12,
  xl:   20,
  full: 9999,
} as const;

export const FontSize = {
  xs:   11,
  sm:   13,
  md:   15,
  lg:   18,
  xl:   22,
  xxl:  28,
  hero: 40,
} as const;

export const FontWeight = {
  regular: '400' as const,
  medium:  '500' as const,
  bold:    '700' as const,
  heavy:   '900' as const,
};
