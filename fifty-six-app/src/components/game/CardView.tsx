import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../../constants/cards';
import { SUIT_SYMBOLS } from '../../constants/cards';
import { Colors, Radius, FontSize, FontWeight, Spacing } from '../../constants/theme';

interface CardViewProps {
  card: Card;
  selected?: boolean;
  legal?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  faceDown?: boolean;
}

const SIZES = {
  sm: { width: 36, height: 52 },
  md: { width: 52, height: 76 },
  lg: { width: 64, height: 92 },
};

export function CardView({ card, selected, legal = true, onPress, size = 'md', faceDown }: CardViewProps) {
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const dims  = SIZES[size];

  if (faceDown) {
    return (
      <View style={[styles.card, dims, styles.cardBack]} />
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        dims,
        selected && styles.cardSelected,
        !legal && styles.cardIllegal,
      ]}
    >
      <Text style={[styles.rank, { color: isRed ? Colors.red : '#1a1a2e' }, !legal && styles.dimText]}>
        {card.rank}
      </Text>
      <Text style={[styles.suitCenter, { color: isRed ? Colors.red : '#1a1a2e' }, !legal && styles.dimText]}>
        {SUIT_SYMBOLS[card.suit]}
      </Text>
      <Text style={[styles.rankBottom, { color: isRed ? Colors.red : '#1a1a2e' }, !legal && styles.dimText]}>
        {card.rank}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardFace,
    borderRadius:    Radius.md,
    borderWidth:     1,
    borderColor:     Colors.cardBorder,
    padding:         Spacing.xs,
    justifyContent:  'space-between',
    alignItems:      'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.25,
    shadowRadius:    4,
    elevation:       4,
  },
  cardBack: {
    backgroundColor: Colors.bgSurface,
    borderColor:     Colors.bgCard,
  },
  cardSelected: {
    borderColor:   Colors.accent,
    borderWidth:   2.5,
    shadowColor:   Colors.accent,
    shadowOpacity: 0.5,
    transform:     [{ translateY: -8 }],
  },
  cardIllegal: {
    opacity: 0.4,
  },
  rank: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.heavy,
    alignSelf:  'flex-start',
  },
  suitCenter: {
    fontSize: FontSize.lg,
  },
  rankBottom: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.heavy,
    alignSelf:  'flex-end',
    transform:  [{ rotate: '180deg' }],
  },
  dimText: { opacity: 0.5 },
});
