import type { SavingContributionResponse } from '../api/modules';
import { finPointApi } from '../api/modules';
import {
  dailyMissionsStore,
  getVietnamDayKey,
  getVietnamDayKeyFromIso,
  type DailyMissionId,
} from '../store/dailyMissionsStore';

type HubTab = 'plan' | 'targets' | 'activity';

const missionClaimInFlight = new Set<DailyMissionId>();

function buildMissionState(completedMissionIds: DailyMissionId[]) {
  return {
    contributeToday: completedMissionIds.includes('contributeToday'),
    viewPlan: completedMissionIds.includes('viewPlan'),
    viewActivity: completedMissionIds.includes('viewActivity'),
  };
}

function toDailyMissionId(value: string): DailyMissionId | null {
  if (value === 'contributeToday' || value === 'viewPlan' || value === 'viewActivity') {
    return value;
  }
  return null;
}

async function claimMissionReward(missionId: DailyMissionId): Promise<void> {
  const state = dailyMissionsStore.getState();
  state.ensureCurrentDay();
  if (missionClaimInFlight.has(missionId)) {
    return;
  }

  missionClaimInFlight.add(missionId);
  try {
    await finPointApi.claimMission(missionId);
    dailyMissionsStore.getState().completeMission(missionId);
  } catch (error) {
    console.warn('[DailyMissionsService] Failed to claim mission reward', missionId, error);
  } finally {
    missionClaimInFlight.delete(missionId);
  }
}

async function syncTodayMissionSnapshot(): Promise<void> {
  const state = dailyMissionsStore.getState();
  state.ensureCurrentDay();

  try {
    const response = await finPointApi.getTodayMissionState();
    const payload = response.data;

    const completedMissionIds = payload.missions
      .filter((mission) => mission.completed)
      .map((mission) => toDailyMissionId(mission.missionId))
      .filter((missionId): missionId is DailyMissionId => missionId != null);

    dailyMissionsStore
      .getState()
      .setTodaySnapshot(
        payload.dayKey || getVietnamDayKey(),
        buildMissionState(completedMissionIds),
        payload.xpToday ?? completedMissionIds.length * 10
      );
  } catch (error) {
    console.warn('[DailyMissionsService] Failed to sync mission snapshot', error);
  }
}

function isContributionInVietnamToday(createdAt: string): boolean {
  const contributionDayKey = getVietnamDayKeyFromIso(createdAt);
  if (!contributionDayKey) {
    return false;
  }
  return contributionDayKey === getVietnamDayKey();
}

export const DailyMissionsService = {
  syncFromBackend: (): Promise<void> => syncTodayMissionSnapshot(),

  trackWalletTabOpen: (tab: HubTab): void => {
    if (tab === 'plan') {
      void claimMissionReward('viewPlan');
      return;
    }
    if (tab === 'activity') {
      void claimMissionReward('viewActivity');
    }
  },

  syncContributeToday: (contributions: SavingContributionResponse[]): void => {
    if (!Array.isArray(contributions) || contributions.length === 0) {
      return;
    }
    const hasTodayContribution = contributions.some((item) =>
      isContributionInVietnamToday(item.createdAt)
    );
    if (hasTodayContribution) {
      void claimMissionReward('contributeToday');
    }
  },
};
