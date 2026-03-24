import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, AppStackParamList } from '../navigation/types';
import { tokens } from '../theme';
import { Card, Avatar } from '../components/ui';
import { Skeleton } from '../components/form';
import { authStore } from '../store';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import { userProfileApi, type UserProfileResponse } from '../api/modules/profile.api';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Profile'>,
  NativeStackNavigationProp<AppStackParamList>
>;

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const user = authStore((state) => state.user);
  const setUser = authStore((state) => state.setUser);
  const logout = authStore((state) => state.logout);
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const themedStyles = getThemedStyles(colors);
  const menuText = useMemo(
    () => ({
      editProfile: t('profile.edit'),
      settings: t('settings.title'),
      petChat: t('petChat.title'),
      monthlyPlan: t('savingPlan.title'),
      savingTargets: t('savingTargets.title'),
      premiumPlans: t('screen.subscription'),
      logout: t('auth.logout'),
    }),
    [t]
  );

  // Fetch profile from API
  const {
    data: profile,
    isLoading,
    isRefetching,
    refetch,
  } = useQuery<UserProfileResponse>({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const { data } = await userProfileApi.getMe();
      // Sync to auth store
      if (data) {
        setUser({
          ...user,
          accountId: data.accountId || user?.accountId || 0,
          email: data.email,
          fullName: data.fullName,
        });
      }
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Use API data or fallback to auth store
  const userName = profile?.fullName || user?.fullName || user?.email?.split('@')[0] || t('home.userFallbackName');
  const userEmail = profile?.email || user?.email || '';

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <View style={styles.profileHeader}>
            <Skeleton width={80} height={80} borderRadius={40} />
            <Skeleton width={150} height={24} style={{ marginTop: tokens.spacing.sm }} />
            <Skeleton width={200} height={16} style={{ marginTop: tokens.spacing.xs }} />
          </View>
          <Card>
            {[1, 2, 3, 4].map(i => (
              <View key={i} style={[styles.menuItem, themedStyles.menuItem]}>
                <Skeleton width={100} height={18} />
              </View>
            ))}
          </Card>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={styles.content} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        <View style={styles.profileHeader}>
          <Avatar name={userName} size="lg" />
          <Text style={[styles.name, themedStyles.name]}>{userName}</Text>
          <Text style={[styles.email, themedStyles.email]}>{userEmail}</Text>
        </View>

        <Card>
          <Pressable
            style={({ pressed }) => [styles.menuItem, themedStyles.menuItem, pressed && styles.menuItemPressed]}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={[styles.menuText, themedStyles.menuText]}>{menuText.editProfile}</Text>
            <Text style={[styles.menuArrow, themedStyles.menuArrow]}>›</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.menuItem, themedStyles.menuItem, pressed && styles.menuItemPressed]}
            onPress={() => navigation.navigate('Settings')}
          >
            <Text style={[styles.menuText, themedStyles.menuText]}>{menuText.settings}</Text>
            <Text style={[styles.menuArrow, themedStyles.menuArrow]}>›</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.menuItem, themedStyles.menuItem, pressed && styles.menuItemPressed]}
            onPress={() => navigation.navigate('PetChat')}
          >
            <Text style={[styles.menuText, themedStyles.menuText]}>{menuText.petChat}</Text>
            <Text style={[styles.menuArrow, themedStyles.menuArrow]}>›</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.menuItem, themedStyles.menuItem, pressed && styles.menuItemPressed]}
            onPress={() => navigation.navigate('Wallet', { initialTab: 'plan' })}
          >
            <Text style={[styles.menuText, themedStyles.menuText]}>{menuText.monthlyPlan}</Text>
            <Text style={[styles.menuArrow, themedStyles.menuArrow]}>›</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.menuItem, themedStyles.menuItem, pressed && styles.menuItemPressed]}
            onPress={() => navigation.navigate('Wallet', { initialTab: 'targets' })}
          >
            <Text style={[styles.menuText, themedStyles.menuText]}>{menuText.savingTargets}</Text>
            <Text style={[styles.menuArrow, themedStyles.menuArrow]}>›</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.menuItem, themedStyles.menuItem, pressed && styles.menuItemPressed]}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={[styles.menuText, themedStyles.menuText]}>{menuText.premiumPlans}</Text>
            <Text style={[styles.menuArrow, themedStyles.menuArrow]}>›</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.menuItem, styles.logoutItem, pressed && styles.menuItemPressed]}
            onPress={() => logout()}
          >
            <Text style={[styles.menuText, themedStyles.logoutText]}>{menuText.logout}</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    name: {
      color: colors.text,
    },
    email: {
      color: colors.textSecondary,
    },
    menuItem: {
      borderBottomColor: colors.border,
    },
    menuText: {
      color: colors.text,
    },
    menuArrow: {
      color: colors.textMuted,
    },
    logoutText: {
      color: colors.error,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  name: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    marginTop: tokens.spacing.sm,
  },
  email: {
    fontSize: tokens.typography.fontSizes.sm,
    marginTop: tokens.spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemPressed: {
    opacity: 0.7,
  },
  menuText: {
    fontSize: tokens.typography.fontSizes.md,
  },
  menuArrow: {
    fontSize: tokens.typography.fontSizes.lg,
  },
  logoutItem: {
    borderBottomWidth: 0,
  },
});




