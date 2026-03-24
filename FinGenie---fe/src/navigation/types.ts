import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// ============================================
// AUTH STACK
// ============================================
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  OtpVerify: {
    sessionId: string;
    email: string;
    expiresInSeconds: number;
    flow: 'register' | 'forgotPassword';
  };
  ForgotPassword: undefined;
  ResetPassword: {
    resetToken: string;
  };
};

// ============================================
// MAIN TAB STACK
// ============================================
export type MainTabParamList = {
  Home: undefined;
  Wallet: { initialTab?: 'plan' | 'targets' | 'activity' } | undefined;
  Pet: undefined;
  Social: undefined;
  Profile: undefined;
};

// ============================================
// APP STACK (Main authenticated screens)
// ============================================
export type AppStackParamList = {
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  WalletDetail: { walletId: number };
  AddTransaction: { walletId?: number };
  TransactionHistory: { walletId?: number };
  BehaviorSurvey: undefined;
  BehaviorProfile: undefined;
  GoalDetail: { goalId: number };
  PiggyDetail: { piggyId: number };
  PiggyMembers: { piggyId: number };
  PetChat: undefined;
  ProfileSettings: undefined;
  Settings: undefined;
  Notifications: undefined;
  Achievements: undefined;
  Leaderboard: undefined;
  Friends: undefined;
  FriendChat: { friendId: number; friendName: string };
  Budget: undefined;
  CategoryManagement: undefined;
  EditProfile: undefined;
  MonthlySavingPlan: undefined;
  SavingTargets: undefined;
  Subscription: undefined;
  CheckoutResult: {
    orderCode: string;
    gateway?: string;
    status?: string;
  };
};

// ============================================
// MANDATORY SURVEY STACK (Authenticated but gated)
// ============================================
export type MandatorySurveyStackParamList = {
  BehaviorSurvey: undefined;
  BehaviorProfile: undefined;
};

// ============================================
// ROOT STACK (Auth + App)
// ============================================
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>;
};

// ============================================
// SCREEN PROPS TYPES
// ============================================
export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

export type AppStackScreenProps<T extends keyof AppStackParamList> =
  NativeStackScreenProps<AppStackParamList, T>;

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    AppStackScreenProps<keyof AppStackParamList>
  >;

export type MandatorySurveyScreenProps<T extends keyof MandatorySurveyStackParamList> =
  NativeStackScreenProps<MandatorySurveyStackParamList, T>;

// ============================================
// GLOBAL TYPE DECLARATION
// ============================================
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
