import React, { useCallback, useMemo, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainTabParamList, AppStackParamList } from '../navigation/types';
import { tokens } from '../theme';
import { Card, BalanceDisplay, GradientButton } from '../components/ui';
import {
  FormInput,
  FormSelect,
  LoadingButton,
  ConfirmDialog,
  SkeletonWalletCard,
} from '../components/form';
import { useForm, walletSchema } from '../utils/validation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletsApi, WalletResponse, WalletType } from '../api/modules';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import { classifyAndDispatchError } from '../utils/errorHandling';
import { Ionicons } from '@expo/vector-icons';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Wallet'>,
  NativeStackNavigationProp<AppStackParamList>
>;

interface WalletFormData {
  walletName: string;
  walletType: WalletType;
  initialBalance: string;
  isDefault: boolean;
}

export function WalletsScreen() {
  const navigation = useNavigation<Nav>();
  const queryClient = useQueryClient();
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const themedStyles = getThemedStyles(colors);
  const walletTypeOptions = useMemo(
    () => [
      { label: t('wallet.typeRegular'), value: 'REGULAR' as WalletType },
      { label: t('wallet.typePiggy'), value: 'PIGGY' as WalletType },
    ],
    [t]
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [editingWallet, setEditingWallet] = useState<WalletResponse | null>(null);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [walletToDelete, setWalletToDelete] = useState<WalletResponse | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const {
    data: wallets = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const { data } = await walletsApi.getAll();
      return data;
    },
  });

  const totalBalance = wallets.reduce((sum, w) => sum + Number(w.balance), 0);

  const initialFormValues: WalletFormData = {
    walletName: '',
    walletType: 'REGULAR',
    initialBalance: '0',
    isDefault: false,
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    setFieldValue,
    setFieldTouched,
    handleSubmit,
    setSubmitting,
    resetForm,
  } = useForm<WalletFormData>({
    initialValues: editingWallet
      ? {
          walletName: editingWallet.walletName,
          walletType: editingWallet.walletType,
          initialBalance: editingWallet.balance.toString(),
          isDefault: editingWallet.isDefault,
        }
      : initialFormValues,
    validationSchema: walletSchema,
    onSubmit: async (formValues) => {
      if (editingWallet) {
        await updateWalletMutation.mutateAsync({
          id: editingWallet.walletId,
          data: formValues,
        });
      } else {
        await createWalletMutation.mutateAsync(formValues);
      }
    },
  });

  // Create wallet mutation
  const createWalletMutation = useMutation({
    mutationFn: async (formData: WalletFormData) => {
      const payload = {
        walletName: formData.walletName,
        walletType: formData.walletType,
        initialBalance: parseFloat(formData.initialBalance) || 0,
        isDefault: formData.isDefault,
      };
      return walletsApi.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      handleCloseModal();
      Alert.alert(t('common.success'), t('wallet.createdSuccess'));
    },
    onError: (error) => {
      classifyAndDispatchError(error, {
        showAlert: true,
        alertTitle: t('wallet.error'),
      });
    },
    onSettled: () => {
      setSubmitting(false);
    },
  });

  // Update wallet mutation
  const updateWalletMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: WalletFormData }) => {
      const payload = {
        walletName: data.walletName,
        walletType: data.walletType,
        isDefault: data.isDefault,
      };
      return walletsApi.update(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      handleCloseModal();
      Alert.alert(t('common.success'), t('wallet.updatedSuccess'));
    },
    onError: (error) => {
      classifyAndDispatchError(error, {
        showAlert: true,
        alertTitle: t('wallet.error'),
      });
    },
    onSettled: () => {
      setSubmitting(false);
    },
  });

  // Delete wallet mutation
  const deleteWalletMutation = useMutation({
    mutationFn: async (walletId: number) => {
      return walletsApi.delete(walletId);
    },
    onMutate: async (walletId) => {
      await queryClient.cancelQueries({ queryKey: ['wallets'] });
      const previousWallets = queryClient.getQueryData<WalletResponse[]>(['wallets']);

      // Optimistically remove wallet
      queryClient.setQueryData<WalletResponse[]>(['wallets'], (old) =>
        old?.filter((w) => w.walletId !== walletId) ?? []
      );

      return { previousWallets };
    },
    onError: (error, _walletId, context) => {
      // Rollback on error
      if (context?.previousWallets) {
        queryClient.setQueryData(['wallets'], context.previousWallets);
      }
      classifyAndDispatchError(error, {
        showAlert: true,
        alertTitle: t('wallet.error'),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      Alert.alert(t('common.success'), t('wallet.deletedSuccess'));
    },
    onSettled: () => {
      setIsDeleting(false);
      setDeleteConfirmVisible(false);
      setWalletToDelete(null);
    },
  });

  const handleOpenAddModal = useCallback(() => {
    setEditingWallet(null);
    resetForm();
    setModalVisible(true);
  }, [resetForm]);

  const handleOpenEditModal = useCallback(
    (wallet: WalletResponse) => {
      setEditingWallet(wallet);
      setFieldValue('walletName', wallet.walletName);
      setFieldValue('walletType', wallet.walletType);
      setFieldValue('initialBalance', wallet.balance.toString());
      setFieldValue('isDefault', wallet.isDefault);
      setModalVisible(true);
    },
    [setFieldValue]
  );

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setEditingWallet(null);
    resetForm();
  }, [resetForm]);

  const handleDeletePress = useCallback((wallet: WalletResponse) => {
    if (wallet.isDefault) {
      Alert.alert(t('common.error'), t('wallet.cannotDeleteDefault'));
      return;
    }
    setWalletToDelete(wallet);
    setDeleteConfirmVisible(true);
  }, [t]);

  const handleConfirmDelete = useCallback(() => {
    if (walletToDelete) {
      setIsDeleting(true);
      deleteWalletMutation.mutate(walletToDelete.walletId);
    }
  }, [walletToDelete, deleteWalletMutation]);

  const renderWalletCard = (wallet: WalletResponse) => (
    <Card
      key={wallet.walletId}
      onPress={() => navigation.navigate('WalletDetail', { walletId: wallet.walletId })}
      style={[styles.walletCard, themedStyles.walletCard]}
    >
      <View style={styles.walletHeader}>
        <View style={styles.walletTitleRow}>
          <Text style={[styles.walletName, themedStyles.walletName]}>{wallet.walletName}</Text>
          {wallet.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>{t('wallet.default')}</Text>
            </View>
          )}
        </View>
        <View style={styles.walletActions}>
          <TouchableOpacity
            onPress={() => handleOpenEditModal(wallet)}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={t('common.edit')}
          >
            <Ionicons
              name="pencil"
              size={18}
              color={colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleDeletePress(wallet)}
            style={styles.actionButton}
            accessibilityRole="button"
            accessibilityLabel={t('common.delete')}
          >
            <Ionicons name="trash-outline" size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.walletType, themedStyles.walletType]}>
        {wallet.walletType === 'PIGGY' ? t('wallet.typePiggy') : t('wallet.typeRegular')}
      </Text>
      <BalanceDisplay amount={Number(wallet.balance)} size="sm" />
    </Card>
  );

  const renderSkeletons = () => (
    <>
      <SkeletonWalletCard />
      <SkeletonWalletCard />
      <SkeletonWalletCard />
    </>
  );

  const renderEmptyState = () => (
    <Card style={themedStyles.emptyCard}>
      <Ionicons
        name="wallet-outline"
        size={48}
        color={colors.textSecondary}
        style={styles.emptyIcon}
      />
      <Text style={[styles.emptyText, themedStyles.emptyText]}>{t('wallet.empty')}</Text>
      <Text style={[styles.emptySubtext, themedStyles.emptySubtext]}>
        {t('wallet.emptyHint')}
      </Text>
    </Card>
  );

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
          />
        }
      >
        {/* Header Summary */}
        <View style={styles.summary}>
          <Text style={[styles.headerTitle, themedStyles.headerTitle]}>{t('wallet.title')}</Text>
          <BalanceDisplay amount={totalBalance} label={t('wallet.totalBalance')} size="md" />
          <GradientButton
            title={t('wallet.add')}
            onPress={handleOpenAddModal}
            size="sm"
            style={styles.addButton}
          />
        </View>

        {/* Loading State */}
        {isLoading && renderSkeletons()}

        {/* Error State */}
        {error && !isLoading && (
          <Card style={themedStyles.errorCard}>
            <Ionicons name="alert-circle" size={32} color={colors.error} />
            <Text style={[styles.error, themedStyles.error]}>{t('common.loadingError')}</Text>
            <LoadingButton
              title={t('common.retry')}
              onPress={() => refetch()}
              variant="outline"
              size="sm"
            />
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && wallets.length === 0 && renderEmptyState()}

        {/* Wallet List */}
        {!isLoading && !error && wallets.map(renderWalletCard)}
      </ScrollView>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <SafeAreaView style={[styles.modalContainer, themedStyles.modalContainer]} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={handleCloseModal} accessibilityRole="button">
              <Text style={[styles.modalCancel, themedStyles.modalCancel]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, themedStyles.modalTitle]}>
              {editingWallet ? t('wallet.edit') : t('wallet.add')}
            </Text>
            <View style={styles.modalHeaderSpacer} />
          </View>

          <ScrollView style={styles.modalContent} keyboardShouldPersistTaps="handled">
            <FormInput
              label={t('wallet.name')}
              placeholder={t('wallet.enterName')}
              value={values.walletName}
              onChangeText={(text) => setFieldValue('walletName', text)}
              onBlur={() => setFieldTouched('walletName')}
              error={touched.walletName ? errors.walletName : undefined}
              required
              accessibilityLabel={t('wallet.name')}
            />

            <FormSelect
              label={t('wallet.type')}
              placeholder={t('wallet.type')}
              value={values.walletType}
              options={walletTypeOptions}
              onChange={(value) => setFieldValue('walletType', value as WalletType)}
              disabled={!!editingWallet}
              required
            />

            {!editingWallet && (
              <FormInput
                label={t('wallet.initialBalance')}
                placeholder="0"
                value={values.initialBalance}
                onChangeText={(text) => setFieldValue('initialBalance', text)}
                onBlur={() => setFieldTouched('initialBalance')}
                error={touched.initialBalance ? errors.initialBalance : undefined}
                keyboardType="decimal-pad"
                accessibilityLabel={t('wallet.initialBalance')}
              />
            )}

            <TouchableOpacity
              style={[styles.checkboxRow, themedStyles.checkboxRow]}
              onPress={() => setFieldValue('isDefault', !values.isDefault)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: values.isDefault }}
            >
              <View style={[styles.checkbox, values.isDefault && styles.checkboxChecked]}>
                {values.isDefault && <Ionicons name="checkmark" size={16} color="white" />}
              </View>
              <Text style={[styles.checkboxLabel, themedStyles.checkboxLabel]}>
                {t('wallet.setAsDefault')}
              </Text>
            </TouchableOpacity>

            <View style={styles.modalButtons}>
              <LoadingButton
                title={editingWallet ? t('common.update') : t('common.create')}
                onPress={handleSubmit}
                loading={isSubmitting}
                variant="primary"
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        visible={deleteConfirmVisible}
        title={t('wallet.deleteConfirm')}
        message={t('wallet.deleteMessage').replace(
          '{name}',
          walletToDelete?.walletName ?? ''
        )}
        confirmText={t('common.delete')}
        cancelText={t('common.cancel')}
        confirmVariant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          setDeleteConfirmVisible(false);
          setWalletToDelete(null);
        }}
        loading={isDeleting}
      />
    </SafeAreaView>
  );
}

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
  },
  summary: {
    marginBottom: tokens.spacing.lg,
  },
  headerTitle: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.sm,
  },
  addButton: {
    marginTop: tokens.spacing.md,
  },
  walletCard: {
    marginBottom: tokens.spacing.md,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: tokens.spacing.xs,
  },
  walletTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  walletName: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.semibold,
    marginRight: tokens.spacing.sm,
  },
  defaultBadge: {
    backgroundColor: `${tokens.colors.primary}20`,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.sm,
  },
  defaultText: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  walletActions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  actionButton: {
    padding: tokens.spacing.xs,
  },
  walletType: {
    fontSize: tokens.typography.fontSizes.sm,
    marginBottom: tokens.spacing.sm,
  },
  emptyIcon: {
    alignSelf: 'center',
    marginBottom: tokens.spacing.sm,
  },
  emptyText: {
    fontSize: tokens.typography.fontSizes.md,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: tokens.typography.fontSizes.sm,
    textAlign: 'center',
    marginTop: tokens.spacing.xs,
  },
  error: {
    textAlign: 'center',
    marginVertical: tokens.spacing.sm,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.border,
  },
  modalCancel: {
    fontSize: tokens.typography.fontSizes.md,
  },
  modalTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  modalHeaderSpacer: {
    width: 60,
  },
  modalContent: {
    flex: 1,
    padding: tokens.spacing.md,
  },
  modalButtons: {
    marginTop: tokens.spacing.lg,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: tokens.spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.sm,
  },
  checkboxChecked: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  checkboxLabel: {
    fontSize: tokens.typography.fontSizes.md,
  },
});

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    headerTitle: {
      color: colors.text,
    },
    walletCard: {
      backgroundColor: colors.surface,
    },
    walletName: {
      color: colors.text,
    },
    walletType: {
      color: colors.textSecondary,
    },
    emptyCard: {
      backgroundColor: colors.surface,
    },
    emptyText: {
      color: colors.text,
    },
    emptySubtext: {
      color: colors.textSecondary,
    },
    errorCard: {
      backgroundColor: colors.surface,
      alignItems: 'center',
      paddingVertical: tokens.spacing.lg,
    },
    error: {
      color: colors.error,
    },
    modalContainer: {
      backgroundColor: colors.background,
    },
    modalCancel: {
      color: colors.primary,
    },
    modalTitle: {
      color: colors.text,
    },
    checkboxRow: {},
    checkboxLabel: {
      color: colors.text,
    },
  });
