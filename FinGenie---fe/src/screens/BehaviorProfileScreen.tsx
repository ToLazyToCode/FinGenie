import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { tokens } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import type { AppStackParamList, MandatorySurveyStackParamList } from '../navigation/types';
import {
  useBehaviorInsights,
  useBehaviorProfile,
  useSurveyStatus,
} from '../hooks';

type ProfileNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<MandatorySurveyStackParamList>,
  NativeStackNavigationProp<AppStackParamList>
>;

function formatScore(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) {
    return '-';
  }
  return String(Math.round(Number(value)));
}

export function BehaviorProfileScreen() {
  const navigation = useNavigation<ProfileNavigation>();
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const themedStyles = useMemo(() => getThemedStyles(colors), [colors]);

  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
    refetch: refetchStatus,
  } = useSurveyStatus();

  const canLoadProfile = Boolean(status?.hasCompletedSurvey);

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useBehaviorProfile(canLoadProfile);

  const {
    data: insights,
    isLoading: insightsLoading,
    isError: insightsError,
    refetch: refetchInsights,
  } = useBehaviorInsights(canLoadProfile);

  const hasCompletedSurvey = Boolean(status?.hasCompletedSurvey);
  const availableRoutes = navigation.getState().routeNames as string[];
  const canOpenPetChat = availableRoutes.includes('PetChat');
  const canOpenMainTabs = availableRoutes.includes('MainTabs');
  const chatCtaLabel = t('behavior.openAiCompanion');

  if (statusLoading || (canLoadProfile && profileLoading)) {
    return (
      <SafeAreaView style={[styles.centerContainer, themedStyles.container]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, themedStyles.mutedText]}>{t('behavior.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (statusError) {
    return (
      <SafeAreaView style={[styles.centerContainer, themedStyles.container]}>
        <Text style={[styles.errorText, themedStyles.errorText]}>{t('common.loadingError')}</Text>
        <Pressable
          style={[styles.primaryButton, themedStyles.primaryButton]}
          onPress={() => {
            void refetchStatus();
          }}
        >
          <Text style={[styles.primaryButtonText, themedStyles.primaryButtonText]}>{t('common.retry')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!hasCompletedSurvey) {
    return (
      <SafeAreaView style={[styles.centerContainer, themedStyles.container]}>
        <Text style={[styles.title, themedStyles.title]}>{t('behavior.completeSurveyTitle')}</Text>
        <Text style={[styles.subtitle, themedStyles.mutedText]}>{t('behavior.completeSurveySubtitle')}</Text>
        <Pressable
          style={[styles.primaryButton, themedStyles.primaryButton]}
          onPress={() => navigation.navigate('BehaviorSurvey')}
        >
          <Text style={[styles.primaryButtonText, themedStyles.primaryButtonText]}>{t('behavior.completeSurveyCta')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (profileError || !profile) {
    return (
      <SafeAreaView style={[styles.centerContainer, themedStyles.container]}>
        <Text style={[styles.title, themedStyles.title]}>{t('behavior.profilePendingTitle')}</Text>
        <Text style={[styles.subtitle, themedStyles.mutedText]}>{t('behavior.profilePendingSubtitle')}</Text>
        <Pressable
          style={[styles.primaryButton, themedStyles.primaryButton]}
          onPress={() => {
            void refetchProfile();
            void refetchInsights();
          }}
        >
          <Text style={[styles.primaryButtonText, themedStyles.primaryButtonText]}>{t('common.retry')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  const topActions = (insights?.recommendations ?? []).slice(0, 3);
  const topFactors = (profile.topFactors ?? []).slice(0, 3);
  const riskLevel = profile.riskLevel || insights?.riskLevel || t('behavior.unknown');

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, themedStyles.title]}>{t('behavior.profileTitle')}</Text>
        <Text style={[styles.subtitle, themedStyles.mutedText]}>{profile.segmentDisplayName}</Text>

        <View style={[styles.card, themedStyles.card]}>
          <Text style={[styles.cardTitle, themedStyles.title]}>{t('behavior.riskLevel')}</Text>
          <Text style={[styles.riskValue, themedStyles.riskValue]}>{riskLevel}</Text>
          <Text style={[styles.cardBody, themedStyles.mutedText]}>{profile.segmentDescription}</Text>
        </View>

        <View style={[styles.card, themedStyles.card]}>
          <Text style={[styles.cardTitle, themedStyles.title]}>{t('behavior.scoreSummary')}</Text>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreLabel, themedStyles.mutedText]}>{t('behavior.overspending')}</Text>
            <Text style={[styles.scoreValue, themedStyles.title]}>{formatScore(profile.overspendingScore)}</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreLabel, themedStyles.mutedText]}>{t('behavior.debtRisk')}</Text>
            <Text style={[styles.scoreValue, themedStyles.title]}>{formatScore(profile.debtRiskScore)}</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreLabel, themedStyles.mutedText]}>{t('behavior.savingCapacity')}</Text>
            <Text style={[styles.scoreValue, themedStyles.title]}>{formatScore(profile.savingsCapacityScore)}</Text>
          </View>
          <View style={styles.scoreRow}>
            <Text style={[styles.scoreLabel, themedStyles.mutedText]}>{t('behavior.anxiety')}</Text>
            <Text style={[styles.scoreValue, themedStyles.title]}>{formatScore(profile.financialAnxietyIndex)}</Text>
          </View>
        </View>

        <View style={[styles.card, themedStyles.card]}>
          <Text style={[styles.cardTitle, themedStyles.title]}>{t('behavior.topFactors')}</Text>
          {topFactors.length > 0 ? (
            topFactors.map((factor) => (
              <Text key={factor} style={[styles.listItem, themedStyles.mutedText]}>
                • {factor}
              </Text>
            ))
          ) : (
            <Text style={[styles.cardBody, themedStyles.mutedText]}>{t('common.noData')}</Text>
          )}
        </View>

        <View style={[styles.card, themedStyles.card]}>
          <Text style={[styles.cardTitle, themedStyles.title]}>{t('behavior.recommendedActions')}</Text>
          {insightsLoading ? (
            <Text style={[styles.cardBody, themedStyles.mutedText]}>{t('common.loading')}</Text>
          ) : insightsError ? (
            <Text style={[styles.cardBody, themedStyles.mutedText]}>{t('behavior.insightsUnavailable')}</Text>
          ) : topActions.length > 0 ? (
            topActions.map((action) => (
              <View key={`${action.priority}-${action.title}`} style={styles.actionRow}>
                <Text style={[styles.actionTitle, themedStyles.title]}>{action.title}</Text>
                <Text style={[styles.actionDesc, themedStyles.mutedText]}>{action.description}</Text>
              </View>
            ))
          ) : (
            <Text style={[styles.cardBody, themedStyles.mutedText]}>{t('common.noData')}</Text>
          )}
        </View>

        {canOpenPetChat || canOpenMainTabs ? (
          <>
            <View style={styles.ctaRow}>
              {canOpenPetChat ? (
                <Pressable
                  style={[styles.primaryButton, themedStyles.primaryButton, styles.flexButton]}
                  onPress={() => navigation.navigate('PetChat')}
                >
                  <Text style={[styles.primaryButtonText, themedStyles.primaryButtonText]}>
                    {chatCtaLabel}
                  </Text>
                </Pressable>
              ) : null}

              {canOpenMainTabs ? (
                <Pressable
                  style={[styles.secondaryButton, themedStyles.secondaryButton, styles.flexButton]}
                  onPress={() =>
                    navigation.navigate('MainTabs', {
                      screen: 'Wallet',
                      params: { initialTab: 'plan' },
                    })
                  }
                >
                  <Text style={[styles.secondaryButtonText, themedStyles.secondaryButtonText]}>
                    {t('behavior.improveSavingPlan')}
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {canOpenMainTabs ? (
              <Pressable
                style={[styles.secondaryButton, themedStyles.secondaryButton]}
                onPress={() =>
                  navigation.navigate('MainTabs', {
                    screen: 'Wallet',
                    params: { initialTab: 'targets' },
                  })
                }
              >
                <Text style={[styles.secondaryButtonText, themedStyles.secondaryButtonText]}>
                  {t('behavior.viewSavingTargets')}
                </Text>
              </Pressable>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    title: {
      color: colors.text,
    },
    mutedText: {
      color: colors.textSecondary,
    },
    errorText: {
      color: colors.error,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    primaryButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    secondaryButton: {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.text,
    },
    riskValue: {
      color: colors.primary,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  content: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.md,
  },
  loadingText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  errorText: {
    fontSize: tokens.typography.fontSizes.sm,
    textAlign: 'center',
  },
  card: {
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  cardTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  cardBody: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  riskValue: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreLabel: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  scoreValue: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  listItem: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  actionRow: {
    gap: tokens.spacing.xs,
  },
  actionTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  actionDesc: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  flexButton: {
    flex: 1,
  },
  primaryButton: {
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
    textAlign: 'center',
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
    textAlign: 'center',
  },
});
