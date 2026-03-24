import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import type { AuthStackParamList } from './types';
import {
  LoginScreen,
  RegisterScreen,
  OtpVerifyScreen,
  ForgotPasswordScreen,
  ResetPasswordScreen,
} from '../screens/auth';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const backLabel = t('common.back');
  const resetPasswordTitle = t('auth.resetPassword');
  
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ 
          title: t('auth.register'),
          headerBackTitle: backLabel,
        }}
      />
      <Stack.Screen
        name="OtpVerify"
        component={OtpVerifyScreen}
        options={{ 
          title: t('auth.verifyOtp'),
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ 
          title: t('auth.forgotPassword'),
          headerBackTitle: backLabel,
        }}
      />
      <Stack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{ 
          title: resetPasswordTitle,
          headerBackVisible: false,
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  );
}
