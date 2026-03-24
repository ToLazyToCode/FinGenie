import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, TextStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { tokens } from '../../theme';
import { useThemeStore } from '../../store/themeStore';

interface GradientButtonProps {
  title?: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  children?: React.ReactNode;
}

export function GradientButton({
  title,
  onPress,
  disabled = false,
  variant = 'primary',
  size = 'md',
  style,
  children,
}: GradientButtonProps) {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);
  const gradientColors = variant === 'primary' ? tokens.gradients.primary : tokens.gradients.soft;

  const sizeStyles: Record<string, { paddingVertical: number; paddingHorizontal: number }> = {
    sm: { paddingVertical: tokens.spacing.sm, paddingHorizontal: tokens.spacing.md },
    md: { paddingVertical: tokens.spacing.md, paddingHorizontal: tokens.spacing.lg },
    lg: { paddingVertical: tokens.spacing.lg, paddingHorizontal: tokens.spacing.xl },
  };

  const content = children ?? (
    <Text
      style={[
        styles.text,
        themedStyles.text,
        variant === 'secondary' && themedStyles.textSecondary,
        disabled && themedStyles.textDisabled,
      ]}
    >
      {title}
    </Text>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [pressed && styles.pressed, disabled && styles.disabled, style].filter(Boolean)}
    >
      <LinearGradient
        colors={disabled ? [colors.border, colors.border] : gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, sizeStyles[size]]}
      >
        {content}
      </LinearGradient>
    </Pressable>
  );
}

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    text: {
      color: colors.background,
    } as TextStyle,
    textSecondary: {
      color: colors.text,
    } as TextStyle,
    textDisabled: {
      color: colors.textMuted,
    } as TextStyle,
  });

const styles = StyleSheet.create({
  gradient: {
    borderRadius: tokens.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  } as TextStyle,
  pressed: {
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.6,
  },
});
