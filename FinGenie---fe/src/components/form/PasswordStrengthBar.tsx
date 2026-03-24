/**
 * Password Strength Component
 * 
 * Visual password strength indicator with:
 * - Animated strength bar
 * - Real-time feedback while typing
 * - Criteria checklist
 * - Accessible for screen readers
 * 
 * UX: Shows during typing without aggressive errors
 * Only shows red error states on blur/submit
 */

import React, { useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { calculatePasswordStrength, PasswordStrength } from '../../utils/adaptiveValidation';
import { useThemeStore } from '../../store/themeStore';
import type { ThemeColors } from '../../theme/colors';
import { tokens } from '../../theme';

// =====================================
// TYPES
// =====================================

interface PasswordStrengthBarProps {
  /** Current password value */
  password: string;
  /** Show detailed criteria list */
  showCriteria?: boolean;
  /** Show feedback text */
  showFeedback?: boolean;
  /** Compact mode (bar only) */
  compact?: boolean;
  /** Whether the field has been touched/blurred */
  touched?: boolean;
  /** Style override */
  style?: object;
}

// =====================================
// STRENGTH BAR COMPONENT
// =====================================

export function PasswordStrengthBar({
  password,
  showCriteria = false,
  showFeedback = true,
  compact = false,
  touched = false,
  style,
}: PasswordStrengthBarProps) {
  const { colors } = useThemeStore();
  const themedStyles = useMemo(() => getThemedStyles(colors), [colors]);
  const animatedWidth = useRef(new Animated.Value(0)).current;
  const animatedColor = useRef(new Animated.Value(0)).current;

  // Calculate strength
  const strength = useMemo(() => calculatePasswordStrength(password), [password]);

  // Animate changes
  useEffect(() => {
    Animated.parallel([
      Animated.spring(animatedWidth, {
        toValue: strength.score,
        useNativeDriver: false,
        friction: 8,
      }),
      Animated.timing(animatedColor, {
        toValue: strength.score,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();

    // Announce to screen readers
    if (password.length > 0) {
      AccessibilityInfo.announceForAccessibility(
        `Password strength: ${strength.level}. ${strength.feedback[0]}`
      );
    }
  }, [strength.score, strength.level, animatedWidth, animatedColor, password.length, strength.feedback]);

  // Interpolate bar color using theme colors
  const barColor = animatedColor.interpolate({
    inputRange: [0, 30, 60, 80, 100],
    outputRange: [colors.error, colors.error, colors.warning, colors.success, colors.success],
  });

  // Don't render if no password
  if (!password) {
    return null;
  }

  if (compact) {
    return (
      <View style={[styles.compactContainer, style]}>
        <View style={[styles.barBackground, { backgroundColor: colors.border }]}>
          <Animated.View
            style={[
              styles.barFill,
              {
                width: animatedWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%'],
                }),
                backgroundColor: barColor,
              },
            ]}
          />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {/* Strength Label */}
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>
          Password strength
        </Text>
        <Text style={[styles.level, { color: strength.color }]}>
          {strength.level.charAt(0).toUpperCase() + strength.level.slice(1)}
        </Text>
      </View>

      {/* Strength Bar */}
      <View style={[styles.barBackground, { backgroundColor: colors.border }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: animatedWidth.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: barColor,
            },
          ]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: strength.score }}
        />
      </View>

      {/* Feedback */}
      {showFeedback && strength.feedback.length > 0 && (
        <Text style={[styles.feedback, { color: colors.textSecondary }]}>
          {strength.feedback[0]}
        </Text>
      )}

      {/* Criteria Checklist */}
      {showCriteria && (
        <View style={styles.criteriaContainer}>
          <CriteriaItem
            met={strength.criteria.length}
            label="At least 8 characters"
            colors={colors}
            touched={touched}
          />
          <CriteriaItem
            met={strength.criteria.uppercase}
            label="Uppercase letter"
            colors={colors}
            touched={touched}
          />
          <CriteriaItem
            met={strength.criteria.lowercase}
            label="Lowercase letter"
            colors={colors}
            touched={touched}
          />
          <CriteriaItem
            met={strength.criteria.number}
            label="Number"
            colors={colors}
            touched={touched}
          />
          <CriteriaItem
            met={strength.criteria.special}
            label="Special character"
            colors={colors}
            touched={touched}
          />
        </View>
      )}
    </View>
  );
}

// =====================================
// CRITERIA ITEM COMPONENT
// =====================================

interface CriteriaItemProps {
  met: boolean;
  label: string;
  colors: any;
  touched: boolean;
}

function CriteriaItem({ met, label, colors, touched }: CriteriaItemProps) {
  // Colors:
  // - Met: Green checkmark
  // - Not met + not touched: Neutral gray (no red while typing)
  // - Not met + touched: Red X (show error after blur)
  const iconName = met ? 'checkmark-circle' : (touched ? 'close-circle' : 'ellipse-outline');
  const iconColor = met 
    ? colors.success 
    : (touched ? colors.error : colors.textMuted);
  const textColor = met 
    ? colors.text 
    : (touched ? colors.error : colors.textMuted);

  return (
    <View style={styles.criteriaItem}>
      <Ionicons name={iconName} size={16} color={iconColor} />
      <Text style={[styles.criteriaLabel, { color: textColor }]}>
        {label}
      </Text>
    </View>
  );
}

// =====================================
// PASSWORD INPUT WITH STRENGTH
// =====================================

interface PasswordInputWithStrengthProps {
  value: string;
  onChangeText: (text: string) => void;
  onBlur?: () => void;
  error?: string | null;
  touched?: boolean;
  label?: string;
  placeholder?: string;
  showStrength?: boolean;
  showCriteria?: boolean;
  required?: boolean;
}

/**
 * Combined password input with strength indicator
 * Designed for registration/password change flows
 */
export function PasswordInputWithStrength({
  value,
  onChangeText,
  onBlur,
  error,
  touched = false,
  label = 'Password',
  placeholder = 'Enter password',
  showStrength = true,
  showCriteria = false,
  required = true,
}: PasswordInputWithStrengthProps) {
  const { colors } = useThemeStore();
  const [showPassword, setShowPassword] = React.useState(false);

  // Only show error if touched AND there's an error
  const displayError = touched && error;

  return (
    <View style={styles.inputContainer}>
      {/* Label */}
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.inputLabel, { color: colors.text }]}>
            {label}
          </Text>
          {required && (
            <Text style={[styles.required, { color: colors.error }]}>*</Text>
          )}
        </View>
      )}

      {/* Input Field */}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surface,
            borderColor: displayError ? colors.error : colors.border,
          },
        ]}
      >
        <Ionicons
          name="lock-closed-outline"
          size={20}
          color={colors.textMuted}
          style={styles.inputIcon}
        />
        <View style={styles.textInputContainer}>
          {/* Use TextInput from react-native */}
          <Text
            style={[styles.inputText, { color: value ? colors.text : colors.textMuted }]}
            numberOfLines={1}
          >
            {value ? (showPassword ? value : '•'.repeat(value.length)) : placeholder}
          </Text>
        </View>
        <Ionicons
          name={showPassword ? 'eye-off-outline' : 'eye-outline'}
          size={20}
          color={colors.textMuted}
          style={styles.inputIcon}
          onPress={() => setShowPassword(!showPassword)}
        />
      </View>

      {/* Error Message - Only shown when touched */}
      {displayError && (
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error}
        </Text>
      )}

      {/* Password Strength - Always shows while typing (no error shown) */}
      {showStrength && value && (
        <PasswordStrengthBar
          password={value}
          showCriteria={showCriteria}
          touched={touched}
          style={styles.strengthBar}
        />
      )}
    </View>
  );
}

