/**
 * AnimatedView Component
 * 
 * An accessibility-aware animated view component that respects
 * the user's reduced motion preference.
 * 
 * When reduced motion is enabled:
 * - Animations complete instantly
 * - Transitions are disabled
 * - The final state is shown immediately
 * 
 * Usage:
 * ```tsx
 * <AnimatedView
 *   animation="fadeIn"
 *   duration={300}
 *   delay={100}
 * >
 *   <Text>Hello World</Text>
 * </AnimatedView>
 * ```
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  Animated,
  ViewStyle,
  StyleProp,
  ViewProps,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { useReducedMotion } from '../../hooks/useReducedMotion';

// Enable LayoutAnimation on Android
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type AnimationType =
  | 'fadeIn'
  | 'fadeOut'
  | 'slideUp'
  | 'slideDown'
  | 'slideLeft'
  | 'slideRight'
  | 'scaleIn'
  | 'scaleOut'
  | 'bounce';

export interface AnimatedViewProps extends ViewProps {
  /** Animation type to apply */
  animation?: AnimationType;
  /** Duration in milliseconds (ignored if reduced motion is enabled) */
  duration?: number;
  /** Delay before animation starts in milliseconds */
  delay?: number;
  /** Whether animation should play */
  animate?: boolean;
  /** Callback when animation completes */
  onAnimationComplete?: () => void;
  /** Style applied to the container */
  style?: StyleProp<ViewStyle>;
  /** Children to render */
  children?: React.ReactNode;
  /** Force disable animation regardless of system settings */
  forceNoAnimation?: boolean;
}

export function AnimatedView({
  animation = 'fadeIn',
  duration = 300,
  delay = 0,
  animate = true,
  onAnimationComplete,
  style,
  children,
  forceNoAnimation = false,
  ...props
}: AnimatedViewProps) {
  const prefersReducedMotion = useReducedMotion();
  const shouldAnimate = animate && !prefersReducedMotion && !forceNoAnimation;

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const translateX = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  // Get initial values based on animation type
  const getInitialValues = useCallback(() => {
    switch (animation) {
      case 'fadeIn':
        fadeAnim.setValue(0);
        break;
      case 'fadeOut':
        fadeAnim.setValue(1);
        break;
      case 'slideUp':
        translateY.setValue(50);
        fadeAnim.setValue(0);
        break;
      case 'slideDown':
        translateY.setValue(-50);
        fadeAnim.setValue(0);
        break;
      case 'slideLeft':
        translateX.setValue(50);
        fadeAnim.setValue(0);
        break;
      case 'slideRight':
        translateX.setValue(-50);
        fadeAnim.setValue(0);
        break;
      case 'scaleIn':
        scaleAnim.setValue(0.8);
        fadeAnim.setValue(0);
        break;
      case 'scaleOut':
        scaleAnim.setValue(1);
        fadeAnim.setValue(1);
        break;
      case 'bounce':
        scaleAnim.setValue(0.3);
        fadeAnim.setValue(0);
        break;
    }
  }, [animation, fadeAnim, translateY, translateX, scaleAnim]);

  // Get final values based on animation type
  const getFinalValues = useCallback(() => {
    switch (animation) {
      case 'fadeIn':
        return { opacity: 1 };
      case 'fadeOut':
        return { opacity: 0 };
      case 'slideUp':
      case 'slideDown':
        return { translateY: 0, opacity: 1 };
      case 'slideLeft':
      case 'slideRight':
        return { translateX: 0, opacity: 1 };
      case 'scaleIn':
        return { scale: 1, opacity: 1 };
      case 'scaleOut':
        return { scale: 0.8, opacity: 0 };
      case 'bounce':
        return { scale: 1, opacity: 1 };
      default:
        return { opacity: 1 };
    }
  }, [animation]);

  // Run animation
  useEffect(() => {
    if (!animate) return;

    getInitialValues();

    if (!shouldAnimate) {
      // Set final values immediately if reduced motion is preferred
      const finalValues = getFinalValues();
      if ('opacity' in finalValues) {
        fadeAnim.setValue(finalValues.opacity);
      }
      if ('translateY' in finalValues && finalValues.translateY !== undefined) {
        translateY.setValue(finalValues.translateY);
      }
      if ('translateX' in finalValues && finalValues.translateX !== undefined) {
        translateX.setValue(finalValues.translateX);
      }
      if ('scale' in finalValues && finalValues.scale !== undefined) {
        scaleAnim.setValue(finalValues.scale);
      }
      onAnimationComplete?.();
      return;
    }

    // Create animation sequence
    const animations: Animated.CompositeAnimation[] = [];
    const actualDuration = duration;

    switch (animation) {
      case 'fadeIn':
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: actualDuration,
            delay,
            useNativeDriver: true,
          })
        );
        break;
      case 'fadeOut':
        animations.push(
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: actualDuration,
            delay,
            useNativeDriver: true,
          })
        );
        break;
      case 'slideUp':
      case 'slideDown':
        animations.push(
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: 0,
              duration: actualDuration,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: actualDuration,
              delay,
              useNativeDriver: true,
            }),
          ])
        );
        break;
      case 'slideLeft':
      case 'slideRight':
        animations.push(
          Animated.parallel([
            Animated.timing(translateX, {
              toValue: 0,
              duration: actualDuration,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: actualDuration,
              delay,
              useNativeDriver: true,
            }),
          ])
        );
        break;
      case 'scaleIn':
        animations.push(
          Animated.parallel([
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 5,
              tension: 40,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: actualDuration,
              delay,
              useNativeDriver: true,
            }),
          ])
        );
        break;
      case 'scaleOut':
        animations.push(
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 0.8,
              duration: actualDuration,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 0,
              duration: actualDuration,
              delay,
              useNativeDriver: true,
            }),
          ])
        );
        break;
      case 'bounce':
        animations.push(
          Animated.parallel([
            Animated.spring(scaleAnim, {
              toValue: 1,
              friction: 3,
              tension: 40,
              delay,
              useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
              toValue: 1,
              duration: actualDuration,
              delay,
              useNativeDriver: true,
            }),
          ])
        );
        break;
    }

    const compositeAnimation = Animated.sequence(animations);
    compositeAnimation.start(({ finished }) => {
      if (finished) {
        onAnimationComplete?.();
      }
    });

    return () => {
      compositeAnimation.stop();
    };
  }, [
    animate,
    animation,
    delay,
    duration,
    fadeAnim,
    getFinalValues,
    getInitialValues,
    onAnimationComplete,
    scaleAnim,
    shouldAnimate,
    translateX,
    translateY,
  ]);

  // Build animated style
  const getAnimatedStyle = (): Animated.AnimatedProps<ViewStyle> => {
    const baseStyle: Animated.AnimatedProps<ViewStyle> = {
      opacity: fadeAnim,
    };

    switch (animation) {
      case 'slideUp':
      case 'slideDown':
        return {
          ...baseStyle,
          transform: [{ translateY }],
        };
      case 'slideLeft':
      case 'slideRight':
        return {
          ...baseStyle,
          transform: [{ translateX }],
        };
      case 'scaleIn':
      case 'scaleOut':
      case 'bounce':
        return {
          ...baseStyle,
          transform: [{ scale: scaleAnim }],
        };
      default:
        return baseStyle;
    }
  };

  return (
    <Animated.View style={[style, getAnimatedStyle()]} {...props}>
      {children}
    </Animated.View>
  );
}

