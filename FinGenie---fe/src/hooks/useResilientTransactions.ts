/**
 * Resilient Transaction Mutations
 * 
 * Example implementation of useResilientMutation for transaction operations.
 * Demonstrates:
 * - Offline queue support
 * - Optimistic updates
 * - Automatic rollback
 * 
 * @module hooks/useResilientTransactions
 */

import { useQueryClient } from '@tanstack/react-query';
import { useResilientMutation, ResilientMutationOptions } from './useResilientMutation';
import { apiClient } from '../api/client';
import { v4 as uuidv4 } from 'uuid';

// =====================================
// TYPES
// =====================================

export interface Transaction {
  id: string;
  walletId: string;
  categoryId: string;
  amount: number;
  description: string;
  date: string;
  type: 'income' | 'expense';
  _optimisticId?: string;
  _pending?: boolean;
}

export interface CreateTransactionInput {
  walletId: string;
  categoryId: string;
  amount: number;
  description: string;
  date?: string;
  type: 'income' | 'expense';
}

// =====================================
// API FUNCTIONS
// =====================================

async function createTransactionApi(input: CreateTransactionInput): Promise<Transaction> {
  const response = await apiClient.post<Transaction>('/transactions', input);
  return response.data;
}

async function updateTransactionApi(
  id: string,
  input: Partial<CreateTransactionInput>
): Promise<Transaction> {
  const response = await apiClient.put<Transaction>(`/transactions/${id}`, input);
  return response.data;
}

async function deleteTransactionApi(id: string): Promise<void> {
  await apiClient.delete(`/transactions/${id}`);
}

// =====================================
// QUERY KEYS
// =====================================

export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (walletId: string) => [...transactionKeys.lists(), walletId] as const,
  detail: (id: string) => [...transactionKeys.all, 'detail', id] as const,
};

// =====================================
// CREATE TRANSACTION HOOK
// =====================================

export function useCreateTransaction(walletId: string) {
  const queryClient = useQueryClient();

  return useResilientMutation<Transaction, Error, CreateTransactionInput>({
    mutationType: 'CREATE_TRANSACTION',
    
    mutationFn: createTransactionApi,
    
    // Query keys to invalidate on success
    invalidateKeys: [
      transactionKeys.list(walletId),
      ['wallets', walletId], // Invalidate wallet balance
    ],
    
    // Query to update optimistically
    optimisticQueryKey: transactionKeys.list(walletId),
    
    // Create optimistic data
    getOptimisticData: (input, optimisticId) => ({
      id: `temp-${optimisticId}`,
      ...input,
      date: input.date ?? new Date().toISOString(),
      _optimisticId: optimisticId,
      _pending: true,
    }),
    
    // Update cache optimistically (prepend new transaction)
    optimisticUpdater: (oldData, optimisticData) => {
      const transactions = (oldData as Transaction[] | undefined) ?? [];
      return [optimisticData as Transaction, ...transactions];
    },
    
    // Allow offline queueing
    allowOffline: true,
    maxRetries: 3,
    
    onSuccess: (data) => {
      console.log('[Transaction] Created:', data.id);
    },
    
    onError: (error) => {
      console.error('[Transaction] Create failed:', error.message);
    },
  });
}

// =====================================
// UPDATE TRANSACTION HOOK
// =====================================

interface UpdateTransactionInput {
  id: string;
  data: Partial<CreateTransactionInput>;
}

export function useUpdateTransaction(walletId: string) {
  return useResilientMutation<Transaction, Error, UpdateTransactionInput>({
    mutationType: 'UPDATE_TRANSACTION',
    
    mutationFn: async ({ id, data }) => updateTransactionApi(id, data),
    
    invalidateKeys: [
      transactionKeys.list(walletId),
    ],
    
    optimisticQueryKey: transactionKeys.list(walletId),
    
    getOptimisticData: ({ id, data }, optimisticId) => ({
      id,
      ...data,
      _optimisticId: optimisticId,
      _pending: true,
    }),
    
    optimisticUpdater: (oldData, optimisticData, { id }) => {
      const transactions = (oldData as Transaction[] | undefined) ?? [];
      return transactions.map((tx) =>
        tx.id === id ? { ...tx, ...(optimisticData as Partial<Transaction>), _pending: true } : tx
      );
    },
    
    allowOffline: true,
  });
}

// =====================================
// DELETE TRANSACTION HOOK
// =====================================

export function useDeleteTransaction(walletId: string) {
  return useResilientMutation<void, Error, string>({
    mutationType: 'DELETE_TRANSACTION',
    
    mutationFn: deleteTransactionApi,
    
    invalidateKeys: [
      transactionKeys.list(walletId),
    ],
    
    optimisticQueryKey: transactionKeys.list(walletId),
    
    getOptimisticData: (id, optimisticId) => ({ id, _optimisticId: optimisticId }),
    
    // Remove item optimistically
    optimisticUpdater: (oldData, _, id) => {
      const transactions = (oldData as Transaction[] | undefined) ?? [];
      return transactions.filter((tx) => tx.id !== id);
    },
    
    allowOffline: true,
  });
}
