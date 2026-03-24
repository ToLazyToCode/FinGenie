/**
 * LoadingButton Component
 * 
 * Button with loading state indicator
 * Built on top of GradientButton
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useThemeStore } from '../../store/themeStore';
import type { ThemeColors } from '../../theme/colors';

interface LoadingButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
  fullWidth?: boolean;
}

export function LoadingButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  style,
  fullWidth = true,
}: LoadingButtonProps) {
  const { colors } = useThemeStore();
  const themedStyles = useMemo(() => getThemedStyles(colors), [colors]);
  const isDisabled = disabled || loading;

  const sizeStyles = {
    sm: { paddingVertical: 10, paddingHorizontal: 16 },
    md: { paddingVertical: 14, paddingHorizontal: 20 },
    lg: { paddingVertical: 18, paddingHorizontal: 24 },
  };

  const fontSizes = {
    sm: 14,
    md: 16,
    lg: 18,
  };

  const getGradientColors = (): [string, string] => {
    if (isDisabled) return [colors.border, colors.border];
    switch (variant) {
      case 'primary':
        return [colors.primary, colors.primaryLight];
      case 'secondary':
        return [colors.backgroundSecondary, colors.background];
      case 'danger':
        return [colors.error, colors.expense];
      case 'outline':
        return ['transparent', 'transparent'];
      default:
        return [colors.primary, colors.primaryLight];
    }
  };

  const getTextColor = () => {
    if (isDisabled) return colors.textMuted;
    switch (variant) {
      case 'primary':
      case 'danger':
        return colors.textOnPrimary;
      case 'secondary':
      case 'outline':
        return colors.text;
      default:
        return colors.textOnPrimary;
    }
  };

  const outlineStyle = variant === 'outline' && !isDisabled ? {
    borderWidth: 2,
    borderColor: colors.primary,
  } : {};

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        pressed && !isDisabled && styles.pressed,
        fullWidth && styles.fullWidth,
        style,
      ].filter(Boolean)}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.gradient,
          sizeStyles[size],
          outlineStyle,
        ]}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="small"
              color={getTextColor()}
              style={styles.spinner}
            />
            <Text style={[styles.text, { color: getTextColor(), fontSize: fontSizes[size] }]}>
              {title}
            </Text>
          </View>
        ) : (
          <Text style={[styles.text, { color: getTextColor(), fontSize: fontSizes[size] }]}>
            {title}
          </Text>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  gradient: {
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  fullWidth: {
    width: '100%',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    marginRight: 8,
  },
});

/**
 * Get themed styles based on current color scheme
 */
function getThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({});
}
