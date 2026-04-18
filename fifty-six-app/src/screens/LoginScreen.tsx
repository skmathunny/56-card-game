import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import { Button, SuitIcon } from '../components/common';
import { TransportModeContext } from '../../App';

type Nav = NativeStackNavigationProp<any>;

export default function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { setMode } = useContext(TransportModeContext);

  const handleOAuth = (_provider: 'google' | 'linkedin') => {
    // TODO: implement via Expo AuthSession — server issues JWT on callback
  };

  const handleGuest = async () => {
    await AsyncStorage.setItem('auth_token', 'guest');
    await AsyncStorage.setItem('is_guest', 'true');
    setMode('offline');
    navigation.replace(ROUTES.PROFILE_SETUP);
  };

  const handleOffline = () => {
    setMode('offline');
    navigation.replace(ROUTES.HOME);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.suits}>
            <SuitIcon suit="spades"   size={22} />
            <SuitIcon suit="hearts"   size={22} />
            <SuitIcon suit="diamonds" size={22} />
            <SuitIcon suit="clubs"    size={22} />
          </View>
          <Text style={styles.title}>56</Text>
          <Text style={styles.subtitle}>Sign in to play</Text>
        </View>

        {/* Auth buttons */}
        <View style={styles.authSection}>
          <TouchableOpacity style={[styles.oauthBtn, styles.googleBtn]} onPress={() => handleOAuth('google')}>
            <Text style={styles.oauthIcon}>G</Text>
            <Text style={styles.oauthLabel}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.oauthBtn, styles.linkedinBtn]} onPress={() => handleOAuth('linkedin')}>
            <Text style={styles.oauthIcon}>in</Text>
            <Text style={styles.oauthLabel}>Continue with LinkedIn</Text>
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button label="Play as Guest" onPress={handleGuest} variant="ghost" fullWidth />
        </View>

        {/* Offline mode */}
        <TouchableOpacity onPress={handleOffline} style={styles.offlineLink}>
          <Text style={styles.offlineLinkText}>Play Offline (no account needed)</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: {
    flex:           1,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    gap:            Spacing.xl,
  },

  logoSection: { alignItems: 'center', gap: Spacing.sm },
  suits:       { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xs },
  title: {
    fontSize:      FontSize.hero,
    fontWeight:    FontWeight.heavy,
    color:         Colors.textPrimary,
    letterSpacing: 4,
  },
  subtitle: {
    fontSize:  FontSize.md,
    color:     Colors.textSecondary,
  },

  authSection: { gap: Spacing.md },

  oauthBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    borderRadius:   Radius.lg,
    paddingVertical:   Spacing.sm + 4,
    paddingHorizontal: Spacing.lg,
    gap:            Spacing.md,
  },
  googleBtn:   { backgroundColor: '#FFFFFF' },
  linkedinBtn: { backgroundColor: '#0077B5' },

  oauthIcon: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
    color:      '#333',
    width:      22,
    textAlign:  'center',
  },
  oauthLabel: {
    fontSize:   FontSize.md,
    fontWeight: FontWeight.medium,
    color:      '#333',
  },

  divider: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.textMuted },
  dividerText: { color: Colors.textMuted, fontSize: FontSize.sm },

  offlineLink: { alignItems: 'center' },
  offlineLinkText: {
    fontSize: FontSize.sm,
    color:    Colors.textMuted,
    textDecorationLine: 'underline',
  },
});
