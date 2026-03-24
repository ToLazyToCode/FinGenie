import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type DailyMissionId = 'contributeToday' | 'viewPlan' | 'viewActivity';

type MissionState = Record<DailyMissionId, boolean>;

const XP_PER_MISSION = 10;
const DAY_IN_MS = 24 * 60 * 60 * 1000;
export const DAILY_MISSIONS_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const DAY_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: DAILY_MISSIONS_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DEFAULT_MISSIONS: MissionState = {
  contributeToday: false,
  viewPlan: false,
  viewActivity: false,
};

export function getVietnamDayKey(date = new Date()): string {
  const parts = DAY_KEY_FORMATTER.formatToParts(date);
  const year = parts.find((item) => item.type === 'year')?.value;
  const month = parts.find((item) => item.type === 'month')?.value;
  const day = parts.find((item) => item.type === 'day')?.value;
  if (!year || !month || !day) {
    return '';
  }
  return `${year}-${month}-${day}`;
}

export function getVietnamDayKeyFromIso(value: string): string | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return getVietnamDayKey(parsed);
}

function getCurrentDayKey(): string {
  return getVietnamDayKey();
}

function parseDayKeyToEpochDay(dayKey: string): number | null {
  const [year, month, day] = dayKey.split('-').map(Number);
  if (!year || !month || !day) {
    return null;
  }
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_IN_MS);
}

function isPreviousDay(previousDayKey: string, currentDayKey: string): boolean {
  const previousEpoch = parseDayKeyToEpochDay(previousDayKey);
  const currentEpoch = parseDayKeyToEpochDay(currentDayKey);
  if (previousEpoch == null || currentEpoch == null) {
    return false;
  }
  return currentEpoch - previousEpoch === 1;
}

interface DailyMissionsState {
  dayKey: string;
  missions: MissionState;
  xpToday: number;
  petXp: number;
  streak: number;
  lastCompletedDayKey: string | null;
  completeMission: (missionId: DailyMissionId) => void;
  setTodaySnapshot: (dayKey: string, missions: MissionState, xpToday: number) => void;
  ensureCurrentDay: () => void;
}

export const dailyMissionsStore = create<DailyMissionsState>()(
  persist(
    (set, get) => ({
      dayKey: getCurrentDayKey(),
      missions: DEFAULT_MISSIONS,
      xpToday: 0,
      petXp: 0,
      streak: 0,
      lastCompletedDayKey: null,

      ensureCurrentDay: () => {
        set((state) => {
          const todayKey = getCurrentDayKey();
          if (state.dayKey === todayKey) {
            return state;
          }

          return {
            ...state,
            dayKey: todayKey,
            missions: DEFAULT_MISSIONS,
            xpToday: 0,
          };
        });
      },

      setTodaySnapshot: (dayKey, missions, xpToday) => {
        set((state) => {
          const safeDayKey = dayKey && dayKey.trim() ? dayKey : getCurrentDayKey();
          const safeMissions: MissionState = {
            contributeToday: Boolean(missions.contributeToday),
            viewPlan: Boolean(missions.viewPlan),
            viewActivity: Boolean(missions.viewActivity),
          };
          const normalizedXpToday = Math.max(0, Math.floor(Number(xpToday) || 0));

          let nextStreak = state.streak;
          let nextLastCompletedDayKey = state.lastCompletedDayKey;

          if (safeMissions.contributeToday && state.lastCompletedDayKey !== safeDayKey) {
            nextStreak =
              state.lastCompletedDayKey && isPreviousDay(state.lastCompletedDayKey, safeDayKey)
                ? state.streak + 1
                : 1;
            nextLastCompletedDayKey = safeDayKey;
          }

          return {
            ...state,
            dayKey: safeDayKey,
            missions: safeMissions,
            xpToday: normalizedXpToday,
            petXp: normalizedXpToday,
            streak: nextStreak,
            lastCompletedDayKey: nextLastCompletedDayKey,
          };
        });
      },

      completeMission: (missionId) => {
        set((state) => {
          const todayKey = getCurrentDayKey();
          const isNewDay = state.dayKey !== todayKey;
          const baseState = isNewDay
            ? {
                ...state,
                dayKey: todayKey,
                missions: DEFAULT_MISSIONS,
                xpToday: 0,
              }
            : state;

          if (baseState.missions[missionId]) {
            return baseState;
          }

          const nextMissions: MissionState = {
            ...baseState.missions,
            [missionId]: true,
          };

          let nextStreak = baseState.streak;
          let nextLastCompletedDayKey = baseState.lastCompletedDayKey;

          // Self-check rules:
          // 1) First contributeToday in a Vietnam day: streak starts at 1.
          // 2) If last completed contribute day is yesterday (Vietnam day): streak increments.
          // 3) If contributeToday already completed this Vietnam day: streak unchanged.
          if (missionId === 'contributeToday') {
            nextStreak =
              baseState.lastCompletedDayKey &&
              isPreviousDay(baseState.lastCompletedDayKey, todayKey)
                ? baseState.streak + 1
                : 1;
            nextLastCompletedDayKey = todayKey;
          }

          return {
            ...baseState,
            missions: nextMissions,
            xpToday: baseState.xpToday + XP_PER_MISSION,
            petXp: baseState.petXp + XP_PER_MISSION,
            streak: nextStreak,
            lastCompletedDayKey: nextLastCompletedDayKey,
          };
        });
      },
    }),
    {
      name: 'fingenie-daily-missions',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        dayKey: state.dayKey,
        missions: state.missions,
        xpToday: state.xpToday,
        petXp: state.petXp,
        streak: state.streak,
        lastCompletedDayKey: state.lastCompletedDayKey,
      }),
    }
  )
);

export const useDailyMissionsStore = () => {
  const dayKey = dailyMissionsStore((state) => state.dayKey);
  const missions = dailyMissionsStore((state) => state.missions);
  const xpToday = dailyMissionsStore((state) => state.xpToday);
  const petXp = dailyMissionsStore((state) => state.petXp);
  const streak = dailyMissionsStore((state) => state.streak);
  const completeMission = dailyMissionsStore((state) => state.completeMission);
  const setTodaySnapshot = dailyMissionsStore((state) => state.setTodaySnapshot);
  const ensureCurrentDay = dailyMissionsStore((state) => state.ensureCurrentDay);

  return {
    dayKey,
    missions,
    xpToday,
    petXp,
    streak,
    completeMission,
    setTodaySnapshot,
    ensureCurrentDay,
  };
};
