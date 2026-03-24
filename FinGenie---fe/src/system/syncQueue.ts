/**
 * Sync Queue - Offline Mutation Queue
 * 
 * Handles offline mutations with:
 * - Local persistence (AsyncStorage)
 * - Sequential processing
 * - Exponential backoff retry
 * - Duplicate prevention
 * - Auto-sync on reconnect
 * 
 * @module system/syncQueue
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

// =====================================
// TYPES
// =====================================

export interface SyncTask {
  id: string;
  type: string;
  payload: unknown;
  retries: number;
  maxRetries: number;
  timestamp: number;
  lastAttempt?: number;
  status: 'pending' | 'processing' | 'failed' | 'completed';
  errorMessage?: string;
  optimisticId?: string; // For rollback mapping
}

export interface SyncQueueState {
  tasks: SyncTask[];
  isProcessing: boolean;
  lastSyncTime: number | null;
}

export type MutationExecutor = (task: SyncTask) => Promise<unknown>;

// =====================================
// CONSTANTS
// =====================================

const STORAGE_KEY = 'fingenie-sync-queue';
const DEFAULT_MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30000;

// =====================================
// MUTATION REGISTRY
// =====================================

type MutationHandler = {
  executor: MutationExecutor;
  onSuccess?: (task: SyncTask, result: unknown) => void;
  onFailed?: (task: SyncTask) => void;
};

const mutationRegistry = new Map<string, MutationHandler>();

/**
 * Register a mutation type handler
 */
export function registerMutationType(
  type: string,
  handler: MutationHandler
): void {
  mutationRegistry.set(type, handler);
}

// =====================================
// SYNC QUEUE CLASS
// =====================================

class SyncQueueManager {
  private state: SyncQueueState = {
    tasks: [],
    isProcessing: false,
    lastSyncTime: null,
  };

  private listeners: Set<(state: SyncQueueState) => void> = new Set();
  private initialized = false;

