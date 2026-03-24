/**
 * useResilientMutation Hook
 * 
 * Wraps React Query mutations with:
 * - Offline queue support
 * - Optimistic updates
 * - Automatic rollback on failure
 * - Pending sync status tracking
 * 
 * @module hooks/useResilientMutation
 */

import { useCallback, useEffect, useState } from 'react';
import {
  useMutation,
  useQueryClient,
  UseMutationOptions,
  UseMutationResult,
  QueryKey,
} from '@tanstack/react-query';
import type { MutationFunctionContext } from '@tanstack/query-core';
import { v4 as uuidv4 } from 'uuid';
import { syncQueue, SyncTask, registerMutationType, SyncQueueState } from '../system/syncQueue';
import { networkMonitor, useIsOnline } from '../system/networkMonitor';
import { useCorrelationStore } from '../system/correlationStore';

// =====================================
// TYPES
// =====================================

export interface ResilientMutationOptions<TData, TError, TVariables, TContext>
  extends Omit<UseMutationOptions<TData, TError, TVariables, TContext>, 'mutationFn'> {
  /**
   * Unique identifier for this mutation type (used for queue registration)
   */
  mutationType: string;

  /**
   * The mutation function to execute
   */
  mutationFn: (variables: TVariables) => Promise<TData>;

  /**
   * Query keys to invalidate on success
   */
  invalidateKeys?: QueryKey[];

  /**
   * Query key to use for optimistic update cache
   */
  optimisticQueryKey?: QueryKey;

  /**
   * Function to create optimistic data from variables
   */
  getOptimisticData?: (variables: TVariables, optimisticId: string) => unknown;

  /**
   * Function to update cache with optimistic data
   */
  optimisticUpdater?: (
    oldData: unknown,
    optimisticData: unknown,
    variables: TVariables
  ) => unknown;

  /**
   * Whether to allow offline queueing (default: true)
   */
  allowOffline?: boolean;

  /**
   * Max retry attempts for queued mutations (default: 3)
   */
  maxRetries?: number;
}

export type ResilientMutationResult<TData, TError, TVariables, TContext> =
  UseMutationResult<TData, TError, TVariables, TContext> & {
  /**
   * Whether the mutation is pending in the offline queue
   */
  isPendingSync: boolean;

  /**
   * Number of pending sync items for this mutation type
   */
  pendingSyncCount: number;

  /**
   * Whether currently online
   */
  isOnline: boolean;
};

interface OptimisticContext {
  previousData: unknown;
  optimisticId: string;
  queryKey: QueryKey;
}

// =====================================
// SYNC QUEUE STATE HOOK
// =====================================

function useSyncQueueState(): SyncQueueState {
  const [state, setState] = useState<SyncQueueState>(() => syncQueue.getState());

  useEffect(() => {
    const unsubscribe = syncQueue.subscribe(setState);
    return unsubscribe;
  }, []);

  return state;
}

// =====================================
// MAIN HOOK
// =====================================

export function useResilientMutation<
  TData = unknown,
  TError = Error,
  TVariables = void,
  TContext = OptimisticContext
