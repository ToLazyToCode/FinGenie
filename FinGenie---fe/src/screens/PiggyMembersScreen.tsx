import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui';
import { piggiesApi, type PiggyMemberResponse } from '../api/modules';
import { savingsKeys } from '../queryKeys/savings.keys';
import type { AppStackParamList } from '../navigation/types';
import { authStore } from '../store';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import { tokens } from '../theme';

const SHARE_WEIGHT_MIN = 1;
const SHARE_WEIGHT_MAX = 5;
const SHARE_WEIGHT_VALUES = [1, 2, 3, 4, 5] as const;

interface MemberDraft {
  shareWeight: number;
  monthlyCommitmentInput: string;
}

interface SaveMemberVariables {
  memberId: number;
  shareWeight: number;
  monthlyCommitment: number;
  patchShareWeight: boolean;
  patchMonthlyCommitment: boolean;
}

interface SaveMemberContext {
  previousMembers?: PiggyMemberResponse[];
}

function clampShareWeight(value: number): number {
  if (!Number.isFinite(value)) {
    return SHARE_WEIGHT_MIN;
  }
  return Math.max(SHARE_WEIGHT_MIN, Math.min(SHARE_WEIGHT_MAX, Math.round(value)));
}

function sanitizeMoneyInput(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function parseMonthlyCommitment(value: string): number {
  if (!value.trim()) {
    return 0;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }
  return parsed;
}

function toCommitmentInput(value: number | null | undefined): string {
  const normalized = Number(value ?? 0);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return '';
  }
  return String(Math.round(normalized));
}

type PiggyMembersRoute = RouteProp<AppStackParamList, 'PiggyMembers'>;

