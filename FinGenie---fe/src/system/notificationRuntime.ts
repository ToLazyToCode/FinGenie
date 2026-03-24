import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import { notificationsApi } from '../api/modules';
import { translate } from '../i18n';
import { languageStore } from '../store/languageStore';

type NotificationsModule = typeof import('expo-notifications');
type NotificationSubscription = { remove(): void };
type NotificationLoadOptions = { notifyIfUnavailable?: boolean };
type NotificationPreferenceResult = {
  enabled: boolean;
  permissionGranted: boolean;
  supported: boolean;
};

const TOKEN_STORAGE_KEY = 'fingenie:notifications:device-token';
const SCHEDULED_IDS_STORAGE_KEY = 'fingenie:notifications:scheduled-ids';
const DEFAULT_DAILY_REMINDER = '20:00';

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let handlerConfigured = false;
let listenersInitialized = false;
let receivedSubscription: NotificationSubscription | null = null;
let responseSubscription: NotificationSubscription | null = null;
const warnedMessages = new Set<string>();

const NOTIFICATION_NATIVE_MODULE_NAMES = [
  'ExpoNotificationsEmitter',
  'ExpoNotificationScheduler',
  'ExpoPushTokenManager',
  'ExpoNotificationPermissionsModule',
  'ExpoNotificationsHandlerModule',
] as const;

function warnOnce(key: string, message: string, error?: unknown) {
  if (warnedMessages.has(key)) {
    return;
  }
  warnedMessages.add(key);
  if (__DEV__ && error) {
    console.warn(message, error);
    return;
  }
  console.warn(message);
}

function hasNotificationFunction<K extends keyof NotificationsModule>(
  module: NotificationsModule | null,
  key: K
): module is NotificationsModule & Record<K, NotificationsModule[K]> {
  return Boolean(module && typeof module[key] === 'function');
}

function hasNotificationsNativeSupport(): boolean {
  return NOTIFICATION_NATIVE_MODULE_NAMES.some((moduleName) => requireOptionalNativeModule(moduleName));
}

async function getNotificationsModule(options: NotificationLoadOptions = {}): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  if (!hasNotificationsNativeSupport()) {
    if (options.notifyIfUnavailable) {
      warnOnce(
        'notifications-native-missing',
        '[Notifications] Native notification modules are missing from this binary. Notification features will stay disabled.'
      );
    }
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then((Notifications) => {
        if (!handlerConfigured && hasNotificationFunction(Notifications, 'setNotificationHandler')) {
          try {
            Notifications.setNotificationHandler({
              handleNotification: async () => ({
                shouldShowAlert: true,
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: false,
                shouldSetBadge: false,
              }),
            });
            handlerConfigured = true;
          } catch (error) {
            if (options.notifyIfUnavailable) {
              warnOnce(
                'notifications-handler-unavailable',
                '[Notifications] Notification handler is unavailable in this runtime. Notifications will stay disabled.',
                error
              );
            }
          }
        }

        return Notifications;
      })
      .catch((error) => {
        notificationsModulePromise = null;
        if (options.notifyIfUnavailable) {
          warnOnce(
            'notifications-import-failed',
            '[Notifications] expo-notifications could not be loaded. Notifications will stay disabled.',
            error
          );
        }
        return null;
      });
  }

  return notificationsModulePromise;
}

function parseReminderTime(value?: string): { hour: number; minute: number } {
  const fallback = { hour: 20, minute: 0 };
  if (!value || !value.includes(':')) {
    return fallback;
  }
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) {
    return fallback;
  }
  return {
    hour: Math.min(23, Math.max(0, hour)),
    minute: Math.min(59, Math.max(0, minute)),
  };
}

async function cancelScheduledReminders() {
  const savedIdsRaw = await AsyncStorage.getItem(SCHEDULED_IDS_STORAGE_KEY);
  const savedIds = savedIdsRaw ? (JSON.parse(savedIdsRaw) as string[]) : [];
  if (!savedIds.length) {
    return;
  }
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    await AsyncStorage.removeItem(SCHEDULED_IDS_STORAGE_KEY);
    return;
  }
  if (!hasNotificationFunction(Notifications, 'cancelScheduledNotificationAsync')) {
    await AsyncStorage.removeItem(SCHEDULED_IDS_STORAGE_KEY);
    return;
  }
  await Promise.all(savedIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  await AsyncStorage.removeItem(SCHEDULED_IDS_STORAGE_KEY);
}

function buildReminderCopies() {
  const language = languageStore.getState().language;
  return [
    {
      title: translate(language, 'notification.reminder.mission.title'),
      body: translate(language, 'notification.reminder.mission.body'),
    },
    {
      title: translate(language, 'notification.reminder.transaction.title'),
      body: translate(language, 'notification.reminder.transaction.body'),
    },
    {
      title: translate(language, 'notification.reminder.goal.title'),
      body: translate(language, 'notification.reminder.goal.body'),
    },
  ];
}

