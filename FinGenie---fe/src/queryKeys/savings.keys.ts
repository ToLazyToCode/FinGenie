import type { QueryClient } from '@tanstack/react-query';

export type SavingsPlanMode = 'base' | 'optimized';

export const savingsKeys = {
  all: () => ['savings'] as const,
  savingTargets: () => [...savingsKeys.all(), 'targets'] as const,
  monthlySavingPlan: (mode: SavingsPlanMode = 'base') =>
    [...savingsKeys.all(), 'monthlyPlan', mode] as const,
  savingContributionsRoot: () => [...savingsKeys.all(), 'contributions'] as const,
  savingContributions: (limit = 50) =>
    [...savingsKeys.savingContributionsRoot(), { limit }] as const,
  piggyContributions: (piggyId: number | undefined, limit = 200) =>
    [...savingsKeys.savingContributionsRoot(), 'piggy', piggyId ?? 'unknown', { limit }] as const,
  goalDetail: (goalId: number | undefined) =>
    [...savingsKeys.all(), 'goalDetail', goalId ?? 'unknown'] as const,
  piggyDetail: (piggyId: number | undefined) =>
    [...savingsKeys.all(), 'piggyDetail', piggyId ?? 'unknown'] as const,
  piggyMembers: (piggyId: number | undefined) =>
    [...savingsKeys.all(), 'piggyMembers', piggyId ?? 'unknown'] as const,
  goalBondSummary: (piggyId: number | undefined) =>
    [...savingsKeys.all(), 'goalBondSummary', piggyId ?? 'unknown'] as const,
  goalBondMissions: (piggyId: number | undefined) =>
    [...savingsKeys.all(), 'goalBondMissions', piggyId ?? 'unknown'] as const,
  sharedPiggyRewards: (piggyId: number | undefined) =>
    [...savingsKeys.all(), 'sharedPiggyRewards', piggyId ?? 'unknown'] as const,
};

interface InvalidateSavingsGraphOptions {
  goalId?: number | null;
  piggyId?: number | null;
}

export async function invalidateSavingsGraph(
  queryClient: QueryClient,
  options: InvalidateSavingsGraphOptions = {}
): Promise<void> {
  const tasks: Array<Promise<unknown>> = [
    queryClient.invalidateQueries({ queryKey: savingsKeys.savingTargets() }),
    queryClient.invalidateQueries({ queryKey: savingsKeys.monthlySavingPlan('optimized') }),
    queryClient.invalidateQueries({ queryKey: savingsKeys.savingContributionsRoot() }),
  ];

  if (typeof options.goalId === 'number') {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: savingsKeys.goalDetail(options.goalId),
      })
    );
  }

  if (typeof options.piggyId === 'number') {
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: savingsKeys.piggyDetail(options.piggyId),
      })
    );
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: savingsKeys.goalBondSummary(options.piggyId),
      })
    );
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: savingsKeys.goalBondMissions(options.piggyId),
      })
    );
    tasks.push(
      queryClient.invalidateQueries({
        queryKey: savingsKeys.sharedPiggyRewards(options.piggyId),
      })
    );
  }

  await Promise.all(tasks);
}
