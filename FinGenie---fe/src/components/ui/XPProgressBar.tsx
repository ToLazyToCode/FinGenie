import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '../../theme';
import { useThemeStore } from '../../store/themeStore';

interface XPProgressBarProps {
  currentXP: number;
  levelXP: number; // XP needed for next level
  level: number;
  height?: number;
  showLabel?: boolean;
}

export function XPProgressBar({
  currentXP,
  levelXP,
  level,
  height = 12,
  showLabel = true,
}: XPProgressBarProps) {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);
  const progress = Math.min((currentXP / levelXP) * 100, 100);

  return (
    <View style={styles.container}>
      {showLabel && (
        <View style={styles.labelRow}>
          <Text style={[styles.levelText, themedStyles.levelText]}>Level {level}</Text>
          <Text style={[styles.xpText, themedStyles.xpText]}>
            {currentXP} / {levelXP} XP
          </Text>
        </View>
      )}
      <View style={[styles.track, themedStyles.track, { height }]}>
        <LinearGradient
          colors={tokens.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${progress}%` }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.xs,
  },
  levelText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  xpText: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  track: {
    borderRadius: tokens.borderRadius.full,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: tokens.borderRadius.full,
  },
});

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    levelText: {
      color: colors.text,
    },
    xpText: {
      color: colors.textSecondary,
    },
    track: {
      backgroundColor: colors.backgroundSecondary,
    },
  });
