import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Pressable, Text, Animated, Image, LayoutChangeEvent } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { tokens } from '../../theme';
import { tabIcons } from '../../constants/assets';
import { useThemeStore } from '../../store/themeStore';

const TAB_HORIZONTAL_PADDING = tokens.spacing.md;

type TabIconKey = keyof typeof tabIcons;

function getIconKey(routeName: string): TabIconKey {
  return routeName.toLowerCase() as TabIconKey;
}

export function BottomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);
  const animatedIndex = useRef(new Animated.Value(state.index)).current;
  const [width, setWidth] = useState(0);
  const tabWidth = width / state.routes.length || 0;
  const translateX = useMemo(() => Animated.multiply(animatedIndex, tabWidth), [animatedIndex, tabWidth]);
  const inputRange = useMemo(() => state.routes.map((_, idx) => idx), [state.routes.length]);

  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: state.index,
      useNativeDriver: true,
      stiffness: 180,
      damping: 18,
    }).start();
  }, [animatedIndex, state.index]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.safeArea}>
      <View style={[styles.container, themedStyles.container]} onLayout={handleLayout}>
        {width > 0 && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.indicator,
              themedStyles.indicator,
              {
                width: Math.max(tabWidth - TAB_HORIZONTAL_PADDING, 0),
                transform: [{ translateX }],
              },
            ]}
          />
        )}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
                ? options.title
                : route.name;

          const focused = state.index === index;
          const iconKey = getIconKey(route.name);
          const iconSet = tabIcons[iconKey];
          const iconSource = focused ? iconSet.active : iconSet.default;
          const opacity = animatedIndex.interpolate({
            inputRange,
            outputRange: inputRange.map((value) => (value === index ? 1 : 0.55)),
          });

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={onPress}
              style={styles.tab}
            >
              <Animated.View style={[styles.tabInner, { opacity }]}>
                <Image 
                  source={iconSource} 
                  style={[styles.icon, { tintColor: focused ? colors.primary : colors.textSecondary }]} 
                  resizeMode="contain" 
                />
                <Text style={[styles.label, focused ? themedStyles.labelActive : themedStyles.labelInactive]}>{label}</Text>
              </Animated.View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
    },
    labelActive: {
      color: colors.primary,
    },
    labelInactive: {
      color: colors.textSecondary,
    },
    indicator: {
      backgroundColor: colors.pressed,
    },
  });

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: 'transparent',
  },
  container: {
    flexDirection: 'row',
    marginHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
    borderRadius: 28,
    paddingHorizontal: TAB_HORIZONTAL_PADDING / 2,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    ...tokens.shadows.sm,
  },
  indicator: {
    position: 'absolute',
    left: TAB_HORIZONTAL_PADDING / 2,
    top: tokens.spacing.sm,
    bottom: tokens.spacing.sm,
    borderRadius: 20,
  },
  tab: {
    flex: 1,
  },
  tabInner: {
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    width: 22,
    height: 22,
  },
  label: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.medium,
  },
});
