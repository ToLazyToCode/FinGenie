import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { tokens } from '../../theme';
import { useThemeStore } from '../../store/themeStore';

interface AvatarProps {
  source?: string | null;
  name?: string;
  size?: 'sm' | 'md' | 'lg';
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({ source, name, size = 'md' }: AvatarProps) {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);
  const sizeMap = {
    sm: 32,
    md: 44,
    lg: 64,
  };

  const dimension = sizeMap[size];

  if (source) {
    return (
      <Image
        source={{ uri: source }}
        style={[styles.image, themedStyles.image, { width: dimension, height: dimension, borderRadius: dimension / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        themedStyles.placeholder,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        },
      ]}
    >
      <Text style={[styles.initials, themedStyles.initials, { fontSize: dimension * 0.4 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: {},
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    image: {
      backgroundColor: colors.backgroundSecondary,
    },
    placeholder: {
      backgroundColor: colors.primary,
    },
    initials: {
      color: colors.background,
    },
  });
