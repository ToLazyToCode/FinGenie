import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { Card } from '../components/ui';
import { tokens } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import {
  billingApi,
  type BillingOrderResponse,
  type BillingPlanResponse,
  type PaymentGateway,
  type PaymentOrderStatus,
} from '../api/modules';
import type { AppStackParamList } from '../navigation/types';
import { BILLING_RETURN_URL, parseBillingReturnUrl } from '../utils/billingReturn';

const PENDING_STATUSES: PaymentOrderStatus[] = ['PENDING', 'REDIRECTED'];

export function SubscriptionScreen() {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { colors } = useThemeStore();
  const { t, locale } = useI18n();
  const themedStyles = getThemedStyles(colors);
  const text = useMemo(
    () => ({
      subtitle: t('subscription.subtitle'),
      gatewayTitle: t('subscription.gatewayTitle'),
      plansTitle: t('subscription.plansTitle'),
      orderTitle: t('subscription.orderTitle'),
      startCheckout: t('subscription.startCheckout'),
      processing: t('subscription.processing'),
      refresh: t('subscription.refresh'),
      openCheckoutAgain: t('subscription.openCheckoutAgain'),
      noOrderYet: t('subscription.noOrderYet'),
      pending: t('subscription.status.pending'),
      paid: t('subscription.status.paid'),
      failed: t('subscription.status.failed'),
      expired: t('subscription.status.expired'),
      cancelled: t('subscription.status.cancelled'),
      unknown: t('subscription.status.unknown'),
      selectGateway: t('subscription.selectGateway'),
      selectPlan: t('subscription.selectPlan'),
      cannotOpenCheckout: t('subscription.cannotOpenCheckout'),
      loadPlansError: t('subscription.loadPlansError'),
      durationUnit: t('subscription.daysUnit'),
      orderLabel: t('subscription.orderLabel'),
      statusLabel: t('subscription.statusLabel'),
      gatewayLabel: t('subscription.gatewayLabel'),
    }),
    [t]
  );

  const [selectedGateway, setSelectedGateway] = useState<PaymentGateway>('PAYOS');
  const [selectedPlanCode, setSelectedPlanCode] = useState<string | null>(null);
  const [currentOrderCode, setCurrentOrderCode] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);

  const openCheckout = useCallback(
    async (targetUrl: string) => {
      if (!targetUrl) {
        Alert.alert(text.unknown, text.cannotOpenCheckout);
        return;
      }

      const canOpen = await Linking.canOpenURL(targetUrl);
      if (!canOpen) {
        Alert.alert(text.unknown, text.cannotOpenCheckout);
        return;
      }

      if (Platform.OS === 'web') {
        await Linking.openURL(targetUrl);
        return;
      }

      try {
        const result = await WebBrowser.openAuthSessionAsync(targetUrl, BILLING_RETURN_URL);
        if (result.type === 'success') {
          const params = parseBillingReturnUrl(result.url);
          if (params) {
            navigation.navigate('CheckoutResult', params);
            return;
          }
        }

        if (result.type === 'cancel' || result.type === 'dismiss') {
          return;
        }
      } catch (error) {
        console.warn('[SubscriptionScreen] Falling back to external checkout browser.', error);
      }

      await Linking.openURL(targetUrl);
    },
    [navigation, text.cannotOpenCheckout, text.unknown]
  );

  const {
    data: plans,
    isLoading: isLoadingPlans,
    isError: isPlansError,
    refetch: refetchPlans,
  } = useQuery<BillingPlanResponse[]>({
    queryKey: ['billing-plans'],
    queryFn: async () => {
      const response = await billingApi.getPlans();
      return response.data;
    },
  });

  const {
    data: order,
    isFetching: isFetchingOrder,
    refetch: refetchOrder,
  } = useQuery<BillingOrderResponse>({
    queryKey: ['billing-order', currentOrderCode],
    enabled: !!currentOrderCode,
    queryFn: async () => {
      const response = await billingApi.getOrder(currentOrderCode!);
      return response.data;
    },
    refetchInterval: (query) => {
      const currentStatus = (query.state.data as BillingOrderResponse | undefined)?.status;
      if (currentStatus && PENDING_STATUSES.includes(currentStatus)) {
        return 5000;
      }
      return false;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: async () => {
      if (!selectedGateway) {
        throw new Error(text.selectGateway);
      }
      if (!selectedPlanCode) {
        throw new Error(text.selectPlan);
      }

      const response = await billingApi.checkout({
        planCode: selectedPlanCode,
        gateway: selectedGateway,
      });
      return response.data;
    },
    onSuccess: async (response) => {
      setCurrentOrderCode(response.orderCode);
      setCheckoutUrl(response.checkoutUrl);
      await openCheckout(response.checkoutUrl);
    },
    onError: (error: Error) => {
      Alert.alert(text.unknown, error.message || text.unknown);
    },
  });

  useEffect(() => {
    if (!plans || plans.length === 0) {
      return;
    }
    if (!selectedPlanCode) {
      setSelectedPlanCode(plans[0].planCode);
    }
  }, [plans, selectedPlanCode]);

  const statusLabel = useMemo(() => {
    const status = order?.status;
    switch (status) {
      case 'PENDING':
      case 'REDIRECTED':
        return text.pending;
      case 'PAID':
        return text.paid;
      case 'FAILED':
        return text.failed;
      case 'EXPIRED':
        return text.expired;
      case 'CANCELLED':
        return text.cancelled;
      default:
        return text.unknown;
    }
  }, [order?.status, text]);

  const formatVnd = useCallback(
    (amount: number) =>
      new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: 'VND',
        maximumFractionDigits: 0,
      }).format(amount),
    [locale]
  );

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.subtitle, themedStyles.subtitle]}>{text.subtitle}</Text>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, themedStyles.sectionTitle]}>{text.gatewayTitle}</Text>
          <View style={styles.gatewayRow}>
            {(['PAYOS', 'VNPAY'] as PaymentGateway[]).map((gateway) => {
              const selected = selectedGateway === gateway;
              return (
                <Pressable
                  key={gateway}
                  style={[
                    styles.gatewayButton,
                    themedStyles.gatewayButton,
                    selected && themedStyles.gatewayButtonSelected,
                  ]}
                  onPress={() => setSelectedGateway(gateway)}
                >
                  <Text style={[styles.gatewayLabel, selected ? themedStyles.gatewayLabelSelected : themedStyles.gatewayLabel]}>
                    {gateway}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, themedStyles.sectionTitle]}>{text.plansTitle}</Text>
          {isLoadingPlans ? (
            <View style={styles.centerRow}>
              <ActivityIndicator color={colors.primary} />
            </View>
          ) : isPlansError ? (
            <View style={styles.centerRow}>
              <Text style={[styles.metaText, themedStyles.metaText]}>{text.loadPlansError}</Text>
              <Pressable style={[styles.smallButton, themedStyles.secondaryButton]} onPress={() => refetchPlans()}>
                <Text style={[styles.smallButtonText, themedStyles.secondaryButtonText]}>{text.refresh}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.planList}>
              {(plans || []).map((plan) => {
                const selected = selectedPlanCode === plan.planCode;
                return (
                  <Pressable
                    key={plan.planCode}
                    style={[styles.planItem, themedStyles.planItem, selected && themedStyles.planItemSelected]}
                    onPress={() => setSelectedPlanCode(plan.planCode)}
                  >
                    <View style={styles.planHeader}>
                      <Text style={[styles.planTitle, themedStyles.planTitle]}>{plan.title}</Text>
                      <Text style={[styles.planAmount, themedStyles.planAmount]}>{formatVnd(plan.amount)}</Text>
                    </View>
                    {plan.description ? (
                      <Text style={[styles.planDescription, themedStyles.metaText]}>{plan.description}</Text>
                    ) : null}
                    <Text style={[styles.planMeta, themedStyles.metaText]}>
                      {plan.durationDays} {text.durationUnit}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <Pressable
            style={[styles.checkoutButton, themedStyles.primaryButton, checkoutMutation.isPending && themedStyles.primaryButtonDisabled]}
            disabled={checkoutMutation.isPending || !selectedPlanCode}
            onPress={() => checkoutMutation.mutate()}
          >
            <Text style={[styles.checkoutButtonText, themedStyles.primaryButtonText]}>
              {checkoutMutation.isPending ? text.processing : text.startCheckout}
            </Text>
          </Pressable>
        </Card>

        <Card style={styles.sectionCard}>
          <Text style={[styles.sectionTitle, themedStyles.sectionTitle]}>{text.orderTitle}</Text>
          {!currentOrderCode ? (
            <Text style={[styles.metaText, themedStyles.metaText]}>{text.noOrderYet}</Text>
          ) : (
            <View style={styles.orderSection}>
              <View style={styles.orderRow}>
                <Text style={[styles.orderLabel, themedStyles.metaText]}>{text.orderLabel}</Text>
                <Text style={[styles.orderValue, themedStyles.orderValue]}>{currentOrderCode}</Text>
              </View>
              <View style={styles.orderRow}>
                <Text style={[styles.orderLabel, themedStyles.metaText]}>{text.statusLabel}</Text>
                <Text style={[styles.orderValue, themedStyles.orderValue]}>{statusLabel}</Text>
              </View>
              {order?.gateway ? (
                <View style={styles.orderRow}>
                  <Text style={[styles.orderLabel, themedStyles.metaText]}>{text.gatewayLabel}</Text>
                  <Text style={[styles.orderValue, themedStyles.orderValue]}>{order.gateway}</Text>
                </View>
              ) : null}
              <View style={styles.actionsRow}>
                <Pressable style={[styles.smallButton, themedStyles.secondaryButton]} onPress={() => refetchOrder()}>
                  <Text style={[styles.smallButtonText, themedStyles.secondaryButtonText]}>
                    {isFetchingOrder ? `${text.refresh}...` : text.refresh}
                  </Text>
                </Pressable>
                {checkoutUrl ? (
                  <Pressable
                    style={[styles.smallButton, themedStyles.secondaryButton]}
                    onPress={() => {
                      void openCheckout(checkoutUrl);
                    }}
                  >
                    <Text style={[styles.smallButtonText, themedStyles.secondaryButtonText]}>
                      {text.openCheckoutAgain}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          )}
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
    subtitle: {
      color: colors.textSecondary,
    },
    sectionTitle: {
      color: colors.text,
    },
    gatewayButton: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    gatewayButtonSelected: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}20`,
    },
    gatewayLabel: {
      color: colors.text,
    },
    gatewayLabelSelected: {
      color: colors.primary,
    },
    planItem: {
      borderColor: colors.border,
      backgroundColor: colors.backgroundSecondary,
    },
    planItemSelected: {
      borderColor: colors.primary,
      backgroundColor: `${colors.primary}18`,
    },
    planTitle: {
      color: colors.text,
    },
    planAmount: {
      color: colors.primary,
    },
    metaText: {
      color: colors.textSecondary,
    },
    orderValue: {
      color: colors.text,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    primaryButtonDisabled: {
      backgroundColor: colors.disabled,
    },
    primaryButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    secondaryButton: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    secondaryButtonText: {
      color: colors.text,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  sectionCard: {
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  gatewayRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  gatewayButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
  },
  gatewayLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  centerRow: {
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  planList: {
    gap: tokens.spacing.sm,
  },
  planItem: {
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    padding: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  planTitle: {
    flex: 1,
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  planAmount: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  planDescription: {
    fontSize: tokens.typography.fontSizes.xs,
    lineHeight: 18,
  },
  planMeta: {
    fontSize: tokens.typography.fontSizes.xs,
  },
  checkoutButton: {
    marginTop: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  orderSection: {
    gap: tokens.spacing.xs,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
  },
  orderLabel: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  orderValue: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.sm,
  },
  smallButton: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.sm,
  },
  smallButtonText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  metaText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
});