>(
  options: ResilientMutationOptions<TData, TError, TVariables, TContext>
): ResilientMutationResult<TData, TError, TVariables, TContext> {
  const queryClient = useQueryClient();
  const isOnline = useIsOnline();
  const syncQueueState = useSyncQueueState();
  const setLastAction = useCorrelationStore((s) => s.setLastAction);

  const {
    mutationType,
    mutationFn,
    invalidateKeys,
    optimisticQueryKey,
    getOptimisticData,
    optimisticUpdater,
    allowOffline = true,
    maxRetries = 3,
    onMutate,
    onError,
    onSuccess,
    onSettled,
    ...restOptions
  } = options;

  // =====================================
  // REGISTER MUTATION TYPE
  // =====================================

  useEffect(() => {
    registerMutationType(mutationType, {
      executor: async (task: SyncTask) => {
        const variables = task.payload as TVariables;
        return await mutationFn(variables);
      },
      onSuccess: (task, result) => {
        // Invalidate queries on sync success
        invalidateKeys?.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: key });
        });

        // Replace optimistic ID with real ID if applicable
        if (task.optimisticId && optimisticQueryKey) {
          const data = queryClient.getQueryData(optimisticQueryKey);
          if (Array.isArray(data)) {
            const updated = data.map((item: { id?: string; _optimisticId?: string }) =>
              item._optimisticId === task.optimisticId
                ? { ...item, ...(result as object), _optimisticId: undefined, _pending: false }
                : item
            );
            queryClient.setQueryData(optimisticQueryKey, updated);
          }
        }
      },
      onFailed: (task) => {
        // Rollback optimistic update on permanent failure
        if (task.optimisticId && optimisticQueryKey) {
          const data = queryClient.getQueryData(optimisticQueryKey);
          if (Array.isArray(data)) {
            const filtered = data.filter(
              (item: { _optimisticId?: string }) => item._optimisticId !== task.optimisticId
            );
            queryClient.setQueryData(optimisticQueryKey, filtered);
          }
        }
      },
    });
  }, [mutationType, mutationFn, invalidateKeys, optimisticQueryKey, queryClient]);

  // =====================================
  // WRAPPED MUTATION
  // =====================================

  const mutation = useMutation<TData, TError, TVariables, TContext>({
    mutationFn: async (variables: TVariables) => {
      // Track action for correlation
      setLastAction(`${mutationType}:${Date.now()}`);

      // If offline and allowed, queue the mutation
      if (!isOnline && allowOffline) {
        const optimisticId = uuidv4();
        
        await syncQueue.enqueue(mutationType, variables, {
          optimisticId,
          maxRetries,
        });

        // Return a fake response for optimistic update
        // The actual response will come when synced
        throw new OfflineMutationError(optimisticId);
      }

      // Online - execute normally
      return await mutationFn(variables);
    },

    onMutate: async (variables, mutationContext): Promise<TContext> => {
      // Track action
      setLastAction(`${mutationType}:mutate`);

      // Cancel outgoing refetches
      if (optimisticQueryKey) {
        await queryClient.cancelQueries({ queryKey: optimisticQueryKey });
      }

      // Snapshot previous data
      const previousData = optimisticQueryKey
        ? queryClient.getQueryData(optimisticQueryKey)
        : undefined;

      const optimisticId = uuidv4();

      // Apply optimistic update
      if (optimisticQueryKey && getOptimisticData && optimisticUpdater) {
        const optimisticData = getOptimisticData(variables, optimisticId);
        const newData = optimisticUpdater(previousData, optimisticData, variables);
        queryClient.setQueryData(optimisticQueryKey, newData);
      }

      // Call user's onMutate if provided
      const userContext = await onMutate?.(variables, mutationContext);

      return {
        ...userContext,
        previousData,
        optimisticId,
        queryKey: optimisticQueryKey,
      } as TContext;
    },

    onError: (error, variables, context, mutationContext: MutationFunctionContext) => {
      // Handle offline queued mutation
      if (error instanceof OfflineMutationError) {
        // Keep optimistic update but mark as pending
        if (optimisticQueryKey) {
          const data = queryClient.getQueryData(optimisticQueryKey);
          if (Array.isArray(data)) {
            const updated = data.map((item: { _optimisticId?: string }) =>
              item._optimisticId === error.optimisticId
                ? { ...item, _pending: true }
                : item
            );
            queryClient.setQueryData(optimisticQueryKey, updated);
          }
        }
        return;
      }

      // Rollback optimistic update on real error
      const ctx = context as OptimisticContext | undefined;
      if (ctx?.queryKey && ctx?.previousData !== undefined) {
        queryClient.setQueryData(ctx.queryKey, ctx.previousData);
      }

      // Call user's onError
      onError?.(error, variables, context, mutationContext);
    },

    onSuccess: (data, variables, context, mutationContext: MutationFunctionContext) => {
      // Replace optimistic ID with real ID
      const ctx = context as OptimisticContext | undefined;
      if (optimisticQueryKey && ctx?.optimisticId) {
        const currentData = queryClient.getQueryData(optimisticQueryKey);
        if (Array.isArray(currentData)) {
          const updated = currentData.map((item: { _optimisticId?: string }) =>
            item._optimisticId === ctx.optimisticId
              ? { ...item, ...(data as object), _optimisticId: undefined, _pending: false }
              : item
          );
          queryClient.setQueryData(optimisticQueryKey, updated);
        }
      }

      // Invalidate queries
      invalidateKeys?.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });

      // Call user's onSuccess
      onSuccess?.(data, variables, context as TContext, mutationContext);
    },

    onSettled: (data, error, variables, context, mutationContext: MutationFunctionContext) => {
      // Call user's onSettled
      onSettled?.(data, error, variables, context as TContext, mutationContext);
    },

    ...restOptions,
  });

  // =====================================
  // PENDING SYNC TRACKING
  // =====================================

  const pendingTasks = syncQueueState.tasks.filter(
    (t) => t.type === mutationType && (t.status === 'pending' || t.status === 'processing')
  );

  return {
    ...mutation,
    isPendingSync: pendingTasks.length > 0,
    pendingSyncCount: pendingTasks.length,
    isOnline,
  };
}

// =====================================
// OFFLINE MUTATION ERROR
// =====================================

class OfflineMutationError extends Error {
  optimisticId: string;

  constructor(optimisticId: string) {
    super('Mutation queued for sync');
    this.name = 'OfflineMutationError';
    this.optimisticId = optimisticId;
  }
}

// =====================================
// SYNC STATUS HOOK
// =====================================

export function useSyncStatus(): {
  pendingCount: number;
  isProcessing: boolean;
  lastSyncTime: number | null;
  forceSync: () => Promise<void>;
} {
  const syncQueueState = useSyncQueueState();

  const forceSync = useCallback(async () => {
    await networkMonitor.forceSync();
  }, []);

  return {
    pendingCount: syncQueueState.tasks.filter(
      (t) => t.status === 'pending' || t.status === 'processing'
    ).length,
    isProcessing: syncQueueState.isProcessing,
    lastSyncTime: syncQueueState.lastSyncTime,
    forceSync,
  };
}

// =====================================
// PENDING INDICATOR COMPONENT
// =====================================

export function isPending(item: { _pending?: boolean }): boolean {
  return item._pending === true;
}
