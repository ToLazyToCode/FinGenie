import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tokens } from '../theme';
import { GradientButton, Card } from '../components/ui';
import { budgetsApi, categoriesApi } from '../api/modules';
import type { BudgetResponse, CategoryResponse, PeriodType } from '../api/modules';

interface BudgetFormData {
  categoryId: number;
  limitAmount: string;
  periodType: PeriodType;
  isActive: boolean;
}

const PERIODS: { label: string; value: PeriodType }[] = [
  { label: 'Daily', value: 'DAILY' },
  { label: 'Weekly', value: 'WEEKLY' },
  { label: 'Monthly', value: 'MONTHLY' },
  { label: 'Yearly', value: 'YEARLY' },
];

export function BudgetScreen() {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingBudget, setEditingBudget] = useState<BudgetResponse | null>(null);
  const [formData, setFormData] = useState<BudgetFormData>({
    categoryId: 0,
    limitAmount: '',
    periodType: 'MONTHLY',
    isActive: true,
  });

  // Fetch budgets
  const { data: budgets, isLoading: budgetsLoading, refetch } = useQuery({
    queryKey: ['budgets'],
    queryFn: async () => {
      const response = await budgetsApi.getAll();
      return response.data;
    },
  });

  // Fetch budget summary
  const { data: summary } = useQuery({
    queryKey: ['budgetSummary'],
    queryFn: async () => {
      const response = await budgetsApi.getSummary();
      return response.data;
    },
  });

  // Fetch categories for selection
  const { data: categories } = useQuery({
    queryKey: ['categories', 'EXPENSE'],
    queryFn: async () => {
      const response = await categoriesApi.getByType('EXPENSE');
      return response.data;
    },
  });

  // Create budget mutation
  const createMutation = useMutation({
    mutationFn: budgetsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgetSummary'] });
      closeModal();
      Alert.alert('Success', 'Budget created successfully');
    },
    onError: (error: { message?: string }) => {
      Alert.alert('Error', error.message || 'Failed to create budget');
    },
  });

  // Update budget mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof budgetsApi.update>[1] }) =>
      budgetsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgetSummary'] });
      closeModal();
      Alert.alert('Success', 'Budget updated successfully');
    },
    onError: (error: { message?: string }) => {
      Alert.alert('Error', error.message || 'Failed to update budget');
    },
  });

  // Delete budget mutation
  const deleteMutation = useMutation({
    mutationFn: budgetsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['budgetSummary'] });
      Alert.alert('Success', 'Budget deleted successfully');
    },
    onError: (error: { message?: string }) => {
      Alert.alert('Error', error.message || 'Failed to delete budget');
    },
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const openModal = useCallback((budget?: BudgetResponse) => {
    if (budget) {
      setEditingBudget(budget);
      setFormData({
        categoryId: budget.categoryId,
        limitAmount: budget.limitAmount.toString(),
        periodType: budget.periodType,
        isActive: budget.isActive,
      });
    } else {
      setEditingBudget(null);
      setFormData({
        categoryId: categories?.[0]?.categoryId || 0,
        limitAmount: '',
        periodType: 'MONTHLY',
        isActive: true,
      });
    }
    setModalVisible(true);
  }, [categories]);

  const closeModal = useCallback(() => {
    setModalVisible(false);
    setEditingBudget(null);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!formData.categoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!formData.limitAmount || parseFloat(formData.limitAmount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    const data = {
      categoryId: formData.categoryId,
      limitAmount: parseFloat(formData.limitAmount),
      periodType: formData.periodType,
    };

    if (editingBudget) {
      updateMutation.mutate({ id: editingBudget.id, data });
    } else {
      createMutation.mutate(data);
    }
  }, [formData, editingBudget, createMutation, updateMutation]);

  const handleDelete = useCallback((budget: BudgetResponse) => {
    Alert.alert(
      'Delete Budget',
      `Are you sure you want to delete the budget for ${budget.categoryName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(budget.id),
        },
      ]
    );
  }, [deleteMutation]);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return tokens.colors.error;
    if (percentage >= 80) return tokens.colors.warning;
    return tokens.colors.success;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  if (budgetsLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={tokens.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        {summary && (
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Budget Overview</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Budget</Text>
                <Text style={styles.summaryValue}>{formatCurrency(summary.totalLimit)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Spent</Text>
                <Text style={[styles.summaryValue, styles.spentValue]}>
                  {formatCurrency(summary.totalSpent)}
                </Text>
              </View>
            </View>
            <View style={styles.overallProgress}>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(summary.overallPercentage, 100)}%`,
                      backgroundColor: getProgressColor(summary.overallPercentage),
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{summary.overallPercentage.toFixed(1)}%</Text>
            </View>
            {summary.budgetsExceeded > 0 && (
              <View style={styles.alertBadge}>
                <Text style={styles.alertText}>
                  ⚠️ {summary.budgetsExceeded} budget{summary.budgetsExceeded > 1 ? 's' : ''} exceeded threshold
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* Budget List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Budgets</Text>
            <Pressable style={styles.addButton} onPress={() => openModal()}>
              <Text style={styles.addButtonText}>+ Add Budget</Text>
            </Pressable>
          </View>

          {budgets?.length === 0 ? (
            <Card style={styles.emptyCard}>
              <Text style={styles.emptyText}>No budgets set up yet</Text>
              <Text style={styles.emptySubtext}>
                Create budgets to track your spending by category
              </Text>
            </Card>
          ) : (
            budgets?.map((budget) => (
              <Card key={budget.id} style={styles.budgetCard}>
                <Pressable
                  style={styles.budgetContent}
                  onPress={() => openModal(budget)}
                  onLongPress={() => handleDelete(budget)}
                >
                  <View style={styles.budgetHeader}>
                    <View style={styles.budgetInfo}>
                      <Text style={styles.categoryName}>{budget.categoryName}</Text>
                      <Text style={styles.periodBadge}>{budget.periodType}</Text>
                    </View>
                    {!budget.isActive && (
                      <View style={styles.inactiveBadge}>
                        <Text style={styles.inactiveText}>Inactive</Text>
                      </View>
                    )}
                  </View>
                  
                  <View style={styles.budgetStats}>
                    <Text style={styles.spentAmount}>
                      {formatCurrency(budget.spentAmount)} / {formatCurrency(budget.limitAmount)}
                    </Text>
                    <Text style={styles.remainingAmount}>
                      {formatCurrency(budget.remainingAmount)} left
                    </Text>
                  </View>

                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.min(budget.percentageUsed, 100)}%`,
                            backgroundColor: getProgressColor(budget.percentageUsed),
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.percentage, { color: getProgressColor(budget.percentageUsed) }]}>
                      {budget.percentageUsed.toFixed(0)}%
                    </Text>
                  </View>

                  {budget.status === 'EXCEEDED' && (
                    <View style={styles.overBudgetAlert}>
                      <Text style={styles.overBudgetText}>
                        🚨 Over budget by {formatCurrency(Math.abs(budget.remainingAmount))}
                      </Text>
                    </View>
                  )}
                </Pressable>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      {/* Create/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingBudget ? 'Edit Budget' : 'Create Budget'}
            </Text>

            {/* Category Selection */}
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {categories?.map((cat: CategoryResponse) => (
                <Pressable
                  key={cat.categoryId}
                  style={[
                    styles.categoryChip,
                    formData.categoryId === cat.categoryId && styles.categoryChipSelected,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, categoryId: cat.categoryId }))}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      formData.categoryId === cat.categoryId && styles.categoryChipTextSelected,
                    ]}
                  >
                    {cat.categoryName}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Amount Input */}
            <Text style={styles.inputLabel}>Budget Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              placeholderTextColor={tokens.colors.textMuted}
              keyboardType="numeric"
              value={formData.limitAmount}
              onChangeText={(text) => setFormData(prev => ({ ...prev, limitAmount: text }))}
            />

            {/* Period Selection */}
            <Text style={styles.inputLabel}>Period</Text>
            <View style={styles.periodRow}>
              {PERIODS.map((period) => (
                <Pressable
                  key={period.value}
                  style={[
                    styles.periodChip,
                    formData.periodType === period.value && styles.periodChipSelected,
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, periodType: period.value }))}
                >
                  <Text
                    style={[
                      styles.periodChipText,
                      formData.periodType === period.value && styles.periodChipTextSelected,
                    ]}
                  >
                    {period.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelButton} onPress={closeModal}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <GradientButton
                title={createMutation.isPending || updateMutation.isPending ? 'Saving...' : 'Save'}
                onPress={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                style={styles.saveButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: tokens.spacing.md,
  },
  summaryCard: {
    marginBottom: tokens.spacing.lg,
    padding: tokens.spacing.lg,
  },
  summaryTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.md,
  },
  summaryItem: {},
  summaryLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.xs,
  },
  summaryValue: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
  },
  spentValue: {
    color: tokens.colors.warning,
  },
  overallProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: tokens.colors.backgroundSecondary,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
    color: tokens.colors.text,
    minWidth: 50,
    textAlign: 'right',
  },
  alertBadge: {
    marginTop: tokens.spacing.md,
    padding: tokens.spacing.sm,
    backgroundColor: `${tokens.colors.warning}20`,
    borderRadius: tokens.borderRadius.sm,
  },
  alertText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.warning,
    textAlign: 'center',
  },
  section: {
    marginBottom: tokens.spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
  },
  addButton: {
    padding: tokens.spacing.sm,
  },
  addButtonText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  emptyCard: {
    padding: tokens.spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  emptySubtext: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
  },
  budgetCard: {
    marginBottom: tokens.spacing.sm,
    padding: 0,
    overflow: 'hidden',
  },
  budgetContent: {
    padding: tokens.spacing.md,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  budgetInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  categoryName: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
    color: tokens.colors.text,
  },
  periodBadge: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
    backgroundColor: tokens.colors.backgroundSecondary,
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.sm,
  },
  inactiveBadge: {
    backgroundColor: tokens.colors.textMuted,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 2,
    borderRadius: tokens.borderRadius.sm,
  },
  inactiveText: {
    fontSize: tokens.typography.fontSizes.xs,
    color: '#fff',
  },
  budgetStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: tokens.spacing.sm,
  },
  spentAmount: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.text,
  },
  remainingAmount: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  percentage: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.bold,
    minWidth: 40,
    textAlign: 'right',
  },
  overBudgetAlert: {
    marginTop: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    backgroundColor: `${tokens.colors.error}20`,
    borderRadius: tokens.borderRadius.sm,
  },
  overBudgetText: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.error,
    textAlign: 'center',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: tokens.colors.surface,
    borderTopLeftRadius: tokens.borderRadius.xl,
    borderTopRightRadius: tokens.borderRadius.xl,
    padding: tokens.spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.lg,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
    marginTop: tokens.spacing.md,
  },
  input: {
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.text,
  },
  categoryScroll: {
    maxHeight: 50,
  },
  categoryChip: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.borderRadius.md,
    marginRight: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  categoryChipSelected: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  categoryChipText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.text,
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  periodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  periodChip: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  periodChipSelected: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  periodChipText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.text,
  },
  periodChipTextSelected: {
    color: '#fff',
  },
  thresholdRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
  },
  thresholdChip: {
    flex: 1,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.borderRadius.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    alignItems: 'center',
  },
  thresholdChipSelected: {
    backgroundColor: tokens.colors.warning,
    borderColor: tokens.colors.warning,
  },
  thresholdChipText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.text,
  },
  thresholdChipTextSelected: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.xl,
  },
  cancelButton: {
    flex: 1,
    padding: tokens.spacing.md,
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.text,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  saveButton: {
    flex: 1,
  },
});
