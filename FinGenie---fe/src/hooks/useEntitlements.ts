import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entitlementsApi, type EntitlementSnapshotResponse } from '../api/modules';

const EMPTY_SNAPSHOT: EntitlementSnapshotResponse = {
  planTier: 'FREE',
  billingPlan: 'FREE',
  entitlements: {},
  features: {},
  limits: {},
  usage: {},
  remaining: {},
};

export function useEntitlements() {
  const query = useQuery({
    queryKey: ['entitlements', 'me'],
    queryFn: async () => {
      const response = await entitlementsApi.getMe();
      return response.data;
    },
    staleTime: 30_000,
  });

  const snapshot = query.data ?? EMPTY_SNAPSHOT;

  const helpers = useMemo(
    () => ({
      canAccess: (featureKey: string): boolean => Boolean(snapshot.features?.[featureKey]),
      getLimit: (limitKey: string): number => Number(snapshot.limits?.[limitKey] ?? 0),
      getUsage: (usageKey: string): number => Number(snapshot.usage?.[usageKey] ?? 0),
      getRemaining: (remainingKey: string): number => Number(snapshot.remaining?.[remainingKey] ?? 0),
    }),
    [snapshot.features, snapshot.limits, snapshot.remaining, snapshot.usage]
  );

  return {
    ...query,
    snapshot,
    ...helpers,
  };
}
