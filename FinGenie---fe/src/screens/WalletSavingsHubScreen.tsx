import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from '../navigation/types';
import { tokens } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useI18n, type TranslationKey } from '../i18n/useI18n';
import { MonthlySavingPlanScreen } from './MonthlySavingPlanScreen';
import { SavingTargetsScreen } from './SavingTargetsScreen';
import { SavingActivityScreen } from './SavingActivityScreen';
import { DailyMissionsService } from '../services/DailyMissionsService';
import { useSavingsHubOnboardingStore } from '../store';

type HubTab = 'plan' | 'targets' | 'activity';
type WalletTabNav = BottomTabNavigationProp<MainTabParamList, 'Wallet'>;

const TABS: Array<{ key: HubTab; labelKey: TranslationKey }> = [
  { key: 'plan', labelKey: 'walletSavingsHub.plan' },
  { key: 'targets', labelKey: 'walletSavingsHub.targets' },
  { key: 'activity', labelKey: 'walletSavingsHub.activity' },
];

export function WalletSavingsHubScreen() {
  const navigation = useNavigation<WalletTabNav>();
  const route = useRoute<RouteProp<MainTabParamList, 'Wallet'>>();
  const { t } = useI18n();
  const { colors } = useThemeStore();
  const { hasSeenSavingsHubOnboarding, markSavingsHubOnboardingSeen } =
    useSavingsHubOnboardingStore();
  const themedStyles = getThemedStyles(colors);

  const [activeTab, setActiveTab] = useState<HubTab>(route.params?.initialTab ?? 'plan');
  const lastAppliedInitialTabRef = useRef<HubTab | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(
    !hasSeenSavingsHubOnboarding
  );

  useEffect(() => {
    const nextTab = route.params?.initialTab;
    if (!nextTab) {
      lastAppliedInitialTabRef.current = null;
      return;
    }

    if (nextTab !== lastAppliedInitialTabRef.current) {
      setActiveTab(nextTab);
      lastAppliedInitialTabRef.current = nextTab;
      navigation.setParams({ initialTab: undefined });
    }
  }, [navigation, route.params?.initialTab]);

  const handleSelectTab = (tab: HubTab) => {
    setActiveTab(tab);
    if (route.params?.initialTab) {
      navigation.setParams({ initialTab: undefined });
    }
  };

  useEffect(() => {
    DailyMissionsService.trackWalletTabOpen(activeTab);
  }, [activeTab]);

  useEffect(() => {
    void DailyMissionsService.syncFromBackend();
  }, []);

  useEffect(() => {
    setShowOnboarding(!hasSeenSavingsHubOnboarding);
  }, [hasSeenSavingsHubOnboarding]);

  const handleDismissOnboarding = () => {
    setShowOnboarding(false);
    markSavingsHubOnboardingSeen();
  };

  const content = useMemo(() => {
    if (activeTab === 'targets') {
      return <SavingTargetsScreen embedded />;
    }
    if (activeTab === 'activity') {
      return <SavingActivityScreen embedded />;
    }
    return <MonthlySavingPlanScreen embedded />;
  }, [activeTab]);

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
      <View style={[styles.segmentedWrap, themedStyles.segmentedWrap]}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              onPress={() => handleSelectTab(tab.key)}
              style={[
                styles.segmentButton,
                themedStyles.segmentButton,
                isActive && themedStyles.segmentButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  themedStyles.segmentLabel,
                  isActive && themedStyles.segmentLabelActive,
                ]}
              >
                {t(tab.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {showOnboarding ? (
        <View style={[styles.onboardingCard, themedStyles.onboardingCard]}>
          <Text style={[styles.onboardingTitle, themedStyles.onboardingTitle]}>
            {t('savingsOnboarding.title')}
          </Text>
          <View style={styles.onboardingBulletRow}>
            <Text style={[styles.onboardingBullet, themedStyles.onboardingBullet]}>•</Text>
            <Text style={[styles.onboardingBulletText, themedStyles.onboardingBulletText]}>
              {t('savingsOnboarding.plan')}
            </Text>
          </View>
          <View style={styles.onboardingBulletRow}>
            <Text style={[styles.onboardingBullet, themedStyles.onboardingBullet]}>•</Text>
            <Text style={[styles.onboardingBulletText, themedStyles.onboardingBulletText]}>
              {t('savingsOnboarding.targets')}
            </Text>
          </View>
          <View style={styles.onboardingBulletRow}>
            <Text style={[styles.onboardingBullet, themedStyles.onboardingBullet]}>•</Text>
            <Text style={[styles.onboardingBulletText, themedStyles.onboardingBulletText]}>
              {t('savingsOnboarding.activity')}
            </Text>
          </View>

          <Pressable
            onPress={handleDismissOnboarding}
            style={[styles.onboardingDismissButton, themedStyles.onboardingDismissButton]}
          >
            <Text style={[styles.onboardingDismissText, themedStyles.onboardingDismissText]}>
              {t('savingsOnboarding.dismiss')}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.content}>{content}</View>
    </SafeAreaView>
  );
}

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    segmentedWrap: {
      backgroundColor: colors.surface,
      borderBottomColor: colors.border,
    },
    segmentButton: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    segmentButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    segmentLabel: {
      color: colors.textSecondary,
    },
    segmentLabelActive: {
      color: colors.textOnPrimary ?? colors.text,
    },
    onboardingCard: {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.border,
    },
    onboardingTitle: {
      color: colors.text,
    },
    onboardingBullet: {
      color: colors.primary,
    },
    onboardingBulletText: {
      color: colors.textSecondary,
    },
    onboardingDismissButton: {
      backgroundColor: colors.primary,
    },
    onboardingDismissText: {
      color: colors.textOnPrimary ?? colors.text,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  segmentedWrap: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  segmentButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
  },
  segmentLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  content: {
    flex: 1,
  },
  onboardingCard: {
    marginHorizontal: tokens.spacing.md,
    marginTop: tokens.spacing.sm,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  onboardingTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  onboardingBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
  },
  onboardingBullet: {
    fontSize: tokens.typography.fontSizes.md,
    lineHeight: 20,
  },
  onboardingBulletText: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  onboardingDismissButton: {
    alignSelf: 'flex-start',
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
  },
  onboardingDismissText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});


