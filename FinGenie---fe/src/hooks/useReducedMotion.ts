/**
 * useReducedMotion Hook
 * 
 * Detects and tracks the user's reduced motion preference from system settings.
 * Used to disable or simplify animations for users with vestibular disorders
 * or motion sensitivity.
 * 
 * Usage:
 * ```tsx
 * const prefersReducedMotion = useReducedMotion();
 * 
 * const animationDuration = prefersReducedMotion ? 0 : 300;
 * ```
 */

import { useState, useEffect, useCallback } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const handleReduceMotionChange = useCallback((isEnabled: boolean) => {
    setPrefersReducedMotion(isEnabled);
  }, []);

  useEffect(() => {
    // Check initial state
    const checkInitialState = async () => {
      try {
        if (Platform.OS === 'ios') {
          const isEnabled = await AccessibilityInfo.isReduceMotionEnabled();
          setPrefersReducedMotion(isEnabled);
        } else {
          // Android: Check animation scale settings
          // Note: This is a simplified check; full Android support may need native module
          const isEnabled = await AccessibilityInfo.isReduceMotionEnabled();
          setPrefersReducedMotion(isEnabled);
        }
      } catch (error) {
        console.warn('Failed to check reduce motion preference:', error);
        setPrefersReducedMotion(false);
      }
    };

    checkInitialState();

    // Subscribe to changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      handleReduceMotionChange
    );

    return () => {
      subscription.remove();
    };
  }, [handleReduceMotionChange]);

  return prefersReducedMotion;
}

/**
 * useAccessibilityInfo Hook
 * 
 * Comprehensive accessibility state detection including:
 * - Screen reader active
 * - Reduce motion preference
 * - Bold text preference (iOS)
 * - Grayscale preference (iOS)
 */
export interface AccessibilityState {
  screenReaderEnabled: boolean;
  reduceMotionEnabled: boolean;
  boldTextEnabled: boolean;
  grayscaleEnabled: boolean;
  reduceTransparencyEnabled: boolean;
}

export function useAccessibilityInfo(): AccessibilityState {
  const [state, setState] = useState<AccessibilityState>({
    screenReaderEnabled: false,
    reduceMotionEnabled: false,
    boldTextEnabled: false,
    grayscaleEnabled: false,
    reduceTransparencyEnabled: false,
  });

  useEffect(() => {
    const checkAccessibility = async () => {
      try {
        const [
          screenReader,
          reduceMotion,
          boldText,
          grayscale,
          reduceTransparency,
        ] = await Promise.all([
          AccessibilityInfo.isScreenReaderEnabled(),
          AccessibilityInfo.isReduceMotionEnabled(),
          Platform.OS === 'ios'
            ? AccessibilityInfo.isBoldTextEnabled()
            : Promise.resolve(false),
          Platform.OS === 'ios'
            ? AccessibilityInfo.isGrayscaleEnabled()
            : Promise.resolve(false),
          Platform.OS === 'ios'
            ? AccessibilityInfo.isReduceTransparencyEnabled()
            : Promise.resolve(false),
        ]);

        setState({
          screenReaderEnabled: screenReader,
          reduceMotionEnabled: reduceMotion,
          boldTextEnabled: boldText,
          grayscaleEnabled: grayscale,
          reduceTransparencyEnabled: reduceTransparency,
        });
      } catch (error) {
        console.warn('Failed to check accessibility info:', error);
      }
    };

    checkAccessibility();

    // Set up listeners
    const subscriptions = [
      AccessibilityInfo.addEventListener('screenReaderChanged', (enabled) =>
        setState((prev) => ({ ...prev, screenReaderEnabled: enabled }))
      ),
      AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) =>
        setState((prev) => ({ ...prev, reduceMotionEnabled: enabled }))
      ),
    ];

    // iOS-specific listeners
    if (Platform.OS === 'ios') {
      subscriptions.push(
        AccessibilityInfo.addEventListener('boldTextChanged', (enabled) =>
          setState((prev) => ({ ...prev, boldTextEnabled: enabled }))
        ),
        AccessibilityInfo.addEventListener('grayscaleChanged', (enabled) =>
          setState((prev) => ({ ...prev, grayscaleEnabled: enabled }))
        ),
        AccessibilityInfo.addEventListener(
          'reduceTransparencyChanged',
          (enabled) =>
            setState((prev) => ({ ...prev, reduceTransparencyEnabled: enabled }))
        )
      );
    }

    return () => {
      subscriptions.forEach((sub) => sub.remove());
    };
  }, []);

  return state;
}

/**
 * Get accessible animation duration
 * Returns 0 if reduced motion is preferred, otherwise returns the provided duration
 */
export function getAccessibleDuration(
  duration: number,
  prefersReducedMotion: boolean
): number {
  return prefersReducedMotion ? 0 : duration;
}

/**
 * Get accessible animation config for React Native Animated
 */
export function getAccessibleSpringConfig(
  prefersReducedMotion: boolean
): { tension: number; friction: number; useNativeDriver: boolean } {
  if (prefersReducedMotion) {
    return {
      tension: 1000, // Very high tension = instant
      friction: 1000, // Very high friction = no bounce
      useNativeDriver: true,
    };
  }
  return {
    tension: 40,
    friction: 7,
    useNativeDriver: true,
  };
}

export default useReducedMotion;
