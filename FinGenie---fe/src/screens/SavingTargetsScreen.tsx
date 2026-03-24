import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui';
import { SharedPiggyInvitationsSection } from '../components/social/SharedPiggyInvitationsSection';
import {
  aiApi,
  friendsApi,
  goalsApi,
  piggiesApi,
  type CreateGoalRequest,
  type CreatePiggyRequest,
  type FriendshipResponse,
  type SavingTargetResponse,
} from '../api/modules';
import { invalidateSavingsGraph, savingsKeys } from '../queryKeys/savings.keys';
import type { AppStackParamList } from '../navigation/types';
import { tokens } from '../theme';
import { authStore } from '../store';
import { useThemeStore } from '../store/themeStore';
import { useI18n, type TranslationKey } from '../i18n/useI18n';

function formatMoney(value: number | null | undefined, formatter: Intl.NumberFormat): string {
  if (value == null || Number.isNaN(Number(value))) {
    return '0';
  }
  return formatter.format(Number(value));
}

function formatDate(value: string | null | undefined, formatter: Intl.DateTimeFormat): string | null {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return formatter.format(date);
}

function getProgressPercent(currentAmount: number, targetAmount: number): number {
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return 0;
  }
  const percent = (currentAmount / targetAmount) * 100;
  return Math.max(0, Math.min(100, percent));
}

function sanitizeMoneyInput(value: string): string {
  return value.replace(/[^\d]/g, '');
}

function getErrorStatus(error: unknown): number | null {
  const maybeError = error as { response?: { status?: number }; status?: number } | null;
  return maybeError?.response?.status ?? maybeError?.status ?? null;
}

function isFeatureMissingStatus(status: number | null): boolean {
  return status === 404 || status === 405 || status === 501;
}

interface GroupSectionProps {
  sectionTitleKey: TranslationKey;
  items: SavingTargetResponse[];
  colors: ReturnType<typeof useThemeStore>['colors'];
  numberFormatter: Intl.NumberFormat;
  dateFormatter: Intl.DateTimeFormat;
  t: (key: TranslationKey) => string;
  onPressItem?: (item: SavingTargetResponse) => void;
}

interface SavingTargetsScreenProps {
  embedded?: boolean;
}

interface FriendOption {
  friendshipId: number;
  friendId: number;
  friendName: string;
}

function getFriendOption(friendship: FriendshipResponse, currentUserId: number): FriendOption {
  const isRequester = friendship.requesterId === currentUserId;
  return {
    friendshipId: friendship.friendshipId,
    friendId: isRequester ? friendship.addresseeId : friendship.requesterId,
    friendName: (isRequester ? friendship.addresseeName : friendship.requesterName).trim(),
  };
}

