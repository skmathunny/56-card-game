import React from 'react';
import { Text, TextStyle } from 'react-native';
import { Colors } from '../../constants/theme';

type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs';

const SYMBOLS: Record<Suit, string> = {
  spades:   '♠',
  hearts:   '♥',
  diamonds: '♦',
  clubs:    '♣',
};

interface SuitIconProps {
  suit: Suit;
  size?: number;
  style?: TextStyle;
}

export function SuitIcon({ suit, size = 16, style }: SuitIconProps) {
  const isRed = suit === 'hearts' || suit === 'diamonds';
  return (
    <Text style={[{ fontSize: size, color: isRed ? Colors.red : Colors.black }, style]}>
      {SYMBOLS[suit]}
    </Text>
  );
}
