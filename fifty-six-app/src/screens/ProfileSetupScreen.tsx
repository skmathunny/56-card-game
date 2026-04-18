import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import { Button } from '../components/common';

type Nav = NativeStackNavigationProp<any>;

const AVATARS = ['🦁', '🐯', '🦊', '🐺', '🦅', '🦋', '🐉', '🦄'];

export default function ProfileSetupScreen() {
  const navigation = useNavigation<Nav>();
  const [displayName, setDisplayName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    const trimmed = displayName.trim();
    if (trimmed.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }
    if (trimmed.length > 20) {
      setError('Name must be 20 characters or less');
      return;
    }
    setLoading(true);
    await AsyncStorage.setItem('profile_name', trimmed);
    await AsyncStorage.setItem('profile_avatar', selectedAvatar);
    setLoading(false);
    navigation.replace(ROUTES.HOME);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.kav}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <Text style={styles.heading}>Set up your profile</Text>
          <Text style={styles.sub}>This is how other players will see you</Text>

          {/* Avatar picker */}
          <View style={styles.section}>
            <Text style={styles.label}>Pick an avatar</Text>
            <View style={styles.avatarGrid}>
              {AVATARS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => setSelectedAvatar(emoji)}
                  style={[
                    styles.avatarBtn,
                    selectedAvatar === emoji && styles.avatarBtnSelected,
                  ]}
                >
                  <Text style={styles.avatarEmoji}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Name input */}
          <View style={styles.section}>
            <Text style={styles.label}>Display name</Text>
            <TextInput
              style={[styles.input, error ? styles.inputError : null]}
              placeholder="Enter your name"
              placeholderTextColor={Colors.textMuted}
              value={displayName}
              onChangeText={(t) => { setDisplayName(t); setError(''); }}
              maxLength={20}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          <Button
            label="Continue"
            onPress={handleSave}
            loading={loading}
            disabled={displayName.trim().length < 2}
            fullWidth
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.bg },
  kav:    { flex: 1 },
  scroll: {
    flexGrow: 1,
    padding:  Spacing.xl,
    gap:      Spacing.lg,
    justifyContent: 'center',
  },

  heading: {
    fontSize:   FontSize.xxl,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
    textAlign:  'center',
  },
  sub: {
    fontSize:  FontSize.sm,
    color:     Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },

  section: { gap: Spacing.sm },
  label: {
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
    color:      Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  avatarGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.sm,
  },
  avatarBtn: {
    width:          56,
    height:         56,
    borderRadius:   Radius.lg,
    backgroundColor: Colors.bgCard,
    alignItems:     'center',
    justifyContent: 'center',
    borderWidth:    2,
    borderColor:    'transparent',
  },
  avatarBtnSelected: {
    borderColor:     Colors.accent,
    backgroundColor: Colors.bgSurface,
  },
  avatarEmoji: { fontSize: 28 },

  input: {
    backgroundColor:  Colors.bgCard,
    borderRadius:     Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical:  Spacing.sm + 4,
    fontSize:         FontSize.md,
    color:            Colors.textPrimary,
    borderWidth:      1,
    borderColor:      Colors.bgSurface,
  },
  inputError: { borderColor: Colors.error },
  errorText: { fontSize: FontSize.sm, color: Colors.error },
});
