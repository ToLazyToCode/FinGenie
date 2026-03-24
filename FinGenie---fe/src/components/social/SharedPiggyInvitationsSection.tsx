import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../ui';
import { piggiesApi, type SharedPiggyInvitationResponse } from '../../api/modules';
import { useI18n } from '../../i18n/useI18n';
import { invalidateSavingsGraph } from '../../queryKeys/savings.keys';
import { useThemeStore } from '../../store/themeStore';
import { showToast } from '../../system';
import { tokens } from '../../theme';
import { getErrorMessage } from '../../utils/errorHandling';

const INVITATION_QUERY_KEY = ['sharedPiggyInvitations', 'incoming'] as const;

function getInitial(name: string | null | undefined): string {
  const normalized = (name ?? '').trim();
  return normalized.charAt(0).toUpperCase() || '?';
}

interface SharedPiggyInvitationsSectionProps {
  compact?: boolean;
}

export function SharedPiggyInvitationsSection({
  compact = false,
}: SharedPiggyInvitationsSectionProps) {
  const queryClient = useQueryClient();
  const { t, locale } = useI18n();
  const { colors } = useThemeStore();
  const themedStyles = useMemo(() => getThemedStyles(colors), [colors]);
  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }),
    [locale]
  );
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: compact ? 'short' : 'long',
        day: '2-digit',
      }),
    [compact, locale]
  );

  const invitationsQuery = useQuery({
    queryKey: INVITATION_QUERY_KEY,
    queryFn: async () => {
      const response = await piggiesApi.getIncomingInvitations();
      return response.data;
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (invitationId: number) => piggiesApi.acceptInvitation(invitationId),
    onSuccess: async () => {
      showToast(t('sharedPiggyInvite.acceptSuccess'));
      queryClient.invalidateQueries({ queryKey: INVITATION_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsCount'] });
      await invalidateSavingsGraph(queryClient);
    },
    onError: (error: unknown) => {
      showToast(getErrorMessage(error));
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (invitationId: number) => piggiesApi.rejectInvitation(invitationId),
    onSuccess: async () => {
      showToast(t('sharedPiggyInvite.rejectSuccess'));
      queryClient.invalidateQueries({ queryKey: INVITATION_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notificationsCount'] });
    },
    onError: (error: unknown) => {
      showToast(getErrorMessage(error));
    },
  });

  const invitations = invitationsQuery.data ?? [];
  if (invitationsQuery.isLoading) {
    return (
      <Card>
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.loadingText, themedStyles.secondaryText]}>{t('common.loading')}</Text>
        </View>
      </Card>
    );
  }

  if (invitationsQuery.isError) {
    return (
      <Card>
        <Text style={[styles.errorText, themedStyles.errorText]}>{t('sharedPiggyInvite.loadError')}</Text>
        <Pressable onPress={() => invitationsQuery.refetch()} style={styles.retryButton}>
          <Text style={[styles.retryText, { color: colors.primary }]}>{t('common.retry')}</Text>
        </Pressable>
      </Card>
    );
  }

  if (invitations.length === 0) {
    return null;
  }

  return (
    <Card>
      <Text style={[styles.title, themedStyles.title]}>{t('sharedPiggyInvite.title')}</Text>
      <Text style={[styles.subtitle, themedStyles.secondaryText]}>{t('sharedPiggyInvite.subtitle')}</Text>

      {invitations.map((invitation) => {
        const expiresText = formatDate(invitation.expiresAt, dateFormatter);
        const isMutating =
          acceptMutation.isPending || rejectMutation.isPending;

        return (
          <View
            key={invitation.id}
            style={[styles.invitationItem, themedStyles.invitationItem]}
          >
            <View style={styles.headerRow}>
              <View style={styles.avatarWrap}>
                {invitation.inviterAvatar ? (
                  <Image source={{ uri: invitation.inviterAvatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder, themedStyles.avatarPlaceholder]}>
                    <Text style={styles.avatarText}>{getInitial(invitation.inviterName)}</Text>
                  </View>
                )}
              </View>

              <View style={styles.headerInfo}>
                <Text style={[styles.inviterName, themedStyles.title]}>{invitation.inviterName}</Text>
                <Text style={[styles.piggyTitle, themedStyles.secondaryText]}>{invitation.piggyTitle}</Text>
              </View>
            </View>

            <Text style={[styles.metaText, themedStyles.secondaryText]}>
              {t('sharedPiggyInvite.goalAmount')}: {currencyFormatter.format(invitation.goalAmount)}
            </Text>
            <Text style={[styles.metaText, themedStyles.secondaryText]}>
              {t('sharedPiggyInvite.expiresAt')}: {expiresText}
            </Text>

            <View style={styles.actionRow}>
              <Pressable
                onPress={() => rejectMutation.mutate(invitation.id)}
                disabled={isMutating}
                style={[styles.secondaryAction, themedStyles.secondaryAction]}
              >
                <Text style={[styles.secondaryActionText, themedStyles.secondaryActionText]}>
                  {t('sharedPiggyInvite.reject')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => acceptMutation.mutate(invitation.id)}
                disabled={isMutating}
                style={[styles.primaryAction, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.primaryActionText, { color: colors.textOnPrimary ?? '#fff' }]}>
                  {t('sharedPiggyInvite.accept')}
                </Text>
              </Pressable>
            </View>
          </View>
        );
      })}
    </Card>
  );
}

function formatDate(value: string, formatter: Intl.DateTimeFormat): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return formatter.format(parsed);
}

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    title: {
      color: colors.text,
    },
    secondaryText: {
      color: colors.textSecondary,
    },
    errorText: {
      color: colors.error,
    },
    invitationItem: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.border,
    },
    avatarPlaceholder: {
      backgroundColor: colors.backgroundSecondary,
    },
    secondaryAction: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    secondaryActionText: {
      color: colors.text,
    },
  });

const styles = StyleSheet.create({
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  loadingText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  title: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  subtitle: {
    marginTop: tokens.spacing.xs,
    marginBottom: tokens.spacing.sm,
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  invitationItem: {
    paddingTop: tokens.spacing.md,
    marginTop: tokens.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  avatarWrap: {
    width: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  headerInfo: {
    flex: 1,
  },
  inviterName: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  piggyTitle: {
    marginTop: 2,
    fontSize: tokens.typography.fontSizes.sm,
  },
  metaText: {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.typography.fontSizes.sm,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  secondaryAction: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  secondaryActionText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  primaryAction: {
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
  },
  primaryActionText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
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
});
