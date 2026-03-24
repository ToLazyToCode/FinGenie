import { apiClient } from '../client';

export type PlanTier = 'FREE' | 'PLUS' | 'PREMIUM';
export type BillingPlan = 'FREE' | 'PLUS_MONTHLY' | 'PREMIUM_MONTHLY' | 'PREMIUM_YEARLY';

export interface EntitlementSnapshotResponse {
  planTier: PlanTier;
  billingPlan: BillingPlan;
  entitlements: Record<string, unknown>;
  features: Record<string, boolean>;
  limits: Record<string, number>;
  usage: Record<string, number>;
  remaining: Record<string, number>;
}

export const entitlementsApi = {
  getMe: () => apiClient.get<EntitlementSnapshotResponse>('/entitlements/me'),
};
