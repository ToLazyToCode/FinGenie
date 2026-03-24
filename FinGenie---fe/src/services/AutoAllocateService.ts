import { Alert } from 'react-native';
import { settingsApi } from '../api/modules';
import type { TranslateFn } from '../i18n/useI18n';
import { autoAllocateStore } from '../store/autoAllocateStore';

export const AutoAllocateService = {
  loadPolicy: async (): Promise<boolean> => {
    const localValue = autoAllocateStore.getState().autoAllocateOnSalary;
    try {
      const response = await settingsApi.getAutoAllocatePolicy();
      const backendValue = Boolean(response.data?.enabled);
      autoAllocateStore.getState().setAutoAllocateOnSalary(backendValue);
      return backendValue;
    } catch {
      return localValue;
    }
  },

  savePolicy: async (enabled: boolean, t: TranslateFn): Promise<boolean> => {
    const previousValue = autoAllocateStore.getState().autoAllocateOnSalary;
    autoAllocateStore.getState().setAutoAllocateOnSalary(enabled);

    try {
      const response = await settingsApi.setAutoAllocatePolicy({ enabled });
      const syncedValue =
        typeof response.data?.enabled === 'boolean' ? response.data.enabled : enabled;
      autoAllocateStore.getState().setAutoAllocateOnSalary(syncedValue);
      return syncedValue;
    } catch {
      autoAllocateStore.getState().setAutoAllocateOnSalary(previousValue);
      Alert.alert(t('common.error'), t('autoAllocate.syncError'));
      return previousValue;
    }
  },
};
