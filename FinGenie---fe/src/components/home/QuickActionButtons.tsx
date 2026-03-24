import React, { useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Image, type ImageSourcePropType } from 'react-native';
import { tokens } from '../../theme';
import { useThemeStore } from '../../store/themeStore';
import { icons } from '../../constants/assets';

interface QuickActionButtonsProps {
  onAddIncome: () => void;
  onAddExpense: () => void;
}

function ActionButton({
  label,
  icon,
  backgroundColor,
  textColor,
  onPress,
}: {
  label: string;
  icon: ImageSourcePropType;
  backgroundColor: string;
  textColor: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      damping: 12,
      stiffness: 180,
    }).start();
  };

  return (
    <Animated.View style={[styles.actionWrapper, { transform: [{ scale }] }]}> 
      <Pressable
        onPress={onPress}
        onPressIn={() => animate(0.96)}
        onPressOut={() => animate(1)}
        style={[styles.button, { backgroundColor }]}
      >
        <Image source={icon} style={[styles.icon, { tintColor: textColor }]} resizeMode="contain" />
        <Text style={[styles.buttonLabel, { color: textColor }]}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export function QuickActionButtons({ onAddIncome, onAddExpense }: QuickActionButtonsProps) {
  const { colors } = useThemeStore();

  return (
    <View style={styles.container}>
      <ActionButton
        label="Add Income"
        icon={icons.incomePlus}
        backgroundColor={tokens.colors.income}
        textColor={colors.textOnPrimary}
        onPress={onAddIncome}
      />
      <ActionButton
        label="Add Expense"
        icon={icons.expenseMinus}
        backgroundColor={tokens.colors.expense}
        textColor={colors.textOnPrimary}
        onPress={onAddExpense}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  actionWrapper: {
    flex: 1,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.borderRadius.full,
    gap: tokens.spacing.sm,
  },
  icon: {
    width: 22,
    height: 22,
  },
  buttonLabel: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});
