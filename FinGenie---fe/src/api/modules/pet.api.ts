import { apiClient } from '../client';

// ============ Pet Types (matches BE PetController) ============

export type PetMood = 'HAPPY' | 'NEUTRAL' | 'SAD' | 'EXCITED' | 'SLEEPING' | 'CONTENT' | 'WORRIED' | 'ECSTATIC' | 'ANGRY' | 'SLEEPY';
export type PetType = 'CAT' | 'DOG' | 'BUNNY' | 'HAMSTER';

export interface PetProfile {
  id: number;
  accountId: number;
  petName: string;
  petType: PetType;
  mood: PetMood;
  energy: number;
  hunger: number;
  happiness: number;
  health: number;
  xp: number;
  xpToNextLevel: number;
  level: number;
  lastInteraction: string;
  createdAt: string;
  updatedAt: string;
  // Compatibility alias
  name?: string;
}

export const petApi = {
  getState: () => 
    apiClient.get<PetProfile>('/pet/state'),
};
