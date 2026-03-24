/**
 * Network Monitor
 * 
 * Monitors network connectivity and triggers sync queue processing
 * on reconnection. Provides hooks for network state.
 * 
 * @module system/networkMonitor
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { syncQueue } from './syncQueue';

// =====================================
// TYPES
// =====================================

export interface NetworkState {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
  wasOffline: boolean;
}

type NetworkListener = (state: NetworkState) => void;

// =====================================
// NETWORK MONITOR CLASS
// =====================================

class NetworkMonitorManager {
  private state: NetworkState = {
    isConnected: true, // Optimistic default
    isInternetReachable: true,
    type: 'unknown',
    wasOffline: false,
  };

  private listeners: Set<NetworkListener> = new Set();
  private unsubscribe: (() => void) | null = null;
  private initialized = false;
  private syncDebounceTimer: NodeJS.Timeout | null = null;

  // =====================================
  // INITIALIZATION
  // =====================================

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Get initial state
    const initialState = await NetInfo.fetch();
    this.updateState(initialState);

    // Subscribe to changes
    this.unsubscribe = NetInfo.addEventListener((state) => {
      this.handleNetworkChange(state);
    });

    this.initialized = true;
    console.log('[NetworkMonitor] Initialized, connected:', this.state.isConnected);
  }

  // =====================================
  // STATE MANAGEMENT
  // =====================================

  private updateState(netInfo: NetInfoState): void {
    const wasConnected = this.state.isConnected;
    
    this.state = {
      isConnected: netInfo.isConnected ?? false,
      isInternetReachable: netInfo.isInternetReachable,
      type: netInfo.type,
      wasOffline: !wasConnected && (netInfo.isConnected ?? false),
    };
  }

  private handleNetworkChange(netInfo: NetInfoState): void {
    const wasConnected = this.state.isConnected;
    this.updateState(netInfo);

    console.log('[NetworkMonitor] Network changed:', {
      connected: this.state.isConnected,
      type: this.state.type,
    });

    // Notify listeners
    this.notify();

    // If we just came back online, trigger sync
    if (!wasConnected && this.state.isConnected) {
      console.log('[NetworkMonitor] Reconnected, triggering sync');
      this.triggerSync();
    }
  }

  private triggerSync(): void {
    // Debounce to avoid multiple rapid syncs
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    this.syncDebounceTimer = setTimeout(async () => {
      try {
        await syncQueue.processQueue();
      } catch (error) {
        console.error('[NetworkMonitor] Sync failed:', error);
      }
    }, 1000); // 1 second debounce
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener(this.state));
  }

  // =====================================
  // PUBLIC API
  // =====================================

  subscribe(listener: NetworkListener): () => void {
    this.listeners.add(listener);
    // Immediate call with current state
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getState(): NetworkState {
    return this.state;
  }

  isOnline(): boolean {
    return this.state.isConnected && (this.state.isInternetReachable ?? true);
  }

  /**
   * Force a sync attempt (e.g., from manual refresh)
   */
  async forceSync(): Promise<void> {
    if (!this.isOnline()) {
      console.log('[NetworkMonitor] Cannot sync - offline');
      return;
    }

    await syncQueue.processQueue();
  }

  /**
   * Cleanup on app unmount
   */
  cleanup(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.listeners.clear();
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }
  }
}

// =====================================
// SINGLETON
// =====================================

export const networkMonitor = new NetworkMonitorManager();

// =====================================
// REACT HOOK
// =====================================

import { useEffect, useState } from 'react';

/**
 * Hook to get current network state
 */
export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>(() => networkMonitor.getState());

  useEffect(() => {
    // Initialize on first use
    networkMonitor.initialize();

    // Subscribe to changes
    const unsubscribe = networkMonitor.subscribe(setState);
    return unsubscribe;
  }, []);

  return state;
}

/**
 * Hook to get simple online/offline status
 */
export function useIsOnline(): boolean {
  const state = useNetworkState();
  return state.isConnected && (state.isInternetReachable ?? true);
}
