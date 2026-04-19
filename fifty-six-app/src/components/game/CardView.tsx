import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '../../constants/cards';
import { SUIT_SYMBOLS } from '../../constants/cards';
import { Colors, Radius, FontSize, FontWeight, Spacing } from '../../constants/theme';
import { useLobbyStore } from '../../store/lobbySlice';
import { getDeckTheme, getCardImage, getCardBackImage } from '../../decks/deckRegistry';

interface CardViewProps {
  card: Card;
  selected?: boolean;
  legal?: boolean;
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
  faceDown?: boolean;
  width?: number;
  height?: number;
}

const SIZES = {
  sm: { width: 36, height: 52 },
  md: { width: 52, height: 76 },
  lg: { width: 64, height: 92 },
};

export function CardView({ card, selected, legal = true, onPress, size = 'md', faceDown, width, height }: CardViewProps) {
  const deckId = useLobbyStore(s => s.settings?.deckId);
  const theme  = getDeckTheme(deckId);
  const dims   = (width && height) ? { width, height } : SIZES[size];
  const isCustom = !!(width && height);
  const rankFontSize = isCustom ? Math.round(dims.height * 0.15) : FontSize.sm;
  const suitFontSize = isCustom ? Math.round(dims.height * 0.22) : FontSize.lg;

  const [imageFailed, setImageFailed] = useState(false);

  if (faceDown) {
    const backImage = getCardBackImage(deckId);
    if (backImage && !imageFailed) {
      return (
        <Image
          source={backImage}
          style={[styles.card, dims]}
          onError={() => setImageFailed(true)}
        />
      );
    }
    return (
      <View style={[styles.card, dims, { backgroundColor: theme.cardBack, borderColor: theme.cardBack }]} />
    );
  }

  const cardImage = getCardImage(deckId, card.id);
  if (cardImage && !imageFailed) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={!onPress}
        activeOpacity={0.85}
        style={[
          styles.imageCard,
          dims,
          selected && styles.cardSelected,
          !legal && styles.cardIllegal,
        ]}
      >
        <Image
          source={cardImage}
          style={[styles.cardImage, dims]}
          onError={() => setImageFailed(true)}
          resizeMode="cover"
        />
      </TouchableOpacity>
    );
  }

  // Text fallback
  const isRed    = card.suit === 'hearts' || card.suit === 'diamonds';
  const textColor = isRed ? theme.rankColor.red : theme.rankColor.black;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        dims,
        { backgroundColor: theme.cardBackground, borderColor: theme.cardBorder },
        selected && styles.cardSelected,
        !legal && styles.cardIllegal,
      ]}
    >
      <Text style={[styles.rank, { color: textColor, fontSize: rankFontSize }, !legal && styles.dimText]}>
        {card.rank}
      </Text>
      <Text style={[styles.suitCenter, { color: textColor, fontSize: suitFontSize }, !legal && styles.dimText]}>
        {SUIT_SYMBOLS[card.suit]}
      </Text>
      <Text style={[styles.rankBottom, { color: textColor, fontSize: rankFontSize }, !legal && styles.dimText]}>
        {card.rank}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius:    Radius.md,
    borderWidth:     1,
    padding:         Spacing.xs,
    justifyContent:  'space-between',
    alignItems:      'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.25,
    shadowRadius:    4,
    elevation:       4,
  },
  imageCard: {
    borderRadius:  Radius.md,
    overflow:      'hidden',
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius:  4,
    elevation:     4,
  },
  cardImage: {
    borderRadius: Radius.md,
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
