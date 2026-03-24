/**
 * Wallet Store
 * 
 * This store is used as a CACHE LAYER only.
 * All wallet CRUD operations should go through React Query with walletsApi.
 * 
 * Usage:
 * - Screens use useQuery with walletsApi.getAll() to fetch wallets
 * - On query success, call setWallets() to sync to this store
 * - Read from this store for quick access without refetching
 * 
 * DO NOT:
 * - Add wallets directly to the store without API call
 * - Use this store as the source of truth
 */

import { create } from 'zustand';
import type { WalletResponse } from '../api/modules/wallets.api';

interface WalletState {
  wallets: WalletResponse[];
  defaultWallet: WalletResponse | null;
  
  // Sync from API response (use in useQuery onSuccess)
  syncWallets: (wallets: WalletResponse[]) => void;
  syncDefaultWallet: (wallet: WalletResponse | null) => void;
  
  // Keep legacy setters for compatibility (but prefer sync methods)
  setWallets: (wallets: WalletResponse[]) => void;
  setDefaultWallet: (wallet: WalletResponse | null) => void;
  
  // Clear on logout
  reset: () => void;
}

const initialState = {
  wallets: [] as WalletResponse[],
  defaultWallet: null as WalletResponse | null,
};

export const walletStore = create<WalletState>((set) => ({
  ...initialState,
  
  // Sync methods (preferred)
  syncWallets: (wallets) => set({ wallets }),
  syncDefaultWallet: (defaultWallet) => set({ defaultWallet }),
  
  // Legacy setters
  setWallets: (wallets) => set({ wallets }),
  setDefaultWallet: (defaultWallet) => set({ defaultWallet }),
  
  // Reset on logout
  reset: () => set(initialState),
}));

// Hook alias
export const useWalletStore = walletStore;
