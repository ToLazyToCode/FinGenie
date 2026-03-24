import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import type { AppStackParamList } from './types';
import { MainTabNavigator } from './MainTabNavigator';
import {
  WalletDetailScreen,
  AddTransactionScreen,
  TransactionHistoryScreen,
  GoalDetailScreen,
  PiggyDetailScreen,
  PetChatScreen,
  ProfileScreen,
  SettingsScreen,
  NotificationsScreen,
  AchievementsScreen,
  LeaderboardScreen,
  FriendsScreen,
  FriendChatScreen,
  BudgetScreen,
  MonthlySavingPlanScreen,
  SavingTargetsScreen,
  PiggyMembersScreen,
  EditProfileScreen,
  BehaviorSurveyScreen,
  BehaviorProfileScreen,
  SubscriptionScreen,
  CheckoutResultScreen,
} from '../screens';

// TODO: Implement CategoryManagementScreen
const CategoryManagementScreen = () => null;

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  const { colors } = useThemeStore();
  const { t } = useI18n();

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
        name="MainTabs"
        component={MainTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WalletDetail"
        component={WalletDetailScreen}
        options={{ title: t('nav.wallet') }}
      />
      <Stack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ title: t('transaction.add') }}
      />
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
      <Stack.Screen
        name="TransactionHistory"
        component={TransactionHistoryScreen}
        options={{ title: t('screen.history') }}
      />
      <Stack.Screen
        name="GoalDetail"
        component={GoalDetailScreen}
        options={{ title: t('goalDetail.title') }}
      />
      <Stack.Screen
        name="PiggyDetail"
        component={PiggyDetailScreen}
        options={{ title: t('wallet.piggy') }}
      />
      <Stack.Screen
        name="PiggyMembers"
        component={PiggyMembersScreen}
        options={{ title: t('piggyMembers.title') }}
      />
      <Stack.Screen
        name="PetChat"
        component={PetChatScreen}
        options={{ title: t('petChat.title') }}
      />
      <Stack.Screen
        name="ProfileSettings"
        component={ProfileScreen}
        options={{ title: t('nav.profile') }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ title: t('settings.title') }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: t('screen.notifications') }}
      />
      <Stack.Screen
        name="Achievements"
        component={AchievementsScreen}
        options={{ title: t('screen.achievements') }}
      />
      <Stack.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{ title: t('screen.leaderboard') }}
      />
      <Stack.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ title: t('screen.friends') }}
      />
      <Stack.Screen
        name="FriendChat"
        component={FriendChatScreen}
        options={({ route }) => ({ title: route.params.friendName })}
      />
      <Stack.Screen
        name="Budget"
        component={BudgetScreen}
        options={{ title: t('screen.budget') }}
      />
      <Stack.Screen
        name="CategoryManagement"
        component={CategoryManagementScreen}
        options={{ title: t('screen.categories') }}
      />
      <Stack.Screen
        name="MonthlySavingPlan"
        component={MonthlySavingPlanScreen}
        options={{ title: t('savingPlan.title') }}
      />
      <Stack.Screen
        name="SavingTargets"
        component={SavingTargetsScreen}
        options={{ title: t('savingTargets.title') }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ title: t('profile.edit') }}
      />
      <Stack.Screen
        name="Subscription"
        component={SubscriptionScreen}
        options={{ title: t('screen.subscription') }}
      />
      <Stack.Screen
        name="CheckoutResult"
        component={CheckoutResultScreen}
        options={{ title: t('subscription.orderTitle') }}
      />
    </Stack.Navigator>
  );
}
