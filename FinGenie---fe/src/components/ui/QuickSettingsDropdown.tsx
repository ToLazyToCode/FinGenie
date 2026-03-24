import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { tokens } from '../../theme';
import { useI18n } from '../../i18n/useI18n';
import { useThemeStore, type ThemeMode } from '../../store/themeStore';

interface QuickSettingsDropdownProps {
  top?: number;
  right?: number;
}

const THEME_OPTIONS: ThemeMode[] = ['light', 'dark', 'system'];
const LANGUAGE_OPTIONS: Array<'en' | 'vi'> = ['en', 'vi'];

export function QuickSettingsDropdown({ top = 8, right = 16 }: QuickSettingsDropdownProps) {
  const { colors, mode, setMode } = useThemeStore();
  const { language, setLanguage, t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);

  const themeLabelByMode: Record<ThemeMode, string> = {
    light: t('settings.themeLight'),
    dark: t('settings.themeDark'),
    system: t('settings.themeSystem'),
    amoled: t('settings.themeAmoled'),
    highContrast: t('settings.themeHighContrast'),
  };

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={[
          styles.trigger,
          {
            top,
            right,
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={styles.triggerIcon}>⚙</Text>
        <Text style={[styles.triggerText, { color: colors.text }]}>{t('settings.title')}</Text>
      </Pressable>

      <Modal transparent visible={isOpen} animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <Pressable style={[styles.overlay, { backgroundColor: colors.overlay }]} onPress={() => setIsOpen(false)}>
          <Pressable
            style={[
              styles.dropdownCard,
              {
                top: top + 44,
                right,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => {}}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('settings.theme')}</Text>
            <View style={styles.optionWrap}>
              {THEME_OPTIONS.map((option) => {
                const selected = mode === option;
                return (
                  <Pressable
                    key={option}
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor: selected ? colors.primary : colors.backgroundSecondary,
                      },
                    ]}
                    onPress={() => setMode(option)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: selected ? colors.textOnPrimary ?? colors.text : colors.text,
                        },
                      ]}
                    >
                      {themeLabelByMode[option]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={[styles.sectionTitle, styles.languageTitle, { color: colors.text }]}>{t('settings.language')}</Text>
            <View style={styles.optionWrap}>
              {LANGUAGE_OPTIONS.map((option) => {
                const selected = language === option;
                return (
                  <Pressable
                    key={option}
                    style={[
                      styles.optionButton,
                      {
                        backgroundColor: selected ? colors.primary : colors.backgroundSecondary,
                      },
                    ]}
                    onPress={() => setLanguage(option)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        {
                          color: selected ? colors.textOnPrimary ?? colors.text : colors.text,
                        },
                      ]}
                    >
                      {option === 'vi' ? t('settings.vietnamese') : t('settings.english')}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    position: 'absolute',
    zIndex: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.full,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  triggerIcon: {
    fontSize: 13,
  },
  triggerText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  overlay: {
    flex: 1,
  },
  dropdownCard: {
    position: 'absolute',
    width: 220,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
    marginBottom: tokens.spacing.xs,
  },
  languageTitle: {
    marginTop: tokens.spacing.sm,
  },
  optionWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
  },
  optionButton: {
    borderRadius: tokens.borderRadius.full,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  optionText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});
