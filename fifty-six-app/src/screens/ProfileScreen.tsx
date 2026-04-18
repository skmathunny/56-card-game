import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../constants/theme';
import { ROUTES } from '../navigation/routes';
import { Button } from '../components/common';

type Nav = NativeStackNavigationProp<any>;

export default function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const [name,     setName]     = useState('');
  const [avatar,   setAvatar]   = useState('🦁');
  const [isGuest,  setIsGuest]  = useState(false);

  useEffect(() => {
    (async () => {
      const n = await AsyncStorage.getItem('profile_name');
      const a = await AsyncStorage.getItem('profile_avatar');
      const g = await AsyncStorage.getItem('is_guest');
      if (n) setName(n);
      if (a) setAvatar(a);
      setIsGuest(g === 'true');
    })();
  }, []);

  const handleEditProfile = () => {
    navigation.navigate(ROUTES.PROFILE_SETUP);
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['auth_token', 'is_guest', 'profile_name', 'profile_avatar', 'user_id']);
          navigation.replace(ROUTES.LOGIN);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.body}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarEmoji}>{avatar}</Text>
          </View>
          <Text style={styles.nameText}>{name || 'Player'}</Text>
          {isGuest && (
            <View style={styles.guestBadge}>
              <Text style={styles.guestBadgeText}>Guest</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionRow} onPress={handleEditProfile}>
            <Text style={styles.actionIcon}>✏️</Text>
            <Text style={styles.actionLabel}>Edit Profile</Text>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.signOutSection}>
          <Button label="Sign Out" onPress={handleSignOut} variant="danger" fullWidth />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  header: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
  },
  backBtn:  { width: 40 },
  backIcon: { fontSize: FontSize.xxl, color: Colors.textPrimary },
  title:    { fontSize: FontSize.lg, fontWeight: FontWeight.bold, color: Colors.textPrimary },

  body: {
    flex:    1,
    padding: Spacing.lg,
    gap:     Spacing.xl,
  },

  avatarSection: { alignItems: 'center', gap: Spacing.sm, paddingTop: Spacing.xl },
  avatarCircle: {
    width:           96,
    height:          96,
    borderRadius:    Radius.full,
    backgroundColor: Colors.bgCard,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     2,
    borderColor:     Colors.bgSurface,
  },
  avatarEmoji: { fontSize: 52 },
  nameText: {
    fontSize:   FontSize.xl,
    fontWeight: FontWeight.bold,
    color:      Colors.textPrimary,
  },
  guestBadge: {
    backgroundColor: Colors.bgSurface,
    borderRadius:    Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  guestBadgeText: { fontSize: FontSize.xs, color: Colors.textSecondary },

  actions: {
    backgroundColor: Colors.bgCard,
    borderRadius:    Radius.xl,
    overflow:        'hidden',
  },
  actionRow: {
    flexDirection:  'row',
    alignItems:     'center',
    padding:        Spacing.md,
    gap:            Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.bgSurface,
  },
  actionIcon:  { fontSize: 20, width: 28, textAlign: 'center' },
  actionLabel: { flex: 1, fontSize: FontSize.md, color: Colors.textPrimary },
  actionArrow: { fontSize: FontSize.xl, color: Colors.textMuted },

  signOutSection: { marginTop: 'auto' },
});
