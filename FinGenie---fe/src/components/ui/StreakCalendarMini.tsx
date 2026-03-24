import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { tokens } from '../../theme';
import { useThemeStore } from '../../store/themeStore';

interface StreakCalendarMiniProps {
  streak: number;
  completedDays: number[]; // 1-31 for current month
  currentDay: number;
}

export function StreakCalendarMini({
  streak,
  completedDays,
  currentDay,
}: StreakCalendarMiniProps) {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);
  const days = Array.from({ length: 7 }, (_, i) => i + 1); // Last 7 days simplified

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.streakLabel, themedStyles.streakLabel]}>Streak</Text>
        <Text style={[styles.streakCount, themedStyles.streakCount]}>{streak} days</Text>
      </View>
      <View style={styles.calendarRow}>
        {days.map((day) => {
          const isCompleted = completedDays.includes(day);
          const isToday = day === currentDay;
          return (
            <View
              key={day}
              style={[
                styles.dayCell,
                themedStyles.dayCell,
                isCompleted && themedStyles.dayCompleted,
                isToday && themedStyles.dayToday,
              ]}
            >
              <Text style={[styles.dayText, themedStyles.dayText, isCompleted && themedStyles.dayTextCompleted]}>
                {day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: tokens.spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  streakLabel: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  streakCount: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  calendarRow: {
    flexDirection: 'row',
    gap: tokens.spacing.xs,
    justifyContent: 'space-between',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: tokens.borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 2,
  },
  dayText: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  dayTextCompleted: {
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    streakLabel: {
      color: colors.textSecondary,
    },
    streakCount: {
      color: colors.primary,
    },
    dayCell: {
      backgroundColor: colors.backgroundSecondary,
    },
    dayCompleted: {
      backgroundColor: colors.primary,
    },
    dayToday: {
      borderColor: colors.primary,
    },
    dayText: {
      color: colors.textMuted,
    },
    dayTextCompleted: {
      color: colors.background,
    },
  });
