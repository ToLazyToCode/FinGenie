import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui';
import {
  aiApi,
  type MonthlySavingPlanAdviceResponse,
  type MonthlySavingPlanResponse,
} from '../api/modules';
import { savingsKeys } from '../queryKeys/savings.keys';
import { tokens } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import { useAutoAllocateStore } from '../store/autoAllocateStore';
import { AutoAllocateService } from '../services/AutoAllocateService';

type PlanMode = 'base' | 'optimized';

function formatMoney(value: number | null | undefined, formatter: Intl.NumberFormat): string {
  if (value == null || Number.isNaN(Number(value))) {
    return '0';
  }
  return formatter.format(Number(value));
}

function getAdvisorBadgeColor(source: string, colors: ReturnType<typeof useThemeStore>['colors']) {
  if (source === 'python') {
    return colors.success;
  }
  return colors.warning;
}

interface MonthlySavingPlanScreenProps {
  embedded?: boolean;
}

export function MonthlySavingPlanScreen({ embedded = false }: MonthlySavingPlanScreenProps) {
  const shouldRenderHeader = embedded === false;
  const [mode, setMode] = useState<PlanMode>('base');
  const [adviceResponse, setAdviceResponse] = useState<MonthlySavingPlanAdviceResponse | null>(null);
  const [isAutoAllocateSyncing, setAutoAllocateSyncing] = useState(false);
  const { t, language, locale } = useI18n();
  const { autoAllocateOnSalary } = useAutoAllocateStore();
  const { colors } = useThemeStore();
  const themedStyles = getThemedStyles(colors);

  useEffect(() => {
    let isMounted = true;
    setAutoAllocateSyncing(true);
    AutoAllocateService.loadPolicy().finally(() => {
      if (isMounted) {
        setAutoAllocateSyncing(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleAutoAllocateToggle = async (enabled: boolean) => {
    if (isAutoAllocateSyncing) {
      return;
    }
    setAutoAllocateSyncing(true);
    await AutoAllocateService.savePolicy(enabled, t);
    setAutoAllocateSyncing(false);
  };

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  const queryMode: PlanMode = mode === 'optimized' ? 'optimized' : 'base';
  const modeParam = queryMode === 'optimized' ? 'optimized' : undefined;

  const {
    data: plan,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<MonthlySavingPlanResponse>({
    queryKey: savingsKeys.monthlySavingPlan(queryMode),
    queryFn: async () => {
      const response = await aiApi.monthlyPlan.getPlan(modeParam);
      return response.data;
    },
  });

  const adviceMutation = useMutation({
    mutationFn: async () => {
      const response = await aiApi.monthlyPlan.getAdvice(language);
      return response.data;
    },
    onSuccess: (data) => setAdviceResponse(data),
  });

  const suggestions = useMemo(() => {
    const fromApi = adviceResponse?.advice?.actionableSuggestions ?? [];
    const fallback = [
      t('savingPlan.fallback.one'),
      t('savingPlan.fallback.two'),
      t('savingPlan.fallback.three'),
    ];
    return [...fromApi, ...fallback].slice(0, 3);
  }, [adviceResponse, t]);

  const riskWarnings = adviceResponse?.advice?.riskWarnings ?? [];

  const sourceLabel = useMemo(() => {
    const source = adviceResponse?.advisorSource;
    if (source === 'python') {
      return t('savingPlan.advice.source.python');
    }
    if (source === 'fallback') {
      return t('savingPlan.advice.source.fallback');
    }
    return t('savingPlan.advice.source.unknown');
  }, [adviceResponse?.advisorSource, t]);

  const failureMetaText = useMemo(() => {
    const failure = adviceResponse?.failure;
    if (!failure) {
      return null;
    }

    const reason = failure.reasonType || t('savingPlan.failure.unknownReason');
    const path = failure.path || '/ai/saving-plan/advice';
    const elapsed = failure.elapsedMs != null ? `${failure.elapsedMs}ms` : t('savingPlan.failure.unknownElapsed');
    const timeout = failure.timeoutMs != null ? `${failure.timeoutMs}ms` : null;
    const timeoutPart = timeout ? `, timeout ${timeout}` : '';

    return t('savingPlan.failure.message')
      .replace('{reason}', reason)
      .replace('{path}', path)
      .replace('{elapsed}', elapsed)
      .replace('{timeoutPart}', timeoutPart);
  }, [adviceResponse?.failure, t]);

  const typeLabel = (type: string) => {
    if (type === 'GOAL') {
      return t('savingPlan.type.goal');
    }
    if (type === 'PIGGY') {
      return t('savingPlan.type.piggy');
    }
    return type;
  };

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={embedded ? ['bottom'] : ['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {shouldRenderHeader ? (
          <View style={styles.header}>
            <Text style={[styles.title, themedStyles.title]}>{t('savingPlan.title')}</Text>
            <Text style={[styles.subtitle, themedStyles.subtitle]}>
              {t('savingPlan.subtitle')}
            </Text>
          </View>
        ) : null}

        {shouldRenderHeader ? (
          <Card>
            <View style={styles.autoAllocateRow}>
              <View style={styles.autoAllocateTextWrap}>
                <Text style={[styles.autoAllocateTitle, themedStyles.autoAllocateTitle]}>
                  {t('autoAllocate.title')}
                </Text>
                <Text style={[styles.autoAllocateSubtitle, themedStyles.autoAllocateSubtitle]}>
                  {t('autoAllocate.subtitle')}
                </Text>
              </View>
              <Switch
                value={autoAllocateOnSalary}
                onValueChange={(enabled) => {
                  void handleAutoAllocateToggle(enabled);
                }}
                disabled={isAutoAllocateSyncing}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={autoAllocateOnSalary ? (colors.textOnPrimary ?? colors.surface) : colors.surface}
                ios_backgroundColor={colors.border}
              />
            </View>
          </Card>
        ) : null}

        <View style={styles.modeToggle}>
          <Pressable
            onPress={() => setMode('base')}
            style={[
              styles.modeButton,
              themedStyles.modeButton,
              mode === 'base' && themedStyles.modeButtonActive,
            ]}
          >
            <Text
              style={[
                styles.modeButtonText,
                themedStyles.modeButtonText,
                mode === 'base' && themedStyles.modeButtonTextActive,
              ]}
            >
              {t('savingPlan.mode.base')}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setMode('optimized')}
            style={[
              styles.modeButton,
              themedStyles.modeButton,
              mode === 'optimized' && themedStyles.modeButtonActive,
            ]}
          >
            <Text
              style={[
                styles.modeButtonText,
                themedStyles.modeButtonText,
                mode === 'optimized' && themedStyles.modeButtonTextActive,
              ]}
            >
              {t('savingPlan.mode.optimized')}
            </Text>
          </Pressable>
        </View>

        {isLoading ? (
          <Card>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, themedStyles.subtitle]}>{t('common.loading')}</Text>
            </View>
          </Card>
        ) : (
          <>
            <Card style={styles.summaryCard}>
              <Text style={[styles.sectionTitle, themedStyles.sectionTitle]}>{t('savingPlan.summary.title')}</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, themedStyles.summaryLabel]}>{t('savingPlan.summary.savingCapacity')}</Text>
                  <Text style={[styles.summaryValue, themedStyles.summaryValue]}>
                    {formatMoney(plan?.savingCapacity, numberFormatter)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, themedStyles.summaryLabel]}>{t('savingPlan.summary.totalRequired')}</Text>
                  <Text style={[styles.summaryValue, themedStyles.summaryValue]}>
                    {formatMoney(plan?.totalRequired, numberFormatter)}
                  </Text>
                </View>
                <View style={styles.summaryItem}>
                  <Text style={[styles.summaryLabel, themedStyles.summaryLabel]}>{t('savingPlan.summary.feasibility')}</Text>
                  <Text style={[styles.summaryValue, themedStyles.summaryValue]}>
                    {formatMoney(plan?.overallFeasibilityScore, numberFormatter)}%
                  </Text>
                </View>
              </View>
            </Card>

            <Card>
              <Text style={[styles.sectionTitle, themedStyles.sectionTitle]}>{t('savingPlan.allocations.title')}</Text>
              {plan?.allocations?.length ? (
                plan.allocations.map((item) => (
                  <View key={`${item.type}-${item.id}`} style={[styles.allocationItem, themedStyles.divider]}>
                    <View style={styles.allocationHeader}>
                      <Text style={[styles.allocationTitle, themedStyles.title]}>{item.title}</Text>
                      <View style={[styles.typeBadge, themedStyles.typeBadge]}>
                        <Text style={[styles.typeBadgeText, themedStyles.typeBadgeText]}>{typeLabel(item.type)}</Text>
                      </View>
                    </View>
                    <Text style={[styles.allocationLine, themedStyles.subtitle]}>
                      {t('savingPlan.allocations.required')}: {formatMoney(item.requiredMonthly, numberFormatter)} | {t('savingPlan.allocations.allocated')}: {formatMoney(item.allocatedMonthly, numberFormatter)}
                    </Text>
                    <Text style={[styles.allocationLine, themedStyles.subtitle]}>
                      {t('savingPlan.allocations.feasibility')}: {formatMoney(item.feasibilityScore, numberFormatter)}%
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, themedStyles.subtitle]}>{t('savingPlan.allocations.empty')}</Text>
              )}
            </Card>

            {mode === 'optimized' && (
              <>
                <Card>
                  <Text style={[styles.sectionTitle, themedStyles.sectionTitle]}>{t('savingPlan.recommendations.title')}</Text>
                  {plan?.recommendations?.length ? (
                    plan.recommendations.map((item, idx) => (
                      <View key={`${item.type}-${idx}`} style={[styles.listItem, themedStyles.divider]}>
                        <Text style={[styles.listTitle, themedStyles.title]}>{item.type}</Text>
                        <Text style={[styles.listText, themedStyles.subtitle]}>{item.message}</Text>
                        <Text style={[styles.listImpact, themedStyles.summaryLabel]}>
                          {t('savingPlan.recommendations.impactMonthly')}: {formatMoney(item.impactMonthly, numberFormatter)}
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptyText, themedStyles.subtitle]}>{t('savingPlan.recommendations.empty')}</Text>
                  )}
                </Card>

                <Card>
                  <Text style={[styles.sectionTitle, themedStyles.sectionTitle]}>{t('savingPlan.whatIf.title')}</Text>
                  {plan?.whatIfScenarios?.length ? (
                    plan.whatIfScenarios.map((item, idx) => (
                      <View key={`${item.assumption}-${idx}`} style={[styles.listItem, themedStyles.divider]}>
                        <Text style={[styles.listText, themedStyles.title]}>{item.assumption}</Text>
                        <Text style={[styles.listText, themedStyles.subtitle]}>
                          {t('savingPlan.whatIf.newSavingCapacity')}: {formatMoney(item.newSavingCapacity, numberFormatter)}
                        </Text>
                        <Text style={[styles.listText, themedStyles.subtitle]}>
                          {t('savingPlan.whatIf.newFeasibility')}: {formatMoney(item.newFeasibilityScore, numberFormatter)}%
                        </Text>
                      </View>
                    ))
                  ) : (
                    <Text style={[styles.emptyText, themedStyles.subtitle]}>{t('savingPlan.whatIf.empty')}</Text>
                  )}
                </Card>
              </>
            )}
          </>
        )}

        <Pressable
          onPress={() => adviceMutation.mutate()}
          style={({ pressed }) => [
            styles.adviceButton,
            { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
          ]}
          disabled={adviceMutation.isPending}
        >
          {adviceMutation.isPending ? (
            <ActivityIndicator color={colors.textOnPrimary ?? colors.text} />
          ) : (
            <Text style={[styles.adviceButtonText, themedStyles.adviceButtonText]}>
              {t('savingPlan.advice.button')}
            </Text>
          )}
        </Pressable>

        {adviceResponse && (
          <Card>
            <View style={styles.adviceHeader}>
              <Text style={[styles.sectionTitle, themedStyles.sectionTitle]}>{t('savingPlan.advice.title')}</Text>
              <View
                style={[
                  styles.advisorBadge,
                  { backgroundColor: getAdvisorBadgeColor(adviceResponse.advisorSource, colors) },
                ]}
              >
                <Text style={[styles.advisorBadgeText, themedStyles.advisorBadgeText]}>{sourceLabel}</Text>
              </View>
            </View>

            <Text style={[styles.adviceSummary, themedStyles.title]}>{adviceResponse.advice.shortSummary}</Text>

            <Text style={[styles.adviceSubTitle, themedStyles.sectionTitle]}>{t('savingPlan.advice.topActions')}</Text>
            {suggestions.map((tip, idx) => (
              <Text key={`${tip}-${idx}`} style={[styles.listText, themedStyles.subtitle]}>
                {idx + 1}. {tip}
              </Text>
            ))}

            {!!riskWarnings.length && (
              <>
                <Text style={[styles.adviceSubTitle, themedStyles.sectionTitle]}>{t('savingPlan.advice.riskWarnings')}</Text>
                {riskWarnings.map((warning, idx) => (
                  <Text key={`${warning}-${idx}`} style={[styles.warningText, themedStyles.warningText]}>
                    - {warning}
                  </Text>
                ))}
              </>
            )}

            {failureMetaText ? (
              <Text style={[styles.failureMetaText, themedStyles.failureMetaText]}>{failureMetaText}</Text>
            ) : null}

            <Text style={[styles.friendlyTone, themedStyles.subtitle]}>
              {adviceResponse.advice.friendlyTone}
            </Text>
          </Card>
        )}

        <Pressable onPress={() => refetch()} style={styles.refreshLink}>
          <Text style={[styles.refreshText, { color: colors.primary }]}>
            {isFetching ? t('savingPlan.refresh.loading') : t('savingPlan.refresh.default')}
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    title: {
      color: colors.text,
    },
    subtitle: {
      color: colors.textSecondary,
    },
    sectionTitle: {
      color: colors.text,
    },
    summaryLabel: {
      color: colors.textMuted,
    },
    summaryValue: {
      color: colors.text,
    },
    divider: {
      borderBottomColor: colors.border,
    },
    modeButton: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    modeButtonActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    modeButtonText: {
      color: colors.text,
    },
    modeButtonTextActive: {
      color: colors.textOnPrimary ?? colors.text,
    },
    typeBadge: {
      backgroundColor: colors.backgroundSecondary,
    },
    typeBadgeText: {
      color: colors.textSecondary,
    },
    adviceButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    advisorBadgeText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    warningText: {
      color: colors.warning,
    },
    failureMetaText: {
      color: colors.textMuted,
    },
    autoAllocateTitle: {
      color: colors.text,
    },
    autoAllocateSubtitle: {
      color: colors.textSecondary,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
    gap: tokens.spacing.md,
  },
  header: {
    marginBottom: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    marginTop: tokens.spacing.xs,
    lineHeight: 20,
  },
  autoAllocateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.md,
  },
  autoAllocateTextWrap: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  autoAllocateTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  autoAllocateSubtitle: {
    fontSize: tokens.typography.fontSizes.xs,
    lineHeight: 18,
  },
  modeToggle: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  loadingText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  summaryCard: {
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.sm,
  },
  summaryGrid: {
    gap: tokens.spacing.sm,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  summaryValue: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  allocationItem: {
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  allocationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.xs,
    gap: tokens.spacing.sm,
  },
  allocationTitle: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  typeBadge: {
    borderRadius: tokens.borderRadius.full,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
  },
  typeBadgeText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  allocationLine: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  listItem: {
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: tokens.spacing.xs,
  },
  listTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  listText: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  listImpact: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  emptyText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontStyle: 'italic',
    paddingVertical: tokens.spacing.sm,
  },
  adviceButton: {
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adviceButtonText: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  adviceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.sm,
  },
  advisorBadge: {
    borderRadius: tokens.borderRadius.full,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
  },
  advisorBadgeText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.bold,
    textTransform: 'uppercase',
  },
  adviceSummary: {
    fontSize: tokens.typography.fontSizes.md,
    lineHeight: 22,
    marginBottom: tokens.spacing.sm,
  },
  adviceSubTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs,
  },
  warningText: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  failureMetaText: {
    marginTop: tokens.spacing.sm,
    fontSize: tokens.typography.fontSizes.xs,
    lineHeight: 18,
  },
  friendlyTone: {
    marginTop: tokens.spacing.md,
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  refreshLink: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
  },
  refreshText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});


