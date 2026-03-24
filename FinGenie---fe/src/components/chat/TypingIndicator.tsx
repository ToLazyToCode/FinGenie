import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface TypingIndicatorProps {
  dotColor: string;
  style?: StyleProp<ViewStyle>;
}

const DOT_COUNT = 3;

export function TypingIndicator({ dotColor, style }: TypingIndicatorProps) {
  const animValues = useRef(
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0.25))
  ).current;

  useEffect(() => {
    const loops = animValues.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * 120),
          Animated.timing(value, {
            toValue: 1,
            duration: 280,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.25,
            duration: 280,
            useNativeDriver: true,
          }),
        ])
      )
    );

    loops.forEach((animation) => animation.start());
    return () => {
      loops.forEach((animation) => animation.stop());
    };
  }, [animValues]);

  return (
    <View style={[styles.container, style]}>
      {animValues.map((opacity, index) => {
        const translateY = opacity.interpolate({
          inputRange: [0.25, 1],
          outputRange: [1, -1],
        });

        return (
          <Animated.View
            key={`typing-dot-${index}`}
            style={[
              styles.dot,
              {
                backgroundColor: dotColor,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 18,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
});

