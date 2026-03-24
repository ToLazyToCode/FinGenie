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
import { useNavigation, useRoute, type NavigationProp, type RouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { Card } from '../components/ui';
import { billingApi, type BillingOrderResponse, type PaymentOrderStatus } from '../api/modules';
import type { AppStackParamList } from '../navigation/types';
import { tokens } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';

const PENDING_STATUSES: PaymentOrderStatus[] = ['PENDING', 'REDIRECTED'];

type CheckoutResultRoute = RouteProp<AppStackParamList, 'CheckoutResult'>;

export function CheckoutResultScreen() {
  const route = useRoute<CheckoutResultRoute>();
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const themedStyles = getThemedStyles(colors);
  const orderCode = route.params?.orderCode;
  const fallbackStatus = route.params?.status;
  const fallbackGateway = route.params?.gateway;

  const {
    data: order,
    isLoading,
    isFetching,
    refetch,
  } = useQuery<BillingOrderResponse>({
    queryKey: ['billing-order', 'checkout-result', orderCode],
    enabled: Boolean(orderCode),
    queryFn: async () => {
      const response = await billingApi.getOrder(orderCode!);
      return response.data;
    },
    refetchInterval: (query) => {
      const currentStatus = (query.state.data as BillingOrderResponse | undefined)?.status ?? fallbackStatus;
      return currentStatus && PENDING_STATUSES.includes(currentStatus as PaymentOrderStatus) ? 5000 : false;
    },
  });

  const resolvedStatus = order?.status ?? fallbackStatus ?? 'PENDING';
  const resolvedGateway = order?.gateway ?? fallbackGateway ?? 'UNKNOWN';
  const statusLabel = useMemo(() => {
    switch (resolvedStatus) {
      case 'PENDING':
      case 'REDIRECTED':
        return t('subscription.status.pending');
      case 'PAID':
        return t('subscription.status.paid');
      case 'FAILED':
        return t('subscription.status.failed');
      case 'EXPIRED':
        return t('subscription.status.expired');
      case 'CANCELLED':
        return t('subscription.status.cancelled');
      default:
        return t('subscription.status.unknown');
    }
  }, [resolvedStatus, t]);

  const noteText = useMemo(() => {
    switch (resolvedStatus) {
      case 'PENDING':
      case 'REDIRECTED':
        return t('subscription.result.pendingNote');
      case 'PAID':
        return t('subscription.result.paidNote');
      case 'FAILED':
        return t('subscription.result.failedNote');
      case 'EXPIRED':
        return t('subscription.result.expiredNote');
      case 'CANCELLED':
        return t('subscription.result.cancelledNote');
      default:
        return t('subscription.result.unknownNote');
    }
  }, [resolvedStatus, t]);

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={[styles.title, themedStyles.title]}>{statusLabel}</Text>
          <Text style={[styles.note, themedStyles.note]}>{noteText}</Text>

          <View style={styles.metaGroup}>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, themedStyles.metaLabel]}>{t('subscription.orderLabel')}</Text>
              <Text style={[styles.metaValue, themedStyles.metaValue]}>{orderCode ?? '--'}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, themedStyles.metaLabel]}>{t('subscription.statusLabel')}</Text>
              <Text style={[styles.metaValue, themedStyles.metaValue]}>{statusLabel}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={[styles.metaLabel, themedStyles.metaLabel]}>{t('subscription.gatewayLabel')}</Text>
              <Text style={[styles.metaValue, themedStyles.metaValue]}>{resolvedGateway}</Text>
            </View>
          </View>

          {isLoading || isFetching ? (
            <View style={styles.loaderRow}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.primaryButton, themedStyles.primaryButton]}
              onPress={() => navigation.navigate('Subscription')}
            >
              <Text style={[styles.primaryButtonText, themedStyles.primaryButtonText]}>
                {t('subscription.viewPlans')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.secondaryButton, themedStyles.secondaryButton]}
              onPress={() =>
                navigation.navigate('MainTabs', {
                  screen: 'Home',
                })
              }
            >
              <Text style={[styles.secondaryButtonText, themedStyles.secondaryButtonText]}>
                {t('subscription.goHome')}
              </Text>
            </Pressable>
            <Pressable style={styles.linkButton} onPress={() => refetch()}>
              <Text style={[styles.linkButtonText, themedStyles.linkButtonText]}>{t('subscription.refresh')}</Text>
            </Pressable>
          </View>
        </Card>
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
    note: {
      color: colors.textSecondary,
    },
    metaLabel: {
      color: colors.textSecondary,
    },
    metaValue: {
      color: colors.text,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    primaryButtonText: {
      color: colors.textOnPrimary ?? '#fff',
    },
    secondaryButton: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.text,
    },
    linkButtonText: {
      color: colors.primary,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: tokens.spacing.md,
  },
  card: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  note: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  metaGroup: {
    gap: tokens.spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tokens.spacing.md,
  },
  metaLabel: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  metaValue: {
    flexShrink: 1,
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
    textAlign: 'right',
  },
  loaderRow: {
    alignItems: 'center',
  },
  actions: {
    gap: tokens.spacing.sm,
  },
  primaryButton: {
    alignItems: 'center',
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
  },
  primaryButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  secondaryButton: {
    alignItems: 'center',
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    paddingVertical: tokens.spacing.sm,
  },
  secondaryButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.xs,
  },
  linkButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});
