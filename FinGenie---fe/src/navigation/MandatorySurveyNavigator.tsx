import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MandatorySurveyStackParamList } from './types';
import { BehaviorSurveyScreen, BehaviorProfileScreen } from '../screens';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import { useAuthLogout } from '../hooks';
import { tokens } from '../theme';

const Stack = createNativeStackNavigator<MandatorySurveyStackParamList>();

export function MandatorySurveyNavigator() {
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const { logout } = useAuthLogout();

  const headerRight = () => (
    <Pressable
      onPress={() => {
        void logout('user_initiated');
      }}
      style={styles.logoutButton}
    >
      <Text style={[styles.logoutLabel, { color: colors.primary }]}>{t('auth.logout')}</Text>
    </Pressable>
  );

  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        gestureEnabled: false,
        headerBackVisible: false,
        headerRight,
      }}
    >
      <Stack.Screen
        name="BehaviorSurvey"
        component={BehaviorSurveyScreen}
        options={{ title: t('survey.navTitle') }}
      />
      <Stack.Screen
        name="BehaviorProfile"
        component={BehaviorProfileScreen}
        options={{ title: t('behavior.navTitle') }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
  },
  logoutLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});
