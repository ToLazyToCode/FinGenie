import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../theme';
import { useThemeStore, ThemeMode, useAccessibilitySettings } from '../store/themeStore';
import {
  useI18n,
  type Language,
  type TranslationKey,
} from '../i18n/useI18n';
import { Card } from '../components/ui';
import { LoadingButton, Skeleton } from '../components/form';
import { profileApi, UserSettingsResponse, UserSettingsRequest } from '../api/modules';
import { classifyAndDispatchError } from '../utils/errorHandling';
import { setNotificationPreference, showToast } from '../system';

type SettingsSectionProps = {
  title: string;
  children: React.ReactNode;
};

function SettingsSection({ title, children }: SettingsSectionProps) {
  const { isDark, colors } = useThemeStore();

  return (
    <View style={styles.section}>
      <Text
        style={[
          styles.sectionTitle,
          { color: colors.textSecondary },
        ]}
      >
        {title}
      </Text>
      <Card style={[styles.sectionCard, { backgroundColor: colors.surface }]}>{children}</Card>
    </View>
  );
}

type SettingsRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showArrow?: boolean;
  isLast?: boolean;
};

function SettingsRow({
  icon,
  label,
  value,
  onPress,
  rightElement,
  showArrow = false,
  isLast = false,
}: SettingsRowProps) {
  const { isDark, colors } = useThemeStore();

  const content = (
    <View style={[styles.settingsRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={styles.rowLeft}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
          <Ionicons
            name={icon}
            size={20}
            color={colors.text}
          />
        </View>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
      </View>
      <View style={styles.rowRight}>
        {value && (
          <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{value}</Text>
        )}
        {rightElement}
        {showArrow && (
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        )}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const THEME_OPTIONS: { labelKey: TranslationKey; value: ThemeMode; icon: keyof typeof Ionicons.glyphMap }[] = [
  { labelKey: 'settings.themeLight', value: 'light', icon: 'sunny-outline' },
  { labelKey: 'settings.themeDark', value: 'dark', icon: 'moon-outline' },
  { labelKey: 'settings.themeAmoled', value: 'amoled', icon: 'contrast-outline' },
  { labelKey: 'settings.themeHighContrast', value: 'highContrast', icon: 'eye-outline' },
  { labelKey: 'settings.themeSystem', value: 'system', icon: 'phone-portrait-outline' },
];

const LANGUAGE_OPTIONS: { value: Language; nativeLabelKey: TranslationKey }[] = [
  { value: 'en', nativeLabelKey: 'settings.english' },
  { value: 'vi', nativeLabelKey: 'settings.vietnamese' },
];

export function SettingsScreen() {
  const queryClient = useQueryClient();
  const { mode: theme, setMode: setTheme, isDark, colors } = useThemeStore();
  const { language, setLanguage, t } = useI18n();
  const { reduceMotion, setReduceMotion, largeText, setLargeText } = useAccessibilitySettings();
  const themedStyles = getThemedStyles(isDark, colors);

  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showLanguagePicker, setShowLanguagePicker] = useState(false);
  const notificationBootstrapRef = useRef(false);

  // Fetch settings from server
  const {
    data: settings,
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<UserSettingsResponse>({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data } = await profileApi.getSettings();
      return data;
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: UserSettingsRequest) => {
      return profileApi.updateSettings(data);
    },
    onMutate: async (newSettings) => {
      await queryClient.cancelQueries({ queryKey: ['settings'] });
      const previousSettings = queryClient.getQueryData<UserSettingsResponse>(['settings']);

      // Optimistically update
      queryClient.setQueryData<UserSettingsResponse>(['settings'], (old) => ({
        ...old!,
        ...newSettings,
      }));

      return { previousSettings };
    },
    onError: (error, _variables, context) => {
      if (context?.previousSettings) {
        queryClient.setQueryData(['settings'], context.previousSettings);
      }
      classifyAndDispatchError(error, {
        showAlert: true,
        alertTitle: t('settings.error'),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });

  const handleThemeChange = useCallback(
    (newTheme: ThemeMode) => {
      setTheme(newTheme);
      updateSettingsMutation.mutate({ darkModeEnabled: newTheme === 'dark' });
      setShowThemePicker(false);
    },
    [setTheme, updateSettingsMutation]
  );

  const handleLanguageChange = useCallback(
    (newLanguage: Language) => {
      setLanguage(newLanguage);
      updateSettingsMutation.mutate({ language: newLanguage });
      setShowLanguagePicker(false);
    },
    [setLanguage, updateSettingsMutation]
  );

  const handleToggleSetting = useCallback(
    async (key: keyof UserSettingsRequest, value: boolean) => {
      if (key === 'notificationsEnabled') {
        const runtimeResult = await setNotificationPreference(value, undefined, { silent: false });
        if (value && !runtimeResult.supported) {
          showToast(t('settings.notificationUnsupported'));
          updateSettingsMutation.mutate({ notificationsEnabled: false });
          return;
        }
        if (value && !runtimeResult.permissionGranted) {
          showToast(t('settings.notificationPermissionDenied'));
          updateSettingsMutation.mutate({ notificationsEnabled: false });
          return;
        }
        if (value && !runtimeResult.enabled) {
          showToast(t('settings.notificationEnableFailed'));
          updateSettingsMutation.mutate({ notificationsEnabled: false });
          return;
        }
      }

      updateSettingsMutation.mutate({ [key]: value });
    },
    [t, updateSettingsMutation]
  );

  const getCurrentThemeLabel = () => {
    const option = THEME_OPTIONS.find((o) => o.value === theme);
    return option ? t(option.labelKey) : t('settings.themeSystem');
  };

  const getCurrentLanguageLabel = () => {
    const option = LANGUAGE_OPTIONS.find((o) => o.value === language);
    return option ? t(option.nativeLabelKey) : t('settings.english');
  };

  useEffect(() => {
    if (!settings?.notificationsEnabled) {
      notificationBootstrapRef.current = false;
      return;
    }
    if (notificationBootstrapRef.current) {
      return;
    }
    notificationBootstrapRef.current = true;

    void setNotificationPreference(true, undefined, { silent: true }).then((runtimeResult) => {
      if (!runtimeResult.permissionGranted || !runtimeResult.enabled) {
        updateSettingsMutation.mutate({ notificationsEnabled: false });
      }
    });
  }, [settings?.notificationsEnabled, updateSettingsMutation]);

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.loadingContainer}>
            <Skeleton width="30%" height={16} style={styles.sectionSkeleton} />
            <Skeleton width="100%" height={150} style={styles.cardSkeleton} />
            <Skeleton width="30%" height={16} style={styles.sectionSkeleton} />
            <Skeleton width="100%" height={200} style={styles.cardSkeleton} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (error && !settings) {
    return (
      <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={[styles.errorText, themedStyles.errorText]}>{t('common.loadingError')}</Text>
          <LoadingButton
            title={t('common.retry')}
            onPress={() => refetch()}
            variant="outline"
            size="sm"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, themedStyles.title]}>{t('settings.title')}</Text>
        </View>

        {/* Appearance Section */}
        <SettingsSection title={t('settings.appearance')}>
          <SettingsRow
            icon="color-palette-outline"
            label={t('settings.theme')}
            value={getCurrentThemeLabel()}
            onPress={() => setShowThemePicker(!showThemePicker)}
            showArrow
          />
          {showThemePicker && (
            <View style={styles.pickerContainer}>
              {THEME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pickerOption,
                    theme === option.value && styles.pickerOptionSelected,
                    isDark && styles.pickerOptionDark,
                  ]}
                  onPress={() => handleThemeChange(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: theme === option.value }}
                >
                  <Ionicons
                    name={option.icon}
                    size={20}
                    color={
                      theme === option.value
                        ? colors.primary
                        : colors.text
                    }
                  />
                  <Text
                    style={[
                      styles.pickerOptionText,
                      isDark && styles.pickerOptionTextDark,
                      theme === option.value && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {t(option.labelKey)}
                  </Text>
                  {theme === option.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
          <SettingsRow
            icon="language-outline"
            label={t('settings.language')}
            value={getCurrentLanguageLabel()}
            onPress={() => setShowLanguagePicker(!showLanguagePicker)}
            showArrow
            isLast={!showLanguagePicker}
          />
          {showLanguagePicker && (
            <View style={[styles.pickerContainer, styles.pickerContainerLast]}>
              {LANGUAGE_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.pickerOption,
                    language === option.value && styles.pickerOptionSelected,
                    isDark && styles.pickerOptionDark,
                  ]}
                  onPress={() => handleLanguageChange(option.value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: language === option.value }}
                >
                  <Text
                    style={[
                      styles.pickerOptionText,
                      isDark && styles.pickerOptionTextDark,
                      language === option.value && styles.pickerOptionTextSelected,
                    ]}
                  >
                    {t(option.nativeLabelKey)}
                  </Text>
                  {language === option.value && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </SettingsSection>

        {/* Notifications Section */}
        <SettingsSection title={t('settings.notifications')}>
          <SettingsRow
            icon="notifications-outline"
            label={t('settings.pushNotifications')}
            rightElement={
              <Switch
                value={settings?.notificationsEnabled ?? true}
                onValueChange={(value) => handleToggleSetting('notificationsEnabled', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textOnPrimary}
              />
            }
          />
          <SettingsRow
            icon="wallet-outline"
            label={t('settings.budgetAlerts')}
            rightElement={
              <Switch
                value={settings?.budgetAlertsEnabled ?? true}
                onValueChange={(value) => handleToggleSetting('budgetAlertsEnabled', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textOnPrimary}
                disabled={!settings?.notificationsEnabled}
              />
            }
          />
          <SettingsRow
            icon="trophy-outline"
            label={t('settings.achievementAlerts')}
            rightElement={
              <Switch
                value={settings?.achievementAlertsEnabled ?? true}
                onValueChange={(value) => handleToggleSetting('achievementAlertsEnabled', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textOnPrimary}
                disabled={!settings?.notificationsEnabled}
              />
            }
          />
          <SettingsRow
            icon="people-outline"
            label={t('settings.friendRequestAlerts')}
            rightElement={
              <Switch
                value={settings?.friendRequestAlertsEnabled ?? true}
                onValueChange={(value) => handleToggleSetting('friendRequestAlertsEnabled', value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textOnPrimary}
                disabled={!settings?.notificationsEnabled}
              />
            }
            isLast
          />
        </SettingsSection>

        {/* Preferences Section */}
        <SettingsSection title={t('settings.preferences')}>
          <SettingsRow
            icon="cash-outline"
            label={t('settings.currency')}
            value={settings?.currency || 'VND'}
            onPress={() => {
              Alert.alert(t('common.comingSoon'), t('settings.currencyComingSoon'));
            }}
            showArrow
          />
          <SettingsRow
            icon="time-outline"
            label={t('settings.timezone')}
            value={settings?.timezone || 'Asia/Ho_Chi_Minh'}
            onPress={() => {
              Alert.alert(t('common.comingSoon'), t('settings.timezoneComingSoon'));
            }}
            showArrow
            isLast
          />
        </SettingsSection>

        {/* Accessibility Section */}
        <SettingsSection title={t('settings.accessibility')}>
          <SettingsRow
            icon="flash-off-outline"
            label={t('settings.reduceMotion')}
            rightElement={
              <Switch
                value={reduceMotion}
                onValueChange={setReduceMotion}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textOnPrimary}
                accessibilityLabel={t('settings.reduceMotionDescription')}
              />
            }
          />
          <SettingsRow
            icon="text-outline"
            label={t('settings.largeText')}
            rightElement={
              <Switch
                value={largeText}
                onValueChange={setLargeText}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.textOnPrimary}
                accessibilityLabel={t('settings.largeTextDescription')}
              />
            }
            isLast
          />
        </SettingsSection>

        {/* About Section */}
        <SettingsSection title={t('settings.about')}>
          <SettingsRow
            icon="information-circle-outline"
            label={t('settings.version')}
            value="1.0.0"
          />
          <SettingsRow
            icon="document-text-outline"
            label={t('settings.termsOfService')}
            onPress={() => {
              Alert.alert(t('common.comingSoon'), t('settings.termsComingSoon'));
            }}
            showArrow
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            label={t('settings.privacyPolicy')}
            onPress={() => {
              Alert.alert(t('common.comingSoon'), t('settings.privacyComingSoon'));
            }}
            showArrow
            isLast
          />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  header: {
    marginBottom: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  section: {
    marginBottom: tokens.spacing.lg,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
    textTransform: 'uppercase',
    marginBottom: tokens.spacing.sm,
    marginLeft: tokens.spacing.sm,
  },
  sectionCard: {
    padding: 0,
    overflow: 'hidden',
  },
  sectionCardDark: {
    // Dark mode handled by themed colors
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
  },
  settingsRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: `${tokens.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.sm,
  },
  iconContainerDark: {
    backgroundColor: `${tokens.colors.primary}25`,
  },
  rowLabel: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.text,
  },
  rowLabelDark: {
    // Dark mode handled by themed colors
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  rowValue: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.textSecondary,
    marginRight: tokens.spacing.xs,
  },
  rowValueDark: {
    // Dark mode handled by themed colors
  },
  pickerContainer: {
    borderTopWidth: 1,
    borderTopColor: tokens.colors.border,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
  },
  pickerContainerLast: {
    borderBottomWidth: 0,
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    marginVertical: 2,
    gap: tokens.spacing.sm,
  },
  pickerOptionDark: {
    // Dark mode handled by themed colors
  },
  pickerOptionSelected: {
    backgroundColor: `${tokens.colors.primary}15`,
  },
  pickerOptionText: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.text,
  },
  pickerOptionTextDark: {
    // Dark mode handled by themed colors
  },
  pickerOptionTextSelected: {
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  // Loading states
  loadingContainer: {
    padding: tokens.spacing.md,
  },
  sectionSkeleton: {
    marginBottom: tokens.spacing.sm,
  },
  cardSkeleton: {
    marginBottom: tokens.spacing.lg,
  },
  // Error state
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.md,
  },
  errorText: {
    fontSize: tokens.typography.fontSizes.md,
    marginVertical: tokens.spacing.md,
    textAlign: 'center',
  },
});

const getThemedStyles = (isDark: boolean, colors: typeof import('../store/themeStore').lightColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    title: {
      color: colors.text,
    },
    errorText: {
      color: colors.text,
    },
  });