// =====================================
// STYLES
// =====================================

const styles = StyleSheet.create({
  container: {
    marginTop: tokens.spacing.sm,
  },
  compactContainer: {
    marginTop: tokens.spacing.xs,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  label: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  level: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  barBackground: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
  },
  feedback: {
    fontSize: tokens.typography.fontSizes.xs,
    marginTop: tokens.spacing.xs,
  },
  criteriaContainer: {
    marginTop: tokens.spacing.sm,
  },
  criteriaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  criteriaLabel: {
    fontSize: tokens.typography.fontSizes.xs,
    marginLeft: tokens.spacing.xs,
  },

  // Input with strength styles
  inputContainer: {
    marginBottom: tokens.spacing.md,
  },
  labelContainer: {
    flexDirection: 'row',
    marginBottom: tokens.spacing.xs,
  },
  inputLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  required: {
    marginLeft: tokens.spacing.xs,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.sm,
    height: 48,
  },
  inputIcon: {
    marginHorizontal: tokens.spacing.xs,
  },
  textInputContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inputText: {
    fontSize: tokens.typography.fontSizes.md,
  },
  errorText: {
    fontSize: tokens.typography.fontSizes.xs,
    marginTop: tokens.spacing.xs,
  },
  strengthBar: {
    marginTop: tokens.spacing.sm,
  },
});

/**
 * Get themed styles based on current color scheme
 */
function getThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({});
}

export default PasswordStrengthBar;
