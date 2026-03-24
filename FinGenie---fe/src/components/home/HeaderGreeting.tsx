import React from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { tokens } from '../../theme';
import { useThemeStore } from '../../store/themeStore';
import { icons } from '../../constants/assets';

interface HeaderGreetingProps {
  greeting: string;
  userName: string;
  subtitle?: string;
  onPressNotifications?: () => void;
  unreadCount?: number;
}

export function HeaderGreeting({
  greeting,
  userName,
  subtitle = 'Stay on top of your money',
  onPressNotifications,
  unreadCount,
}: HeaderGreetingProps) {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);

  return (
    <View style={styles.container}>
      <View style={styles.textBlock}>
        <View style={styles.subtitleRow}>
          <Text style={[styles.subtitle, themedStyles.subtitle]}>{greeting}</Text>
          <Image source={icons.spark} style={styles.spark} resizeMode="contain" />
        </View>
        <Text style={[styles.userName, themedStyles.userName]}>{userName}</Text>
        <Text style={[styles.tagline, themedStyles.tagline]}>{subtitle}</Text>
      </View>
      <Pressable
        onPress={onPressNotifications}
        style={({ pressed }) => [styles.bellButton, themedStyles.bellButton, pressed && styles.pressed]}
        hitSlop={12}
      >
        <View style={styles.bellBadgeWrapper}>
          <Image source={icons.notificationBell} style={styles.bellIcon} resizeMode="contain" />
          {Boolean(unreadCount) && <View style={[styles.badge, themedStyles.badge]} />}
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.lg,
  },
  textBlock: {
    flex: 1,
    paddingRight: tokens.spacing.md,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
  },
  spark: {
    width: 16,
    height: 16,
  },
  userName: {
    marginTop: 2,
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
  },
  tagline: {
    marginTop: 4,
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
  },
  bellButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: tokens.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...tokens.shadows.sm,
  },
  bellBadgeWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellIcon: {
    width: 22,
    height: 22,
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 13,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: tokens.colors.error,
  },
  pressed: {
    opacity: 0.85,
  },
});

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    subtitle: {
      color: colors.textSecondary,
    },
    userName: {
      color: colors.text,
    },
    tagline: {
      color: colors.textSecondary,
    },
    bellButton: {
      backgroundColor: colors.surface,
    },
    badge: {
      backgroundColor: colors.error,
    },
  });
