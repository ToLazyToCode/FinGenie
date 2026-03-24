/**
 * FormDatePicker Component
 * 
 * Date picker with:
 * - Themed styling
 * - Platform-specific implementation
 * - Error state display
 * - Min/max date support
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Pressable,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeStore } from '../../store/themeStore';
import type { ThemeColors } from '../../theme/colors';

interface FormDatePickerProps {
  label?: string;
  value?: Date;
  onChange: (date: Date) => void;
  error?: string;
  touched?: boolean;
  containerStyle?: ViewStyle;
  disabled?: boolean;
  required?: boolean;
  minDate?: Date;
  maxDate?: Date;
  placeholder?: string;
}

// Simple scrollable date picker for cross-platform support
function SimpleDatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  onClose,
}: {
  value: Date;
  onChange: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  onClose: () => void;
}) {
  const { colors } = useThemeStore();
  const themedStyles = useMemo(() => getThemedStyles(colors), [colors]);
  const [year, setYear] = useState(value.getFullYear());
  const [month, setMonth] = useState(value.getMonth());
  const [day, setDay] = useState(value.getDate());

  const years = Array.from(
    { length: 10 },
    (_, i) => (maxDate?.getFullYear() ?? new Date().getFullYear()) - i
  );
  
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const handleConfirm = () => {
    const newDate = new Date(year, month, Math.min(day, daysInMonth));
    if (minDate && newDate < minDate) return;
    if (maxDate && newDate > maxDate) return;
    onChange(newDate);
    onClose();
  };

  return (
    <SafeAreaView style={[styles.pickerContainer, { backgroundColor: colors.background }]}>
      <View style={[styles.pickerHeader, themedStyles.pickerHeader]}>
        <Pressable onPress={onClose}>
          <Text style={[styles.cancelButton, { color: colors.textSecondary }]}>Cancel</Text>
        </Pressable>
        <Text style={[styles.pickerTitle, { color: colors.text }]}>Select Date</Text>
        <Pressable onPress={handleConfirm}>
          <Text style={[styles.confirmButton, { color: colors.primary }]}>Done</Text>
        </Pressable>
      </View>

      <View style={styles.pickerContent}>
        {/* Month */}
        <View style={styles.pickerColumn}>
          <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>Month</Text>
          <View style={[styles.scrollContainer, { backgroundColor: colors.surface }]}>
            {months.map((m, i) => (
              <Pressable
                key={m}
                style={[
                  styles.pickerItem,
                  i === month && { backgroundColor: colors.accent }
                ]}
                onPress={() => setMonth(i)}
              >
                <Text style={[
                  styles.pickerItemText,
                  { color: colors.text },
                  i === month && { color: colors.primary, fontWeight: '600' }
                ]}>
                  {m.slice(0, 3)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Day */}
        <View style={styles.pickerColumn}>
          <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>Day</Text>
          <View style={[styles.scrollContainer, { backgroundColor: colors.surface }]}>
            {days.map((d) => (
              <Pressable
                key={d}
                style={[
                  styles.pickerItem,
                  d === day && { backgroundColor: colors.accent }
                ]}
                onPress={() => setDay(d)}
              >
                <Text style={[
                  styles.pickerItemText,
                  { color: colors.text },
                  d === day && { color: colors.primary, fontWeight: '600' }
                ]}>
                  {d}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Year */}
        <View style={styles.pickerColumn}>
          <Text style={[styles.columnLabel, { color: colors.textSecondary }]}>Year</Text>
          <View style={[styles.scrollContainer, { backgroundColor: colors.surface }]}>
            {years.map((y) => (
              <Pressable
                key={y}
                style={[
                  styles.pickerItem,
                  y === year && { backgroundColor: colors.accent }
                ]}
                onPress={() => setYear(y)}
              >
                <Text style={[
                  styles.pickerItemText,
                  { color: colors.text },
                  y === year && { color: colors.primary, fontWeight: '600' }
                ]}>
                  {y}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export function FormDatePicker({
  label,
  value,
  onChange,
  error,
  touched = true,
  containerStyle,
  disabled = false,
  required = false,
  minDate,
  maxDate,
  placeholder = 'Select date',
}: FormDatePickerProps) {
  const { colors } = useThemeStore();
  const [isOpen, setIsOpen] = useState(false);
  const showError = touched && !!error;

  const formatDate = (date?: Date) => {
    if (!date) return placeholder;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

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
      >
        <Text style={[styles.dateIcon, { color: colors.textSecondary }]}>📅</Text>
        <Text
          style={[
            styles.triggerText,
            { color: value ? colors.text : colors.textMuted },
          ]}
        >
          {formatDate(value)}
        </Text>
      </Pressable>

      {showError && (
        <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
      )}

      <Modal
        visible={isOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsOpen(false)}
      >
        <SimpleDatePicker
          value={value ?? new Date()}
          onChange={onChange}
          minDate={minDate}
          maxDate={maxDate}
          onClose={() => setIsOpen(false)}
        />
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
  dateIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  triggerText: {
    flex: 1,
    fontSize: 16,
  },
  errorText: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  // Picker styles
  pickerContainer: {
    flex: 1,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    fontSize: 16,
  },
  confirmButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerContent: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  pickerColumn: {
    flex: 1,
  },
  columnLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  scrollContainer: {
    borderRadius: 12,
    maxHeight: 300,
  },
  pickerItem: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    margin: 2,
  },
  pickerItemText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

/**
 * Get themed styles based on current color scheme
 */
function getThemedStyles(colors: ThemeColors) {
  return StyleSheet.create({
    pickerHeader: {
      borderBottomColor: colors.border,
    },
  });
}