async function scheduleLocalReminders(reminderTime?: string) {
  const Notifications = await getNotificationsModule({ notifyIfUnavailable: true });
  if (
    !Notifications ||
    !hasNotificationFunction(Notifications, 'scheduleNotificationAsync') ||
    !Notifications.SchedulableTriggerInputTypes?.DAILY
  ) {
    return;
  }

  const { hour, minute } = parseReminderTime(reminderTime ?? DEFAULT_DAILY_REMINDER);
  await cancelScheduledReminders();

  const reminders = buildReminderCopies();

  const ids = await Promise.all(
    reminders.map((item, index) =>
      Notifications.scheduleNotificationAsync({
        content: item,
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute: (minute + index * 5) % 60,
        },
      })
    )
  );

  await AsyncStorage.setItem(SCHEDULED_IDS_STORAGE_KEY, JSON.stringify(ids));
}

async function requestPermissionIfNeeded(
  options: NotificationLoadOptions = {}
): Promise<{ permissionGranted: boolean; supported: boolean }> {
  const Notifications = await getNotificationsModule(options);
  if (
    !Notifications ||
    !hasNotificationFunction(Notifications, 'getPermissionsAsync') ||
    !hasNotificationFunction(Notifications, 'requestPermissionsAsync')
  ) {
    return {
      permissionGranted: false,
      supported: false,
    };
  }

  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.granted) {
      return {
        permissionGranted: true,
        supported: true,
      };
    }

    const requested = await Notifications.requestPermissionsAsync();
    return {
      permissionGranted: requested.granted,
      supported: true,
    };
  } catch (error) {
    warnOnce(
      'notifications-permission-unavailable',
      '[Notifications] Notification permissions are unavailable in this runtime.',
      error
    );
    return {
      permissionGranted: false,
      supported: true,
    };
  }
}

async function registerDeviceToken(options: NotificationLoadOptions = {}): Promise<string | null> {
  const Notifications = await getNotificationsModule(options);
  if (!Notifications || !hasNotificationFunction(Notifications, 'getExpoPushTokenAsync')) {
    return null;
  }

  const projectId = Constants?.expoConfig?.extra?.eas?.projectId || Constants?.easConfig?.projectId;

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    const token = tokenResponse.data;
    await notificationsApi.registerDeviceToken({
      deviceToken: token,
      platform: Platform.OS,
      enabled: true,
    });
    await AsyncStorage.setItem(TOKEN_STORAGE_KEY, token);
    return token;
  } catch (error) {
    warnOnce(
      'notifications-token-unavailable',
      '[Notifications] Push token registration is unavailable in this runtime. Local reminders can still work if supported.',
      error
    );
    return null;
  }
}

async function disableRegisteredToken() {
  const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
  if (!token) {
    return;
  }
  try {
    await notificationsApi.disableDeviceToken(token);
  } finally {
    await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
  }
}

async function ensureListeners() {
  if (listenersInitialized) {
    return;
  }

  const Notifications = await getNotificationsModule();
  if (
    !Notifications ||
    !hasNotificationFunction(Notifications, 'addNotificationReceivedListener') ||
    !hasNotificationFunction(Notifications, 'addNotificationResponseReceivedListener')
  ) {
    return;
  }

  try {
    receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      // Runtime listener kept for future in-app handling.
    });

    responseSubscription = Notifications.addNotificationResponseReceivedListener(() => {
      // Runtime listener kept for future deep-link routing.
    });

    listenersInitialized = true;
  } catch (error) {
    warnOnce(
      'notifications-listeners-unavailable',
      '[Notifications] Notification listeners are unavailable in this runtime.',
      error
    );
  }
}

export async function initializeNotificationRuntime() {
  try {
    await ensureListeners();
  } catch (error) {
    warnOnce(
      'notifications-initialize-failed',
      '[Notifications] Notification runtime initialization was skipped.',
      error
    );
  }
}

export async function setNotificationPreference(
  enabled: boolean,
  reminderTime?: string,
  options?: { silent?: boolean }
): Promise<NotificationPreferenceResult> {
  if (!enabled) {
    await cancelScheduledReminders();
    await disableRegisteredToken();
    return { enabled: false, permissionGranted: false, supported: true };
  }

  const runtimeOptions = {
    notifyIfUnavailable: !options?.silent,
  };
  const permissionStatus = await requestPermissionIfNeeded(runtimeOptions);
  if (!permissionStatus.supported) {
    await cancelScheduledReminders();
    await disableRegisteredToken();
    return { enabled: false, permissionGranted: false, supported: false };
  }

  const { permissionGranted } = permissionStatus;
  if (!permissionGranted) {
    await cancelScheduledReminders();
    await disableRegisteredToken();
    return { enabled: false, permissionGranted: false, supported: true };
  }

  await ensureListeners();
  try {
    await registerDeviceToken(runtimeOptions);
    await scheduleLocalReminders(reminderTime);
    return { enabled: true, permissionGranted: true, supported: true };
  } catch (error) {
    warnOnce(
      'notifications-enable-failed',
      '[Notifications] Notifications could not be enabled in this runtime.',
      error
    );
    await cancelScheduledReminders();
    return { enabled: false, permissionGranted: true, supported: true };
  }
}

export async function teardownNotificationRuntime() {
  if (receivedSubscription) {
    receivedSubscription.remove();
    receivedSubscription = null;
  }
  if (responseSubscription) {
    responseSubscription.remove();
    responseSubscription = null;
  }
  listenersInitialized = false;
}
