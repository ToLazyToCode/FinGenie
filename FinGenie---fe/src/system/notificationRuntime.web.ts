export async function initializeNotificationRuntime(): Promise<void> {
  // Web does not initialize Expo native notifications runtime.
}

export async function setNotificationPreference(): Promise<{
  enabled: boolean;
  permissionGranted: boolean;
  supported: boolean;
}> {
  return {
    enabled: false,
    permissionGranted: false,
    supported: false,
  };
}

export async function teardownNotificationRuntime(): Promise<void> {
  // Nothing to tear down on web.
}
