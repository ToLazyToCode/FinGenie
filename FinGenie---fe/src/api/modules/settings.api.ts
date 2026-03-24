import { apiClient } from '../client';

export interface AutoAllocatePolicyResponse {
  enabled: boolean;
  updatedAt?: string | null;
}

export interface AutoAllocatePolicyRequest {
  enabled: boolean;
}

export const settingsApi = {
  getAutoAllocatePolicy: () =>
    apiClient.get<AutoAllocatePolicyResponse>('/settings/auto-allocate-policy'),

  setAutoAllocatePolicy: (payload: AutoAllocatePolicyRequest) =>
    apiClient.put<AutoAllocatePolicyResponse>('/settings/auto-allocate-policy', payload),
};
