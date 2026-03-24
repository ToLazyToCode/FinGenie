import React from 'react';
import { Pressable, StyleSheet, Text, View, Image } from 'react-native';
import { tokens } from '../../theme';
import { useThemeStore } from '../../store/themeStore';
import { icons, images } from '../../constants/assets';

interface PetStreakCardProps {
  level: number;
  streakDays: number;
  onPress?: () => void;
}

export function PetStreakCard({ level, streakDays, onPress }: PetStreakCardProps) {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, themedStyles.card, pressed && styles.pressed]}
    >
      <Image source={images.geniePet} style={styles.avatar} resizeMode="contain" />
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={[styles.petName, themedStyles.petName]}>Finladin</Text>
          <View style={[styles.levelBadge, themedStyles.levelBadge]}>
            <Text style={[styles.levelText, themedStyles.levelText]}>Lv.{level}</Text>
          </View>
        </View>
        <View style={styles.streakRow}>
          <Image source={icons.fireStreak} style={styles.fireIcon} resizeMode="contain" />
          <Text style={[styles.streakText, themedStyles.streakText]}>{streakDays} day streak!</Text>
        </View>
        <Text style={[styles.caption, themedStyles.caption]}>Tap to feed and keep the streak alive.</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.surface,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
    ...tokens.shadows.sm,
  },
  pressed: {
    transform: [{ scale: 0.995 }],
  },
  avatar: {
    width: 68,
    height: 68,
    marginRight: tokens.spacing.md,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: 4,
  },
  petName: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
  },
  levelBadge: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.full,
  },
  levelText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  fireIcon: {
    width: 16,
    height: 16,
  },
  streakText: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.text,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  caption: {
    marginTop: 4,
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
  },
});

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
    },
    petName: {
      color: colors.text,
    },
    levelBadge: {
      backgroundColor: colors.primary,
    },
    levelText: {
      color: colors.textOnPrimary,
    },
    streakText: {
      color: colors.text,
    },
    caption: {
      color: colors.textSecondary,
    },
  });
