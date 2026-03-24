import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface SavingsHubOnboardingState {
  hasSeenSavingsHubOnboarding: boolean;
  markSavingsHubOnboardingSeen: () => void;
}

export const savingsHubOnboardingStore = create<SavingsHubOnboardingState>()(
  persist(
    (set) => ({
      hasSeenSavingsHubOnboarding: false,
      markSavingsHubOnboardingSeen: () =>
        set({ hasSeenSavingsHubOnboarding: true }),
    }),
    {
      name: 'fingenie-savings-hub-onboarding',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasSeenSavingsHubOnboarding: state.hasSeenSavingsHubOnboarding,
      }),
    }
  )
);

export const useSavingsHubOnboardingStore = () => {
  const hasSeenSavingsHubOnboarding = savingsHubOnboardingStore(
    (state) => state.hasSeenSavingsHubOnboarding
  );
  const markSavingsHubOnboardingSeen = savingsHubOnboardingStore(
    (state) => state.markSavingsHubOnboardingSeen
  );

  return { hasSeenSavingsHubOnboarding, markSavingsHubOnboardingSeen };
};