function GroupSection({
  sectionTitleKey,
  items,
  colors,
  numberFormatter,
  dateFormatter,
  t,
  onPressItem,
}: GroupSectionProps) {
  const themedStyles = getThemedStyles(colors);

  const typeLabel = (type: string) => {
    if (type === 'GOAL') {
      return t('savingTargets.typeGoal');
    }
    if (type === 'PIGGY') {
      return t('savingTargets.typePiggy');
    }
    return type;
  };

  return (
    <Card>
      <Text style={[styles.sectionTitle, themedStyles.title]}>{t(sectionTitleKey)}</Text>
      {items.length === 0 ? (
        <Text style={[styles.emptyText, themedStyles.secondaryText]}>{t('common.noData')}</Text>
      ) : (
        items.map((item) => {
          const progressPercent = getProgressPercent(item.currentAmount, item.targetAmount);
          const deadline = formatDate(item.deadline, dateFormatter);

          const content = (
            <View style={[styles.item, themedStyles.divider]}>
              <View style={styles.itemHeader}>
                <Text style={[styles.itemTitle, themedStyles.title]}>{item.title}</Text>
                <View style={[styles.typeBadge, themedStyles.typeBadge]}>
                  <Text style={[styles.typeBadgeText, themedStyles.secondaryText]}>{typeLabel(item.type)}</Text>
                </View>
              </View>

              <Text style={[styles.itemLine, themedStyles.secondaryText]}>
                {t('savingTargets.progress')}: {formatMoney(item.currentAmount, numberFormatter)} / {formatMoney(item.targetAmount, numberFormatter)} ({formatMoney(progressPercent, numberFormatter)}%)
              </Text>

              <View style={[styles.progressTrack, themedStyles.progressTrack]}>
                <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: colors.primary }]} />
              </View>

              <Text style={[styles.itemLine, themedStyles.secondaryText]}>
                {t('savingTargets.remaining')}: {formatMoney(item.remainingAmount, numberFormatter)}
              </Text>
              <Text style={[styles.itemLine, themedStyles.secondaryText]}>
                {t('savingTargets.requiredMonthly')}: {formatMoney(item.requiredMonthly, numberFormatter)}
              </Text>
              {deadline ? (
                <Text style={[styles.itemLine, themedStyles.secondaryText]}>
                  {t('savingTargets.deadline')}: {deadline}
                </Text>
              ) : null}
            </View>
          );

          if (!onPressItem) {
            return <View key={`${item.type}-${item.id}`}>{content}</View>;
          }

          return (
            <Pressable
              key={`${item.type}-${item.id}`}
              onPress={() => onPressItem(item)}
              style={({ pressed }) => [styles.itemPressable, pressed && styles.itemPressablePressed]}
            >
              {content}
            </Pressable>
          );
        })
      )}
    </Card>
  );
}

