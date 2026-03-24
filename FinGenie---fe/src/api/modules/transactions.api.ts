import { apiClient } from '../client';

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface TransactionResponse {
  transactionId: number;
  accountId: number;
  walletId: number;
  walletName: string;
  categoryId: number;
  categoryName: string;
  categoryType: 'INCOME' | 'EXPENSE' | 'SAVING';
  amount: number;
  transactionType: TransactionType;
  transactionDate: string;
  description: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionRequest {
  walletId: number;
  categoryId: number;
  amount: number;
  transactionType: TransactionType;
  transactionDate: string;
  description?: string;
  location?: string;
}

export interface TransactionFilters {
  walletId?: number;
  categoryId?: number;
  transactionType?: TransactionType;
  startDate?: string;
  endDate?: string;
}

export interface TodayTransactionSuggestionResponse {
  predictionId?: string | number | null;
  transactionType?: TransactionType | null;
  type?: TransactionType | null;
  categoryId?: number | null;
  categoryName?: string | null;
  amount?: number | null;
  note?: string | null;
  description?: string | null;
  reason?: string | null;
}

export const transactionsApi = {
  getAll: () => 
    apiClient.get<TransactionResponse[]>('/transactions'),

  getByWallet: (walletId: number) => 
    apiClient.get<TransactionResponse[]>(`/transactions/wallet/${walletId}`),

  getById: (transactionId: number) => 
    apiClient.get<TransactionResponse>(`/transactions/${transactionId}`),

  create: (data: TransactionRequest) => 
    apiClient.post<TransactionResponse>('/transactions', data),

  update: (transactionId: number, data: Partial<TransactionRequest>) =>
    apiClient.put<TransactionResponse>(`/transactions/${transactionId}`, data),

  delete: (transactionId: number) => 
    apiClient.delete(`/transactions/${transactionId}`),
};

export const transactionsSuggestionsApi = {
  getToday: () =>
    apiClient.get<TodayTransactionSuggestionResponse | null>('/transactions/suggestions/today'),
};
