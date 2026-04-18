import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSize, FontWeight, Spacing } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import { SuitIcon } from '../components/common';

type Nav = NativeStackNavigationProp<any>;

export default function SplashScreen() {
  const navigation = useNavigation<Nav>();
  const scale  = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale,   { toValue: 1, useNativeDriver: true, tension: 60, friction: 7 }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(async () => {
      const token = await AsyncStorage.getItem('auth_token');
      navigation.replace(token ? ROUTES.HOME : ROUTES.LOGIN);
    }, 2200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.logoWrap, { transform: [{ scale }], opacity }]}>
        <View style={styles.suits}>
          <SuitIcon suit="spades"   size={28} />
          <SuitIcon suit="hearts"   size={28} />
          <SuitIcon suit="diamonds" size={28} />
          <SuitIcon suit="clubs"    size={28} />
        </View>
        <Text style={styles.title}>56</Text>
        <Text style={styles.subtitle}>Fifty-Six</Text>
      </Animated.View>
      <Text style={styles.tagline}>The classic trick-taking card game</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.bg,
    alignItems:      'center',
    justifyContent:  'center',
  },
  logoWrap: {
    alignItems: 'center',
    gap:        Spacing.sm,
  },
  suits: {
    flexDirection: 'row',
    gap:           Spacing.md,
    marginBottom:  Spacing.sm,
  },
  title: {
    fontSize:      FontSize.hero,
    fontWeight:    FontWeight.heavy,
    color:         Colors.textPrimary,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize:      FontSize.lg,
    fontWeight:    FontWeight.medium,
    color:         Colors.textSecondary,
    letterSpacing: 6,
    textTransform: 'uppercase',
  },
  tagline: {
    fontSize: FontSize.sm,
    color:    Colors.textMuted,
    position: 'absolute',
    bottom:   Spacing.xxl,
  },
});
