import React, { useState, useCallback } from 'react';
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { tokens } from '../theme';
import { Card, PredictionCard } from '../components/ui';
import { useAIGuesses } from '../hooks';
import { walletsApi, SpendingGuess } from '../api/modules';

export function AIScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedGuess, setSelectedGuess] = useState<SpendingGuess | null>(null);
  const [editAmount, setEditAmount] = useState('');

  const {
    pendingGuesses,
    processedGuesses,
    isLoading,
    error,
    refetch,
    acceptGuess,
    editGuess,
    rejectGuess,
    isProcessing,
  } = useAIGuesses();

  // Fetch wallets for edit fallback when guess has no walletId
  const { data: walletsData } = useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const response = await walletsApi.getAll();
      return response.data;
    },
  });

  const defaultWallet = walletsData?.find(w => w.isDefault) || walletsData?.[0];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleAccept = useCallback(async (guess: SpendingGuess) => {
    try {
      await acceptGuess(guess);
      Alert.alert('Success', 'Transaction created from prediction!');
    } catch (err) {
      Alert.alert('Error', 'Failed to accept prediction');
    }
  }, [acceptGuess]);

  const handleReject = useCallback(async (guess: SpendingGuess) => {
    Alert.alert(
      'Reject Prediction',
      'This helps improve future AI predictions. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            try {
              await rejectGuess(guess, 'User rejected');
            } catch (err) {
              Alert.alert('Error', 'Failed to reject prediction');
            }
          },
        },
      ]
    );
  }, [rejectGuess]);

  const handleEdit = useCallback((guess: SpendingGuess) => {
    setSelectedGuess(guess);
    setEditAmount(guess.amount.toString());
    setEditModalVisible(true);
  }, []);

  const handleSubmitEdit = useCallback(async () => {
    if (!selectedGuess) return;

    const finalAmount = parseFloat(editAmount);
    if (isNaN(finalAmount) || finalAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    try {
      await editGuess(selectedGuess, {
        amount: finalAmount,
        walletId: selectedGuess.walletId ?? defaultWallet?.walletId ?? undefined,
      });
      setEditModalVisible(false);
      setSelectedGuess(null);
      Alert.alert('Success', 'Transaction created with your edits!');
    } catch (err) {
      Alert.alert('Error', 'Failed to process edit');
    }
  }, [selectedGuess, defaultWallet, editAmount, editGuess]);

  const toConfidencePercent = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return value <= 1 ? Math.round(value * 100) : Math.round(value);
  };

  // Transform guesses to prediction card format
  const transformGuess = (guess: SpendingGuess) => ({
    id: guess.id.toString(),
    category: guess.category || 'General',
    amount: guess.amount,
    confidence: toConfidencePercent(guess.confidence),
    description: guess.reasoning || 'AI-generated spending guess',
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>AI Predictions</Text>
        <Text style={styles.subtitle}>
          One-tap to create transactions from smart predictions
        </Text>

        {error && (
          <Card style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        )}

        {/* Pending Predictions */}
        {pendingGuesses.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>Today's Predictions</Text>
            {pendingGuesses.map((guess) => (
              <PredictionCard
                key={guess.id}
                prediction={transformGuess(guess)}
                onAccept={() => handleAccept(guess)}
                onReject={() => handleReject(guess)}
                onEdit={() => handleEdit(guess)}
                style={styles.predictionCard}
                disabled={isProcessing}
              />
            ))}
          </>
        ) : isLoading ? (
          <Card style={styles.loadingCard}>
            <Text style={styles.loadingText}>Loading predictions...</Text>
          </Card>
        ) : (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🔮</Text>
            <Text style={styles.emptyText}>No predictions today</Text>
            <Text style={styles.emptySubtext}>
              Keep logging transactions and AI will learn your spending patterns
            </Text>
          </Card>
        )}

        {/* Processed Predictions */}
        {processedGuesses.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, styles.processedTitle]}>
              Previously Processed
            </Text>
            {processedGuesses.slice(0, 5).map((guess) => (
              <Card key={guess.id} style={styles.processedCard}>
                <View style={styles.processedHeader}>
                  <Text style={styles.processedCategory}>{guess.category || 'General'}</Text>
                  <View style={[
                    styles.statusBadge,
                    guess.status === 'ACCEPTED' && styles.acceptedBadge,
                    guess.status === 'EDITED' && styles.editedBadge,
                    guess.status === 'REJECTED' && styles.rejectedBadge,
                  ]}>
                    <Text style={styles.statusText}>{guess.status}</Text>
                  </View>
                </View>
                <Text style={styles.processedAmount}>
                  {guess.amount.toLocaleString()} {guess.currency}
                </Text>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEditModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Edit Prediction</Text>
            <Text style={styles.modalLabel}>
              Original: {selectedGuess?.amount?.toLocaleString()} {selectedGuess?.currency || 'VND'}
            </Text>
            <Text style={styles.modalLabel}>Your amount:</Text>
            <TextInput
              style={styles.modalInput}
              value={editAmount}
              onChangeText={setEditAmount}
              keyboardType="numeric"
              placeholder="Enter amount"
              placeholderTextColor={tokens.colors.textMuted}
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleSubmitEdit}
                disabled={isProcessing}
              >
                <Text style={styles.confirmButtonText}>
                  {isProcessing ? 'Processing...' : 'Confirm'}
                </Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xxl,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.lg,
  },
  sectionTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.semibold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  processedTitle: {
    marginTop: tokens.spacing.xl,
  },
  errorCard: {
    backgroundColor: tokens.colors.error + '20',
    marginBottom: tokens.spacing.md,
  },
  errorText: {
    color: tokens.colors.error,
    textAlign: 'center',
  },
  loadingCard: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.xl,
  },
  loadingText: {
    color: tokens.colors.textSecondary,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: tokens.spacing.md,
  },
  emptyText: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.text,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
    marginTop: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
  },
  predictionCard: {
    marginBottom: tokens.spacing.md,
  },
  processedCard: {
    marginBottom: tokens.spacing.sm,
    opacity: 0.8,
  },
  processedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  processedCategory: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.text,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  statusBadge: {
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.sm,
    backgroundColor: tokens.colors.border,
  },
  acceptedBadge: {
    backgroundColor: tokens.colors.success + '20',
  },
  editedBadge: {
    backgroundColor: tokens.colors.warning + '20',
  },
  rejectedBadge: {
    backgroundColor: tokens.colors.error + '20',
  },
  statusText: {
    fontSize: tokens.typography.fontSizes.xs,
    fontWeight: tokens.typography.fontWeights.medium,
    color: tokens.colors.textSecondary,
  },
  processedAmount: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.text,
  },
  actualAmount: {
    color: tokens.colors.textSecondary,
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
  },
  modalTitle: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.md,
    textAlign: 'center',
  },
  modalLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
    marginBottom: tokens.spacing.xs,
  },
  modalInput: {
    backgroundColor: tokens.colors.background,
    borderRadius: tokens.borderRadius.md,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    fontSize: tokens.typography.fontSizes.lg,
    color: tokens.colors.text,
    marginVertical: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: tokens.spacing.md,
    marginTop: tokens.spacing.md,
  },
  modalButton: {
    flex: 1,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: tokens.colors.background,
    borderWidth: 1,
    borderColor: tokens.colors.border,
  },
  confirmButton: {
    backgroundColor: tokens.colors.primary,
  },
  cancelButtonText: {
    color: tokens.colors.text,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  confirmButtonText: {
    color: tokens.colors.textOnPrimary,
    fontWeight: tokens.typography.fontWeights.bold,
  },
});