export function PiggyMembersScreen() {
  const route = useRoute<PiggyMembersRoute>();
  const queryClient = useQueryClient();
  const { colors } = useThemeStore();
  const { t, locale } = useI18n();
  const currentAccountId = authStore((state) => state.user?.accountId ?? null);
  const themedStyles = getThemedStyles(colors);

  const piggyId = route.params?.piggyId;
  const queryKey = useMemo(() => savingsKeys.piggyMembers(piggyId), [piggyId]);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }),
    [locale]
  );

  const [drafts, setDrafts] = useState<Record<number, MemberDraft>>({});
  const [savingMemberId, setSavingMemberId] = useState<number | null>(null);

  const {
    data: members = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<PiggyMemberResponse[]>({
    queryKey,
    queryFn: async () => {
      if (!piggyId) {
        throw new Error(t('piggyMembers.invalidPiggy'));
      }
      const response = await piggiesApi.getMembers(piggyId);
      return response.data;
    },
    enabled: Boolean(piggyId),
  });

  useEffect(() => {
    const nextDrafts: Record<number, MemberDraft> = {};
    members.forEach((member) => {
      nextDrafts[member.id] = {
        shareWeight: clampShareWeight(member.shareWeight),
        monthlyCommitmentInput: toCommitmentInput(member.monthlyCommitment),
      };
    });
    setDrafts(nextDrafts);
  }, [members]);

  const currentMember = useMemo(
    () => members.find((member) => member.accountId === currentAccountId),
    [members, currentAccountId]
  );
  const isOwner = (currentMember?.role ?? '').toUpperCase() === 'OWNER';

  const saveMutation = useMutation<void, Error, SaveMemberVariables, SaveMemberContext>({
    mutationFn: async (variables) => {
      if (!piggyId) {
        throw new Error(t('piggyMembers.invalidPiggy'));
      }

      if (variables.patchShareWeight) {
        await piggiesApi.updateShareWeight(piggyId, variables.memberId, {
          shareWeight: variables.shareWeight,
        });
      }

      if (variables.patchMonthlyCommitment) {
        await piggiesApi.updateMonthlyCommitment(piggyId, variables.memberId, {
          monthlyCommitment: variables.monthlyCommitment,
        });
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey });
      const previousMembers = queryClient.getQueryData<PiggyMemberResponse[]>(queryKey);

      queryClient.setQueryData<PiggyMemberResponse[]>(queryKey, (current = []) =>
        current.map((member) => {
          if (member.id !== variables.memberId) {
            return member;
          }

          return {
            ...member,
            shareWeight: variables.patchShareWeight ? variables.shareWeight : member.shareWeight,
            monthlyCommitment: variables.patchMonthlyCommitment
              ? variables.monthlyCommitment
              : member.monthlyCommitment,
          };
        })
      );

      return { previousMembers };
    },
    onError: (error, _variables, context) => {
      if (context?.previousMembers) {
        queryClient.setQueryData(queryKey, context.previousMembers);
      }
      Alert.alert(t('common.error'), error.message || t('piggyMembers.saveError'));
    },
    onSuccess: () => {
      Alert.alert(t('common.success'), t('piggyMembers.saveSuccess'));
    },
    onSettled: async () => {
      setSavingMemberId(null);
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateShareWeightDraft = (memberId: number, shareWeight: number) => {
    setDrafts((current) => ({
      ...current,
      [memberId]: {
        ...(current[memberId] ?? { shareWeight: SHARE_WEIGHT_MIN, monthlyCommitmentInput: '' }),
        shareWeight: clampShareWeight(shareWeight),
      },
    }));
  };

  const updateCommitmentDraft = (memberId: number, monthlyCommitmentInput: string) => {
    setDrafts((current) => ({
      ...current,
      [memberId]: {
        ...(current[memberId] ?? { shareWeight: SHARE_WEIGHT_MIN, monthlyCommitmentInput: '' }),
        monthlyCommitmentInput: sanitizeMoneyInput(monthlyCommitmentInput),
      },
    }));
  };

  const getRoleLabel = (role: string): string => {
    if (role.toUpperCase() === 'OWNER') {
      return t('piggyMembers.roleOwner');
    }
    if (role.toUpperCase() === 'CONTRIBUTOR') {
      return t('piggyMembers.roleContributor');
    }
    return role;
  };

  const handleSaveMember = (member: PiggyMemberResponse) => {
    const draft = drafts[member.id] ?? {
      shareWeight: clampShareWeight(member.shareWeight),
      monthlyCommitmentInput: toCommitmentInput(member.monthlyCommitment),
    };

    const canEditShareWeight = isOwner && member.accountId !== currentAccountId;
    const canEditCommitment = member.accountId === currentAccountId;

    const nextShareWeight = clampShareWeight(draft.shareWeight);
    const nextMonthlyCommitment = parseMonthlyCommitment(draft.monthlyCommitmentInput);
    const currentMonthlyCommitment = parseMonthlyCommitment(
      toCommitmentInput(member.monthlyCommitment)
    );

    const patchShareWeight =
      canEditShareWeight && nextShareWeight !== clampShareWeight(member.shareWeight);
    const patchMonthlyCommitment =
      canEditCommitment && nextMonthlyCommitment !== currentMonthlyCommitment;

    if (!patchShareWeight && !patchMonthlyCommitment) {
      return;
    }

    setSavingMemberId(member.id);
    saveMutation.mutate({
      memberId: member.id,
      shareWeight: nextShareWeight,
      monthlyCommitment: nextMonthlyCommitment,
      patchShareWeight,
      patchMonthlyCommitment,
    });
  };

  if (!piggyId) {
    return (
      <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          <Text style={[styles.errorText, themedStyles.errorText]}>{t('piggyMembers.invalidPiggy')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, themedStyles.title]}>{t('piggyMembers.title')}</Text>
          <Text style={[styles.subtitle, themedStyles.subtitle]}>{t('piggyMembers.subtitle')}</Text>
        </View>

        {isLoading ? (
          <Card>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, themedStyles.subtitle]}>{t('common.loading')}</Text>
            </View>
          </Card>
        ) : null}

        {!isLoading && isError ? (
          <Card>
            <Text style={[styles.errorText, themedStyles.errorText]}>{t('common.loadingError')}</Text>
            <Pressable onPress={() => refetch()} style={styles.retryButton}>
              <Text style={[styles.retryText, themedStyles.retryText]}>{t('common.retry')}</Text>
            </Pressable>
          </Card>
        ) : null}

        {!isLoading && !isError && members.length === 0 ? (
          <Card>
            <Text style={[styles.emptyText, themedStyles.subtitle]}>{t('common.noData')}</Text>
          </Card>
        ) : null}

        {!isLoading && !isError
          ? members.map((member) => {
              const draft = drafts[member.id] ?? {
                shareWeight: clampShareWeight(member.shareWeight),
                monthlyCommitmentInput: toCommitmentInput(member.monthlyCommitment),
              };

              const canEditShareWeight = isOwner && member.accountId !== currentAccountId;
              const canEditCommitment = member.accountId === currentAccountId;
              const readOnly = !canEditShareWeight && !canEditCommitment;

              const normalizedShareWeight = clampShareWeight(draft.shareWeight);
              const nextCommitment = parseMonthlyCommitment(draft.monthlyCommitmentInput);
              const currentCommitment = parseMonthlyCommitment(
                toCommitmentInput(member.monthlyCommitment)
              );
              const hasShareWeightChange =
                canEditShareWeight &&
                normalizedShareWeight !== clampShareWeight(member.shareWeight);
              const hasCommitmentChange =
                canEditCommitment && nextCommitment !== currentCommitment;
              const canSave = hasShareWeightChange || hasCommitmentChange;
              const isSaving = saveMutation.isPending && savingMemberId === member.id;
              const roleIsOwner = member.role.toUpperCase() === 'OWNER';

              return (
                <Card key={member.id}>
                  <View style={styles.memberHeader}>
                    <Text style={[styles.memberName, themedStyles.title]}>{member.displayName}</Text>
                    <View
                      style={[
                        styles.roleBadge,
                        themedStyles.roleBadge,
                        roleIsOwner && themedStyles.roleBadgeOwner,
                      ]}
                    >
                      <Text
                        style={[
                          styles.roleBadgeText,
                          themedStyles.roleBadgeText,
                          roleIsOwner && themedStyles.roleBadgeTextOwner,
                        ]}
                      >
                        {getRoleLabel(member.role)}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.sectionLabel, themedStyles.subtitle]}>
                    {t('piggyMembers.shareWeight')}
                  </Text>
                  <View style={styles.shareWeightRow}>
                    {SHARE_WEIGHT_VALUES.map((value) => {
                      const isActive = value <= normalizedShareWeight;
                      return (
                        <Pressable
                          key={`${member.id}-${value}`}
                          onPress={() => updateShareWeightDraft(member.id, value)}
                          disabled={!canEditShareWeight}
                          style={styles.shareWeightStep}
                        >
                          <View
                            style={[
                              styles.shareWeightDot,
                              themedStyles.shareWeightDot,
                              isActive && themedStyles.shareWeightDotActive,
                              !canEditShareWeight && themedStyles.shareWeightDotDisabled,
                            ]}
                          />
                          <Text
                            style={[
                              styles.shareWeightValue,
                              themedStyles.shareWeightValue,
                              isActive && themedStyles.shareWeightValueActive,
                            ]}
                          >
                            {value}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={[styles.sectionLabel, themedStyles.subtitle]}>
                    {t('piggyMembers.monthlyCommitment')}
                  </Text>
                  <TextInput
                    value={draft.monthlyCommitmentInput}
                    onChangeText={(value) => updateCommitmentDraft(member.id, value)}
                    editable={canEditCommitment}
                    placeholder={t('piggyMembers.monthlyCommitmentPlaceholder')}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    style={[
                      styles.commitmentInput,
                      themedStyles.commitmentInput,
                      !canEditCommitment && themedStyles.commitmentInputDisabled,
                    ]}
                  />

                  <Text style={[styles.commitmentInfo, themedStyles.subtitle]}>
                    {nextCommitment > 0
                      ? `${t('piggyMembers.currentCommitment')}: ${currencyFormatter.format(nextCommitment)}`
                      : t('piggyMembers.autoEstimate')}
                  </Text>

                  <Text style={[styles.helperText, themedStyles.helperText]}>
                    {t('piggyMembers.helper')}
                  </Text>

                  {readOnly ? (
                    <Text style={[styles.readOnlyText, themedStyles.readOnlyText]}>
                      {t('piggyMembers.readOnly')}
                    </Text>
                  ) : null}

                  <Pressable
                    onPress={() => handleSaveMember(member)}
                    disabled={!canSave || isSaving}
                    style={[
                      styles.saveButton,
                      themedStyles.saveButton,
                      (!canSave || isSaving) && themedStyles.saveButtonDisabled,
                    ]}
                  >
                    {isSaving ? (
                      <View style={styles.saveLoadingRow}>
                        <ActivityIndicator size="small" color={colors.textOnPrimary ?? colors.text} />
                        <Text style={[styles.saveButtonText, themedStyles.saveButtonText]}>
                          {t('piggyMembers.saving')}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.saveButtonText,
                          themedStyles.saveButtonText,
                          !canSave && themedStyles.saveButtonTextDisabled,
                        ]}
                      >
                        {t('piggyMembers.save')}
                      </Text>
                    )}
                  </Pressable>
                </Card>
              );
            })
          : null}
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
    errorText: {
      color: colors.error,
    },
    retryText: {
      color: colors.primary,
    },
    roleBadge: {
      backgroundColor: colors.backgroundSecondary,
    },
    roleBadgeOwner: {
      backgroundColor: colors.primary,
    },
    roleBadgeText: {
      color: colors.textSecondary,
    },
    roleBadgeTextOwner: {
      color: colors.textOnPrimary ?? colors.text,
    },
    shareWeightDot: {
      backgroundColor: colors.border,
      borderColor: colors.border,
    },
    shareWeightDotActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    shareWeightDotDisabled: {
      backgroundColor: colors.disabled,
      borderColor: colors.disabled,
    },
    shareWeightValue: {
      color: colors.textSecondary,
    },
    shareWeightValueActive: {
      color: colors.text,
    },
    commitmentInput: {
      color: colors.text,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    commitmentInputDisabled: {
      color: colors.textMuted,
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.border,
    },
    helperText: {
      color: colors.textMuted,
    },
    readOnlyText: {
      color: colors.warning,
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    saveButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    saveButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    saveButtonTextDisabled: {
      color: colors.disabledText,
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
    gap: tokens.spacing.xs,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  loadingText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  errorText: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  retryButton: {
    alignSelf: 'flex-start',
    marginTop: tokens.spacing.sm,
  },
  retryText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  emptyText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontStyle: 'italic',
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  memberName: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  roleBadge: {
    borderRadius: tokens.borderRadius.full,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
  },
  roleBadgeText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  sectionLabel: {
    marginTop: tokens.spacing.sm,
    marginBottom: tokens.spacing.xs,
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  shareWeightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tokens.spacing.xs,
  },
  shareWeightStep: {
    flex: 1,
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  shareWeightDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
  },
  shareWeightValue: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  commitmentInput: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.fontSizes.md,
  },
  commitmentInfo: {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.typography.fontSizes.xs,
  },
  helperText: {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.typography.fontSizes.xs,
    lineHeight: 18,
  },
  readOnlyText: {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  saveButton: {
    marginTop: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  saveLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
});