/**
 * Staggered animation wrapper for lists
 * Animates children with increasing delays
 */
export interface StaggeredViewProps {
  /** Delay between each child animation */
  staggerDelay?: number;
  /** Animation type for children */
  animation?: AnimationType;
  /** Duration for each animation */
  duration?: number;
  /** Initial delay before first animation */
  initialDelay?: number;
  /** Children to animate */
  children: React.ReactNode[];
  /** Container style */
  style?: StyleProp<ViewStyle>;
}

export function StaggeredView({
  staggerDelay = 50,
  animation = 'slideUp',
  duration = 300,
  initialDelay = 0,
  children,
  style,
}: StaggeredViewProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <View style={style}>
      {React.Children.map(children, (child, index) => (
        <AnimatedView
          key={index}
          animation={animation}
          duration={duration}
          delay={prefersReducedMotion ? 0 : initialDelay + index * staggerDelay}
        >
          {child}
        </AnimatedView>
      ))}
    </View>
  );
}

/**
 * Custom layout animation presets that respect reduced motion
 */
export const AccessibleLayoutAnimations = {
  easeInEaseOut: (prefersReducedMotion: boolean) =>
    prefersReducedMotion
      ? undefined
      : LayoutAnimation.Presets.easeInEaseOut,
  
  spring: (prefersReducedMotion: boolean) =>
    prefersReducedMotion
      ? undefined
      : LayoutAnimation.Presets.spring,
  
  linear: (prefersReducedMotion: boolean) =>
    prefersReducedMotion
      ? undefined
      : LayoutAnimation.Presets.linear,
  
  custom: (prefersReducedMotion: boolean, config: typeof LayoutAnimation.Presets.easeInEaseOut) =>
    prefersReducedMotion ? undefined : config,
};

/**
 * Configure next layout animation with reduced motion support
 */
export function configureNextLayout(
  prefersReducedMotion: boolean,
  animation: 'easeInEaseOut' | 'spring' | 'linear' = 'easeInEaseOut'
) {
  if (prefersReducedMotion) return;

  switch (animation) {
    case 'easeInEaseOut':
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      break;
    case 'spring':
      LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
      break;
    case 'linear':
      LayoutAnimation.configureNext(LayoutAnimation.Presets.linear);
      break;
  }
}

export default AnimatedView;
