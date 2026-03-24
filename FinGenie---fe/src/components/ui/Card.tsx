import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp, Pressable } from 'react-native';
import { tokens } from '../../theme';
import { useThemeStore } from '../../store/themeStore';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  variant?: 'default' | 'elevated';
}

export function Card({ children, style, onPress, variant = 'default' }: CardProps) {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);
  const cardStyle = [
    styles.card,
    themedStyles.card,
    variant === 'elevated' && styles.elevated,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [...cardStyle, pressed ? styles.pressed : null, style].filter(Boolean) as ViewStyle[]}>
        {children}
      </Pressable>
    );
  }

  return <View style={[...cardStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
    ...tokens.shadows.sm,
  },
  elevated: {
    ...tokens.shadows.md,
  },
  pressed: {
    opacity: 0.9,
  },
});

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.surface,
    },
  });