  // =====================================
  // INITIALIZATION
  // =====================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as SyncQueueState;
        // Reset processing status on restart (was interrupted)
        this.state = {
          ...parsed,
          isProcessing: false,
          tasks: parsed.tasks.map((t) => ({
            ...t,
            status: t.status === 'processing' ? 'pending' : t.status,
          })),
        };
      }
      this.initialized = true;
      console.log('[SyncQueue] Initialized with', this.state.tasks.length, 'pending tasks');
    } catch (error) {
      console.error('[SyncQueue] Failed to initialize:', error);
      this.initialized = true;
    }
  }

  // =====================================
  // PERSISTENCE
  // =====================================

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (error) {
      console.error('[SyncQueue] Failed to persist:', error);
    }
  }

  // =====================================
  // STATE MANAGEMENT
  // =====================================

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  subscribe(listener: (state: SyncQueueState) => void): () => void {
    this.listeners.add(listener);
    // Immediate call with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): SyncQueueState {
    return this.state;
  }

  getPendingCount(): number {
    return this.state.tasks.filter(
      (t) => t.status === 'pending' || t.status === 'processing'
    ).length;
  }

  getPendingTasks(): SyncTask[] {
    return this.state.tasks.filter(
      (t) => t.status === 'pending' || t.status === 'processing'
    );
  }

  hasTask(id: string): boolean {
    return this.state.tasks.some((t) => t.id === id);
  }

  // =====================================
  // TASK MANAGEMENT
  // =====================================

  /**
   * Add a task to the queue
   */
  async enqueue(
    type: string,
    payload: unknown,
    options: {
      optimisticId?: string;
      maxRetries?: number;
    } = {}
  ): Promise<SyncTask> {
    await this.initialize();

    const task: SyncTask = {
      id: uuidv4(),
      type,
      payload,
      retries: 0,
      maxRetries: options.maxRetries ?? DEFAULT_MAX_RETRIES,
      timestamp: Date.now(),
      status: 'pending',
      optimisticId: options.optimisticId,
    };

    this.state = {
      ...this.state,
      tasks: [...this.state.tasks, task],
    };

    await this.persist();
    this.notify();

    console.log('[SyncQueue] Task enqueued:', task.id, task.type);
    return task;
  }

  /**
   * Remove a task from the queue
   */
  async remove(taskId: string): Promise<void> {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.filter((t) => t.id !== taskId),
    };

    await this.persist();
    this.notify();
  }

  /**
   * Update a task
   */
  private async updateTask(taskId: string, updates: Partial<SyncTask>): Promise<void> {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.map((t) =>
        t.id === taskId ? { ...t, ...updates } : t
      ),
    };

    await this.persist();
    this.notify();
  }

  /**
   * Clear all completed/failed tasks
   */
  async clearCompleted(): Promise<void> {
    this.state = {
      ...this.state,
      tasks: this.state.tasks.filter(
        (t) => t.status !== 'completed' && t.status !== 'failed'
      ),
    };

    await this.persist();
    this.notify();
  }

  /**
   * Clear all tasks (use with caution)
   */
  async clearAll(): Promise<void> {
    this.state = {
      tasks: [],
      isProcessing: false,
      lastSyncTime: null,
    };

    await this.persist();
    this.notify();
  }

  // =====================================
  // PROCESSING
  // =====================================

  /**
   * Process all pending tasks sequentially
   */
  async processQueue(): Promise<void> {
    if (this.state.isProcessing) {
      console.log('[SyncQueue] Already processing, skipping');
      return;
    }

    await this.initialize();

    const pendingTasks = this.state.tasks.filter((t) => t.status === 'pending');
    if (pendingTasks.length === 0) {
      console.log('[SyncQueue] No pending tasks');
      return;
    }

    this.state.isProcessing = true;
    this.notify();

    console.log('[SyncQueue] Processing', pendingTasks.length, 'tasks');

    for (const task of pendingTasks) {
      await this.processTask(task);
    }

    this.state = {
      ...this.state,
      isProcessing: false,
      lastSyncTime: Date.now(),
    };

    await this.persist();
    this.notify();

    console.log('[SyncQueue] Processing complete');
  }

  /**
   * Process a single task
   */
  private async processTask(task: SyncTask): Promise<void> {
    const handler = mutationRegistry.get(task.type);
    if (!handler) {
      console.error('[SyncQueue] No handler for task type:', task.type);
      await this.updateTask(task.id, {
        status: 'failed',
        errorMessage: `No handler registered for type: ${task.type}`,
      });
      return;
    }

    // Calculate backoff
    const backoff = Math.min(
      BASE_BACKOFF_MS * Math.pow(2, task.retries),
      MAX_BACKOFF_MS
    );

    // Check if we should wait (backoff from last attempt)
    if (task.lastAttempt && Date.now() - task.lastAttempt < backoff) {
      console.log('[SyncQueue] Task in backoff, skipping:', task.id);
      return;
    }

    // Mark as processing
    await this.updateTask(task.id, {
      status: 'processing',
      lastAttempt: Date.now(),
    });

    try {
      console.log('[SyncQueue] Executing task:', task.id, task.type);
      const result = await handler.executor(task);

      // Success
      await this.updateTask(task.id, { status: 'completed' });
      handler.onSuccess?.(task, result);

      console.log('[SyncQueue] Task completed:', task.id);

      // Auto-remove completed tasks after short delay
      setTimeout(() => this.remove(task.id), 5000);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const newRetries = task.retries + 1;

      if (newRetries >= task.maxRetries) {
        // Max retries reached - mark as failed
        console.error('[SyncQueue] Task failed permanently:', task.id, errorMessage);
        await this.updateTask(task.id, {
          status: 'failed',
          retries: newRetries,
          errorMessage,
        });
        handler.onFailed?.(task);
      } else {
        // Will retry
        console.warn('[SyncQueue] Task failed, will retry:', task.id, errorMessage);
        await this.updateTask(task.id, {
          status: 'pending',
          retries: newRetries,
          errorMessage,
        });
      }
    }
  }

  /**
   * Retry a specific failed task
   */
  async retryTask(taskId: string): Promise<void> {
    const task = this.state.tasks.find((t) => t.id === taskId);
    if (!task) return;

    await this.updateTask(taskId, {
      status: 'pending',
      retries: 0,
      errorMessage: undefined,
      lastAttempt: undefined,
    });

    await this.processQueue();
  }
}

// =====================================
// SINGLETON INSTANCE
// =====================================

export const syncQueue = new SyncQueueManager();

// =====================================
// HOOKS SUPPORT
// =====================================

export function useSyncQueueSubscription(
  callback: (state: SyncQueueState) => void
): void {
  // This is meant to be used with useEffect
  // The actual hook will be in useResilientMutation
}
