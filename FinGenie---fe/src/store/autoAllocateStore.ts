import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AutoAllocateState {
  autoAllocateOnSalary: boolean;
  setAutoAllocateOnSalary: (enabled: boolean) => void;
}

export const autoAllocateStore = create<AutoAllocateState>()(
  persist(
    (set) => ({
      autoAllocateOnSalary: false,
      setAutoAllocateOnSalary: (enabled) => {
        set({ autoAllocateOnSalary: enabled });
      },
    }),
    {
      name: 'fingenie-auto-allocate',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ autoAllocateOnSalary: state.autoAllocateOnSalary }),
    }
  )
);

export const useAutoAllocateStore = () => {
  const autoAllocateOnSalary = autoAllocateStore((state) => state.autoAllocateOnSalary);
  const setAutoAllocateOnSalary = autoAllocateStore((state) => state.setAutoAllocateOnSalary);

  return { autoAllocateOnSalary, setAutoAllocateOnSalary };
};
