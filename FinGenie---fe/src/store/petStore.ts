/**
 * Pet Store
 * 
 * This store caches pet state from the backend.
 * All pet mutations should come from backend responses.
 * 
 * Usage:
 * - Use petApi.getState() with React Query to fetch pet
 * - On success, call setPet(response.data) to update store
 */

import { create } from 'zustand';
import type { PetMood, PetProfile } from '../api/modules/pet.api';

interface PetActivity {
  type: 'feeding' | 'playing' | 'state_change' | 'insight';
  timestamp: string;
  details: string;
}

interface PetState {
  // Pet data (synced from API)
  pet: PetProfile | null;
  isLoading: boolean;
  error: string | null;

  // Activity feed (local UI state)
  activities: PetActivity[];

  // Animation state (local UI state)
  currentAnimation: 'idle' | 'happy' | 'sad' | 'eating' | 'playing' | 'sleeping';

  // Pet actions
  setPet: (pet: PetProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Local-only mood updates
  setMood: (mood: PetMood) => void;
  updateMood: (mood: PetMood) => void;

  // Activity actions (local UI)
  addActivity: (activity: PetActivity) => void;
  clearActivities: () => void;

  // Animation (local UI)
  setAnimation: (animation: PetState['currentAnimation']) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  pet: null,
  isLoading: false,
  error: null,
  activities: [] as PetActivity[],
  currentAnimation: 'idle' as const,
};

export const petStore = create<PetState>((set, get) => ({
  ...initialState,

  setPet: (pet) => set({ pet, error: null }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),

  setMood: (mood) => {
    const { pet } = get();
    if (pet) {
      set({ pet: { ...pet, mood } });
    }
  },

  updateMood: (mood) => {
    const { pet } = get();
    if (pet) {
      set({ pet: { ...pet, mood } });
    }
  },

  addActivity: (activity) => {
    const { activities } = get();
    // Keep last 50 activities
    const newActivities = [activity, ...activities].slice(0, 50);
    set({ activities: newActivities });
  },

  clearActivities: () => set({ activities: [] }),

  setAnimation: (currentAnimation) => set({ currentAnimation }),

  reset: () => set(initialState),
}));

// Hook for consuming the store with selector
export const usePet = petStore;
