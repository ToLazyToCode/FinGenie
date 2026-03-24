import { apiClient } from '../client';

export type WalletType = 'REGULAR' | 'PIGGY';

export interface WalletResponse {
  walletId: number;
  accountId: number;
  walletName: string;
  walletType: WalletType;
  balance: number;
  isDefault: boolean;
  createdAt: string;
}

export interface WalletRequest {
  walletName: string;
  walletType: WalletType;
  initialBalance?: number;
  isDefault?: boolean;
}

export const walletsApi = {
  getAll: () => apiClient.get<WalletResponse[]>('/wallets'),
  getById: (walletId: number) => apiClient.get<WalletResponse>(`/wallets/${walletId}`),
  getDefault: () => apiClient.get<WalletResponse>('/wallets/default'),
  create: (data: WalletRequest) => apiClient.post<WalletResponse>('/wallets', data),
  update: (walletId: number, data: Partial<WalletRequest>) =>
    apiClient.put<WalletResponse>(`/wallets/${walletId}`, data),
  delete: (walletId: number) => apiClient.delete(`/wallets/${walletId}`),
};