export function SavingTargetsScreen({ embedded = false }: SavingTargetsScreenProps) {
  const { t, locale } = useI18n();
  const { colors } = useThemeStore();
  const queryClient = useQueryClient();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const themedStyles = getThemedStyles(colors);
  const currentUserId = authStore((state) => state.user?.accountId) ?? 0;
  const [isCreateModalOpen, setCreateModalOpen] = React.useState(false);
  const [titleInput, setTitleInput] = React.useState('');
  const [amountInput, setAmountInput] = React.useState('');
  const [deadlineInput, setDeadlineInput] = React.useState('');
  const [titleError, setTitleError] = React.useState<TranslationKey | null>(null);
  const [amountError, setAmountError] = React.useState<TranslationKey | null>(null);
  const [deadlineError, setDeadlineError] = React.useState<TranslationKey | null>(null);
  const [isCreatePiggyModalOpen, setCreatePiggyModalOpen] = React.useState(false);
  const [piggyTitleInput, setPiggyTitleInput] = React.useState('');
  const [piggyGoalAmountInput, setPiggyGoalAmountInput] = React.useState('');
  const [piggyLockUntilInput, setPiggyLockUntilInput] = React.useState('');
  const [piggyIsSharedInput, setPiggyIsSharedInput] = React.useState(false);
  const [piggyTitleError, setPiggyTitleError] = React.useState<TranslationKey | null>(null);
  const [piggyGoalAmountError, setPiggyGoalAmountError] = React.useState<TranslationKey | null>(null);
  const [piggyLockUntilError, setPiggyLockUntilError] = React.useState<TranslationKey | null>(null);
  const [selectedInviteeId, setSelectedInviteeId] = React.useState<number | null>(null);
  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
      }),
    [locale]
  );

  const {
    data: targets = [],
    isLoading,
    isRefetching,
    isError,
    refetch,
  } = useQuery<SavingTargetResponse[]>({
    queryKey: savingsKeys.savingTargets(),
    queryFn: async () => {
      const response = await aiApi.savingTargets.list();
      return response.data;
    },
  });

  const { data: friendshipsData = [] } = useQuery<FriendshipResponse[]>({
    queryKey: ['friends', 'sharedPiggyInviteOptions'],
    enabled: isCreatePiggyModalOpen && piggyIsSharedInput,
    queryFn: async () => {
      const response = await friendsApi.friendships.getByStatus('ACCEPTED');
      return response.data;
    },
  });

  const availableFriends = useMemo(
    () => friendshipsData.map((friendship) => getFriendOption(friendship, currentUserId)),
    [currentUserId, friendshipsData]
  );

  const resetCreateGoalForm = () => {
    setTitleInput('');
    setAmountInput('');
    setDeadlineInput('');
    setTitleError(null);
    setAmountError(null);
    setDeadlineError(null);
  };

  const resetCreatePiggyForm = () => {
    setPiggyTitleInput('');
    setPiggyGoalAmountInput('');
    setPiggyLockUntilInput('');
    setPiggyIsSharedInput(false);
    setPiggyTitleError(null);
    setPiggyGoalAmountError(null);
    setPiggyLockUntilError(null);
    setSelectedInviteeId(null);
  };

  const createGoalMutation = useMutation({
    mutationFn: async (payload: CreateGoalRequest) => {
      await goalsApi.create(payload);
    },
    onSuccess: async () => {
      setCreateModalOpen(false);
      resetCreateGoalForm();
      Alert.alert(t('common.success'), t('goalCreate.createSuccess'));
      await invalidateSavingsGraph(queryClient);
    },
    onError: (error: unknown) => {
      Alert.alert(
        t('common.error'),
        isFeatureMissingStatus(getErrorStatus(error))
          ? t('goalCreate.comingSoon')
          : t('goalCreate.createError')
      );
    },
  });

  const createPiggyMutation = useMutation({
    mutationFn: async (payload: CreatePiggyRequest) => {
      await piggiesApi.create(payload);
    },
    onSuccess: async () => {
      setCreatePiggyModalOpen(false);
      resetCreatePiggyForm();
      Alert.alert(t('common.success'), t('piggyCreate.createSuccess'));
      await invalidateSavingsGraph(queryClient);
    },
    onError: (error: unknown) => {
      Alert.alert(
        t('common.error'),
        isFeatureMissingStatus(getErrorStatus(error))
          ? t('piggyCreate.comingSoon')
          : t('piggyCreate.createError')
      );
    },
  });

  const createSharedInvitationMutation = useMutation({
    mutationFn: async (payload: { inviteeId: number } & CreatePiggyRequest) => {
      await piggiesApi.createSharedInvitation({
        title: payload.title,
        goalAmount: payload.goalAmount,
        lockUntil: payload.lockUntil,
        inviteeId: payload.inviteeId,
      });
    },
    onSuccess: () => {
      setCreatePiggyModalOpen(false);
      resetCreatePiggyForm();
      Alert.alert(t('common.success'), t('piggyCreate.inviteSent'));
    },
    onError: () => {
      Alert.alert(t('common.error'), t('piggyCreate.createError'));
    },
  });

  const handleCreateGoal = () => {
    const trimmedTitle = titleInput.trim();
    const parsedAmount = Number(amountInput);
    const trimmedDeadline = deadlineInput.trim();

    let hasError = false;
    setTitleError(null);
    setAmountError(null);
    setDeadlineError(null);

    if (!trimmedTitle) {
      setTitleError('goalCreate.validationTitle');
      hasError = true;
    }

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setAmountError('goalCreate.validationAmount');
      hasError = true;
    }

    let deadlineIso: string | undefined;
    if (trimmedDeadline) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDeadline)) {
        setDeadlineError('goalCreate.validationDeadline');
        hasError = true;
      } else {
        const parsedDate = new Date(`${trimmedDeadline}T00:00:00`);
        if (Number.isNaN(parsedDate.getTime())) {
          setDeadlineError('goalCreate.validationDeadline');
          hasError = true;
        } else {
          deadlineIso = parsedDate.toISOString();
        }
      }
    }

    if (hasError) {
      return;
    }

    createGoalMutation.mutate({
      title: trimmedTitle,
      targetAmount: parsedAmount,
      deadline: deadlineIso,
    });
  };

  const handleCreatePiggy = () => {
    const trimmedTitle = piggyTitleInput.trim();
    const parsedGoalAmount = Number(piggyGoalAmountInput);
    const trimmedLockUntil = piggyLockUntilInput.trim();

    let hasError = false;
    setPiggyTitleError(null);
    setPiggyGoalAmountError(null);
    setPiggyLockUntilError(null);

    if (!trimmedTitle) {
      setPiggyTitleError('piggyCreate.validationTitle');
      hasError = true;
    }

    if (!Number.isFinite(parsedGoalAmount) || parsedGoalAmount <= 0) {
      setPiggyGoalAmountError('piggyCreate.validationGoalAmount');
      hasError = true;
    }

    if (piggyIsSharedInput && !selectedInviteeId) {
      Alert.alert(t('common.error'), t('piggyCreate.inviteFriendRequired'));
      hasError = true;
    }

    let lockUntilIso: string | undefined;
    if (trimmedLockUntil) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedLockUntil)) {
        setPiggyLockUntilError('piggyCreate.validationLockUntil');
        hasError = true;
      } else {
        const parsedDate = new Date(`${trimmedLockUntil}T00:00:00`);
        if (Number.isNaN(parsedDate.getTime())) {
          setPiggyLockUntilError('piggyCreate.validationLockUntil');
          hasError = true;
        } else {
          lockUntilIso = parsedDate.toISOString();
        }
      }
    }

    if (hasError) {
      return;
    }

    if (piggyIsSharedInput && selectedInviteeId) {
      createSharedInvitationMutation.mutate({
        title: trimmedTitle,
        goalAmount: parsedGoalAmount,
        lockUntil: lockUntilIso,
        isShared: true,
        inviteeId: selectedInviteeId,
      });
      return;
    }

    createPiggyMutation.mutate({
      title: trimmedTitle,
      goalAmount: parsedGoalAmount,
      lockUntil: lockUntilIso,
      isShared: false,
    });
  };

  const goalTargets = targets.filter((target) => target.type === 'GOAL');
  const piggyTargets = targets.filter((target) => target.type === 'PIGGY');

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={embedded ? ['bottom'] : ['top', 'bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!embedded && (
          <View style={styles.header}>
            <Text style={[styles.title, themedStyles.title]}>{t('savingTargets.title')}</Text>
            <Text style={[styles.subtitle, themedStyles.secondaryText]}>
              {t('savingTargets.subtitle')}
            </Text>
          </View>
        )}

        <SharedPiggyInvitationsSection />

        <Card>
          <Text style={[styles.createGoalHelper, themedStyles.secondaryText]}>{t('goalCreate.helper')}</Text>
          <Pressable
            onPress={() => {
              setCreateModalOpen(true);
            }}
            style={({ pressed }) => [
              styles.createGoalButton,
              themedStyles.createGoalButton,
              pressed && styles.createGoalButtonPressed,
            ]}
          >
            <Text style={[styles.createGoalButtonText, themedStyles.createGoalButtonText]}>
              {t('goalCreate.cta')}
            </Text>
          </Pressable>
        </Card>

        {isLoading ? (
          <Card>
            <View style={styles.loadingRow}>
              <ActivityIndicator color={colors.primary} />
              <Text style={[styles.loadingText, themedStyles.secondaryText]}>{t('common.loading')}</Text>
            </View>
          </Card>
        ) : (
          <>
            {isError ? (
              <Card>
                <Text style={[styles.errorText, { color: colors.error }]}>{t('common.loadingError')}</Text>
                <Pressable onPress={() => refetch()} style={styles.retryButton}>
                  <Text style={[styles.retryText, { color: colors.primary }]}>{t('common.retry')}</Text>
                </Pressable>
              </Card>
            ) : (
              <>
                <GroupSection
                  sectionTitleKey="savingTargets.goals"
                  items={goalTargets}
                  colors={colors}
                  numberFormatter={numberFormatter}
                  dateFormatter={dateFormatter}
                  t={t}
                  onPressItem={(item) => navigation.navigate('GoalDetail', { goalId: item.id })}
                />
                <Card>
                  <Text style={[styles.createPiggyHelper, themedStyles.secondaryText]}>{t('piggyCreate.helper')}</Text>
                  <Pressable
                    onPress={() => {
                      setCreatePiggyModalOpen(true);
                    }}
                    style={({ pressed }) => [
                      styles.createPiggyButton,
                      themedStyles.createPiggyButton,
                      pressed && styles.createPiggyButtonPressed,
                    ]}
                  >
                    <Text style={[styles.createPiggyButtonText, themedStyles.createPiggyButtonText]}>
                      {t('piggyCreate.cta')}
                    </Text>
                  </Pressable>
                </Card>
                <GroupSection
                  sectionTitleKey="savingTargets.piggies"
                  items={piggyTargets}
                  colors={colors}
                  numberFormatter={numberFormatter}
                  dateFormatter={dateFormatter}
                  t={t}
                  onPressItem={(item) => navigation.navigate('PiggyDetail', { piggyId: item.id })}
                />
              </>
            )}
          </>
        )}

        <Pressable onPress={() => refetch()} style={styles.refreshLink}>
          <Text style={[styles.refreshText, { color: colors.primary }]}>
            {isRefetching ? t('common.loading') : t('savingTargets.refresh')}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={isCreateModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCreateModalOpen(false);
          resetCreateGoalForm();
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, themedStyles.modalCard]}>
            <Text style={[styles.modalTitle, themedStyles.title]}>{t('goalCreate.modalTitle')}</Text>

            <Text style={[styles.fieldLabel, themedStyles.secondaryText]}>{t('goalCreate.titleLabel')}</Text>
            <TextInput
              value={titleInput}
              onChangeText={(value) => {
                setTitleInput(value);
                setTitleError(null);
              }}
              placeholder={t('goalCreate.titlePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, themedStyles.input]}
              editable={!createGoalMutation.isPending}
            />
            {titleError ? <Text style={[styles.errorHint, themedStyles.errorText]}>{t(titleError)}</Text> : null}

            <Text style={[styles.fieldLabel, themedStyles.secondaryText]}>{t('goalCreate.amountLabel')}</Text>
            <TextInput
              value={amountInput}
              onChangeText={(value) => {
                setAmountInput(sanitizeMoneyInput(value));
                setAmountError(null);
              }}
              placeholder={t('goalCreate.amountPlaceholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[styles.input, themedStyles.input]}
              editable={!createGoalMutation.isPending}
            />
            {amountError ? <Text style={[styles.errorHint, themedStyles.errorText]}>{t(amountError)}</Text> : null}

            <Text style={[styles.fieldLabel, themedStyles.secondaryText]}>{t('goalCreate.deadlineLabel')}</Text>
            <TextInput
              value={deadlineInput}
              onChangeText={(value) => {
                setDeadlineInput(value);
                setDeadlineError(null);
              }}
              placeholder={t('goalCreate.deadlinePlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, themedStyles.input]}
              editable={!createGoalMutation.isPending}
            />
            {deadlineError ? <Text style={[styles.errorHint, themedStyles.errorText]}>{t(deadlineError)}</Text> : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setCreateModalOpen(false);
                  resetCreateGoalForm();
                }}
                style={[styles.modalActionButton, themedStyles.cancelButton]}
                disabled={createGoalMutation.isPending}
              >
                <Text style={[styles.modalActionText, themedStyles.cancelButtonText]}>{t('common.cancel')}</Text>
              </Pressable>

              <Pressable
                onPress={handleCreateGoal}
                style={[
                  styles.modalActionButton,
                  themedStyles.submitButton,
                  createGoalMutation.isPending && themedStyles.submitButtonDisabled,
                ]}
                disabled={createGoalMutation.isPending}
              >
                {createGoalMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary ?? colors.text} />
                ) : (
                  <Text style={[styles.modalActionText, themedStyles.submitButtonText]}>
                    {t('goalCreate.submit')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={isCreatePiggyModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setCreatePiggyModalOpen(false);
          resetCreatePiggyForm();
        }}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, themedStyles.modalCard]}>
            <Text style={[styles.modalTitle, themedStyles.title]}>{t('piggyCreate.modalTitle')}</Text>

            <Text style={[styles.fieldLabel, themedStyles.secondaryText]}>{t('piggyCreate.titleLabel')}</Text>
            <TextInput
              value={piggyTitleInput}
              onChangeText={(value) => {
                setPiggyTitleInput(value);
                setPiggyTitleError(null);
              }}
              placeholder={t('piggyCreate.titlePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[styles.input, themedStyles.input]}
              editable={!createPiggyMutation.isPending}
            />
            {piggyTitleError ? (
              <Text style={[styles.errorHint, themedStyles.errorText]}>{t(piggyTitleError)}</Text>
            ) : null}

            <Text style={[styles.fieldLabel, themedStyles.secondaryText]}>{t('piggyCreate.goalAmountLabel')}</Text>
            <TextInput
              value={piggyGoalAmountInput}
              onChangeText={(value) => {
                setPiggyGoalAmountInput(sanitizeMoneyInput(value));
                setPiggyGoalAmountError(null);
              }}
              placeholder={t('piggyCreate.goalAmountPlaceholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              style={[styles.input, themedStyles.input]}
              editable={!createPiggyMutation.isPending}
            />
            {piggyGoalAmountError ? (
              <Text style={[styles.errorHint, themedStyles.errorText]}>{t(piggyGoalAmountError)}</Text>
            ) : null}

            <Text style={[styles.fieldLabel, themedStyles.secondaryText]}>{t('piggyCreate.lockUntilLabel')}</Text>
            <TextInput
              value={piggyLockUntilInput}
              onChangeText={(value) => {
                setPiggyLockUntilInput(value);
                setPiggyLockUntilError(null);
              }}
              placeholder={t('piggyCreate.lockUntilPlaceholder')}
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              style={[styles.input, themedStyles.input]}
              editable={!createPiggyMutation.isPending}
            />
            {piggyLockUntilError ? (
              <Text style={[styles.errorHint, themedStyles.errorText]}>{t(piggyLockUntilError)}</Text>
            ) : null}

            <View style={styles.switchRow}>
              <View style={styles.switchTextWrap}>
                <Text style={[styles.fieldLabel, themedStyles.secondaryText]}>{t('piggyCreate.sharedLabel')}</Text>
                <Text style={[styles.switchHint, themedStyles.secondaryText]}>{t('piggyCreate.sharedHint')}</Text>
              </View>
              <Switch
                value={piggyIsSharedInput}
                onValueChange={(value) => {
                  setPiggyIsSharedInput(value);
                  if (!value) {
                    setSelectedInviteeId(null);
                  }
                }}
                disabled={createPiggyMutation.isPending || createSharedInvitationMutation.isPending}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
                ios_backgroundColor={colors.border}
              />
            </View>

            {piggyIsSharedInput ? (
              <View style={styles.sharedInviteSection}>
                <Text style={[styles.fieldLabel, themedStyles.secondaryText]}>
                  {t('piggyCreate.sharedFriendLabel')}
                </Text>
                {availableFriends.length === 0 ? (
                  <Text style={[styles.switchHint, themedStyles.errorText]}>
                    {t('piggyCreate.sharedNoFriends')}
                  </Text>
                ) : (
                  <View style={styles.friendList}>
                    {availableFriends.map((friend) => {
                      const isSelected = selectedInviteeId === friend.friendId;
                      return (
                        <Pressable
                          key={friend.friendshipId}
                          onPress={() => setSelectedInviteeId(friend.friendId)}
                          style={[
                            styles.friendOption,
                            themedStyles.friendOption,
                            isSelected && styles.friendOptionSelected,
                            isSelected && themedStyles.friendOptionSelected,
                          ]}
                        >
                          <Text style={[styles.friendOptionText, themedStyles.title]}>
                            {friend.friendName}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
                <Text style={[styles.switchHint, themedStyles.secondaryText]}>
                  {t('piggyCreate.sharedPendingHint')}
                </Text>
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setCreatePiggyModalOpen(false);
                  resetCreatePiggyForm();
                }}
                style={[styles.modalActionButton, themedStyles.cancelButton]}
                disabled={createPiggyMutation.isPending || createSharedInvitationMutation.isPending}
              >
                <Text style={[styles.modalActionText, themedStyles.cancelButtonText]}>{t('common.cancel')}</Text>
              </Pressable>

              <Pressable
                onPress={handleCreatePiggy}
                style={[
                  styles.modalActionButton,
                  themedStyles.submitButton,
                  (createPiggyMutation.isPending || createSharedInvitationMutation.isPending) &&
                    themedStyles.submitButtonDisabled,
                ]}
                disabled={createPiggyMutation.isPending || createSharedInvitationMutation.isPending}
              >
                {createPiggyMutation.isPending || createSharedInvitationMutation.isPending ? (
                  <ActivityIndicator size="small" color={colors.textOnPrimary ?? colors.text} />
                ) : (
                  <Text style={[styles.modalActionText, themedStyles.submitButtonText]}>
                    {piggyIsSharedInput ? t('piggyCreate.sendInvite') : t('piggyCreate.submit')}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    secondaryText: {
      color: colors.textSecondary,
    },
    divider: {
      borderBottomColor: colors.border,
    },
    typeBadge: {
      backgroundColor: colors.backgroundSecondary,
    },
    progressTrack: {
      backgroundColor: colors.backgroundSecondary,
    },
    createGoalButton: {
      backgroundColor: colors.primary,
    },
    createGoalButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    createPiggyButton: {
      backgroundColor: colors.primary,
    },
    createPiggyButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    input: {
      borderColor: colors.border,
      color: colors.text,
      backgroundColor: colors.backgroundSecondary,
    },
    errorText: {
      color: colors.error,
    },
    cancelButton: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    cancelButtonText: {
      color: colors.text,
    },
    submitButton: {
      backgroundColor: colors.primary,
    },
    submitButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    submitButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    friendOption: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    friendOptionSelected: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}22`,
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
  createGoalHelper: {
    fontSize: tokens.typography.fontSizes.sm,
    marginBottom: tokens.spacing.sm,
    lineHeight: 20,
  },
  createGoalButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
  },
  createGoalButtonPressed: {
    opacity: 0.85,
  },
  createGoalButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  createPiggyHelper: {
    fontSize: tokens.typography.fontSizes.sm,
    marginBottom: tokens.spacing.sm,
    lineHeight: 20,
  },
  createPiggyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
  },
  createPiggyButtonPressed: {
    opacity: 0.85,
  },
  createPiggyButtonText: {
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
  sectionTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.sm,
  },
  emptyText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontStyle: 'italic',
    paddingVertical: tokens.spacing.sm,
  },
  item: {
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: tokens.spacing.xs,
  },
  itemPressable: {
    borderRadius: tokens.borderRadius.md,
  },
  itemPressablePressed: {
    opacity: 0.9,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  itemTitle: {
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
  itemLine: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    overflow: 'hidden',
    marginVertical: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  errorText: {
    fontSize: tokens.typography.fontSizes.sm,
    marginBottom: tokens.spacing.sm,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingVertical: tokens.spacing.xs,
  },
  retryText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  refreshLink: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
  },
  refreshText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.md,
  },
  modalCard: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  modalTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.xs,
  },
  fieldLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  input: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.fontSizes.md,
  },
  errorHint: {
    fontSize: tokens.typography.fontSizes.xs,
    marginTop: -tokens.spacing.xs,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  switchTextWrap: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  switchHint: {
    fontSize: tokens.typography.fontSizes.xs,
    lineHeight: 18,
  },
  sharedInviteSection: {
    gap: tokens.spacing.sm,
  },
  friendList: {
    gap: tokens.spacing.sm,
  },
  friendOption: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  friendOptionSelected: {
    borderWidth: 1,
  },
  friendOptionText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
  },
  modalActionButton: {
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderWidth: 1,
  },
  modalActionText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});
