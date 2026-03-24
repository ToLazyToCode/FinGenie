/**
 * FormInput Component
 * 
 * Reusable input component with:
 * - Themed styling (light/dark mode)
 * - Error state display
 * - Accessibility labels
 * - Multiple keyboard types
 * - i18n support
 */

import React, { forwardRef, useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  ViewStyle,
  TextInputProps,
  Pressable,
  Animated,
} from 'react-native';
import { themeStore, languageStore } from '../../store';

export interface FormInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  touched?: boolean;
  containerStyle?: ViewStyle;
  disabled?: boolean;
  required?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
}

export const FormInput = forwardRef<TextInput, FormInputProps>(function FormInput(
  {
    label,
    error,
    touched = true,
    containerStyle,
    disabled = false,
    required = false,
    leftIcon,
    rightIcon,
    onRightIconPress,
    ...inputProps
  },
  ref
) {
  const { colors } = themeStore();
  const [isFocused, setIsFocused] = useState(false);
  const showError = touched && !!error;

  const inputContainerStyle = [
    styles.inputContainer,
    {
      backgroundColor: disabled ? colors.backgroundSecondary : colors.surface,
      borderColor: showError
        ? colors.error
        : isFocused
        ? colors.primary
        : colors.border,
      borderWidth: isFocused || showError ? 2 : 1,
    },
  ];

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            {label}
          </Text>
          {required && (
            <Text style={[styles.required, { color: colors.error }]}>*</Text>
          )}
        </View>
      )}

      <View style={inputContainerStyle}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}

        <TextInput
          ref={ref}
          style={[
            styles.input,
            { color: colors.text },
            leftIcon ? styles.inputWithLeftIcon : null,
            rightIcon ? styles.inputWithRightIcon : null,
          ]}
          placeholderTextColor={colors.textMuted}
          editable={!disabled}
          onFocus={(e) => {
            setIsFocused(true);
            inputProps.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            inputProps.onBlur?.(e);
          }}
          accessibilityLabel={label}
          accessibilityHint={error}
          accessibilityState={{ disabled }}
          {...inputProps}
        />

        {rightIcon && (
          <Pressable
            onPress={onRightIconPress}
            style={styles.rightIcon}
            disabled={!onRightIconPress}
            hitSlop={8}
          >
            {rightIcon}
          </Pressable>
        )}
      </View>

      {showError && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
  },
  required: {
    fontSize: 14,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  leftIcon: {
    marginRight: 4,
  },
  rightIcon: {
    marginLeft: 4,
    padding: 4,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
});
