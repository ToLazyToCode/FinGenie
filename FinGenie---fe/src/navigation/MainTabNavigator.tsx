import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabBar } from '../components/ui';
import type { MainTabParamList } from './types';
import {
  HomeScreen,
  WalletSavingsHubScreen,
  PetScreen,
  SocialScreen,
  ProfileScreen,
} from '../screens';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  const { colors } = useThemeStore();
  const { t } = useI18n();
  
  return (
    <Tab.Navigator
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          headerShown: false,
          title: t('nav.home'),
          tabBarLabel: t('nav.home'),
        }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletSavingsHubScreen}
        options={{
          title: t('nav.wallet'),
          tabBarLabel: t('nav.wallet'),
        }}
      />
      <Tab.Screen
        name="Pet"
        component={PetScreen}
        options={{
          title: t('nav.gamification'),
          tabBarLabel: t('nav.gamification'),
        }}
      />
      <Tab.Screen
        name="Social"
        component={SocialScreen}
        options={{
          title: t('nav.social'),
          tabBarLabel: t('nav.social'),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: t('nav.profile'),
          tabBarLabel: t('nav.profile'),
        }}
      />
    </Tab.Navigator>
  );
}
