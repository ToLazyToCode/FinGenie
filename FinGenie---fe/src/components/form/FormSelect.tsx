/**
 * FormSelect Component
 * 
 * Dropdown selector with:
 * - Themed styling (light/dark mode)
 * - Error state display
 * - Accessibility support
 * - Modal picker for mobile
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Pressable,
  Modal,
  FlatList,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import type { ThemeColors } from '../../theme/colors';

export interface SelectOption<T = string | number> {
  label: string;
  value: T;
  icon?: React.ReactNode;
  disabled?: boolean;
}

interface FormSelectProps<T = string | number> {
  label?: string;
  placeholder?: string;
  value?: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  error?: string;
  touched?: boolean;
  containerStyle?: ViewStyle;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
}

export function FormSelect<T extends string | number = string>({
  label,
  placeholder = 'Select an option',
  value,
  options,
  onChange,
  error,
  touched = true,
  containerStyle,
  disabled = false,
  required = false,
}: FormSelectProps<T>) {
  const { colors } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const themedStyles = useMemo(() => getThemedStyles(colors), [colors]);
  const showError = touched && !!error;

  const selectedOption = options.find((opt) => opt.value === value);

  const triggerStyle = [
    styles.trigger,
    {
      backgroundColor: disabled ? colors.backgroundSecondary : colors.surface,
      borderColor: showError
        ? colors.error
        : isOpen
        ? colors.primary
        : colors.border,
      borderWidth: isOpen || showError ? 2 : 1,
    },
  ];

  const handleSelect = (option: SelectOption<T>) => {
    if (!option.disabled) {
      onChange(option.value);
      setIsOpen(false);
    }
  };

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

      <Pressable
        style={triggerStyle}
        onPress={() => !disabled && setIsOpen(true)}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: isOpen }}
      >
        {selectedOption?.icon && (
          <View style={styles.selectedIcon}>{selectedOption.icon}</View>
        )}
        <Text
          style={[
            styles.triggerText,
            {
              color: selectedOption ? colors.text : colors.textMuted,
            },
          ]}
          numberOfLines={1}
        >
          {selectedOption?.label || placeholder}
        </Text>
        <Text style={[styles.arrow, { color: colors.textSecondary }]}>
          {isOpen ? '▲' : '▼'}
        </Text>
      </Pressable>

      {showError && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}

      {/* Options Modal */}
      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, themedStyles.modalHeader]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {label || 'Select'}
            </Text>
            <Pressable
              onPress={() => setIsOpen(false)}
              hitSlop={8}
            >
              <Text style={[styles.closeButton, { color: colors.primary }]}>
                Done
              </Text>
            </Pressable>
          </View>

          <FlatList
            data={options}
            keyExtractor={(item) => String(item.value)}
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.option,
                  {
                    backgroundColor: pressed
                      ? colors.backgroundSecondary
                      : item.value === value
                      ? colors.accent
                      : colors.surface,
                  },
                  item.disabled && styles.optionDisabled,
                ]}
                onPress={() => handleSelect(item)}
                disabled={item.disabled}
              >
                {item.icon && <View style={styles.optionIcon}>{item.icon}</View>}
                <Text
                  style={[
                    styles.optionText,
                    { color: item.disabled ? colors.textMuted : colors.text },
                    item.value === value && { color: colors.primary, fontWeight: '600' },
                  ]}
                >
                  {item.label}
                </Text>
                {item.value === value && (
                  <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>
                )}
              </Pressable>
            )}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
            )}
            contentContainerStyle={styles.optionsList}
          />
        </SafeAreaView>
      </Modal>
    </View>
  );
}

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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  selectedIcon: {
    marginRight: 8,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
  },
  arrow: {
    fontSize: 10,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionsList: {
    paddingVertical: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    borderRadius: 8,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
  },
  checkmark: {
    fontSize: 16,
    marginLeft: 8,
  },
  separator: {
    height: 1,
    marginHorizontal: 16,
  },
});

/**
 * Get themed styles based on current color scheme
 */
function getThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    modalHeader: {
      borderBottomColor: colors.border,
    },
  });
}
