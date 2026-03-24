import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { walletsApi, type WalletRequest } from '../api/modules';

export function useWallets() {
  return useQuery({
    queryKey: ['wallets'],
    queryFn: async () => {
      const { data } = await walletsApi.getAll();
      return data;
    },
  });
}

export function useWallet(walletId: number | null) {
  return useQuery({
    queryKey: ['wallet', walletId],
    queryFn: async () => {
      if (!walletId) return null;
      const { data } = await walletsApi.getById(walletId);
      return data;
    },
    enabled: !!walletId,
  });
}

export function useCreateWallet() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WalletRequest) => walletsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
    },
  });
}
