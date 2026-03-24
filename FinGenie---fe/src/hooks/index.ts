// Auth hooks - Bank-grade session management
export {
  useTokenAutoRefresh,
  useSessionHeartbeat,
  useMultiTabSync,
  useAuthLogout,
  useAuthLifecycle,
  useAuthState,
} from './useAuth';

// Google OAuth hook
export {
  useGoogleAuth,
  type GoogleAuthState,
  type GoogleAuthResult,
  type UseGoogleAuthReturn,
} from './useGoogleAuth';

// Wallet hooks
export { useWallets, useWallet, useCreateWallet } from './useWallets';

// AI hooks
export { useAIGuesses } from './useAIGuesses';
export { useAIConversations } from './useAIConversations';
export { useEntitlements } from './useEntitlements';
export {
  useSurveyDefinition,
  useSurveyStatus,
  useBehaviorProfile,
  useBehaviorInsights,
  useBehaviorCompletionCheck,
  useStartSurvey,
  useSubmitSurvey,
  surveyKeys,
} from './useBehaviorSurvey';

// Social hooks
export { useUserSearch } from './useUserSearch';

// Resilient Mutation hooks - Offline support & optimistic updates
export {
  useResilientMutation,
  useSyncStatus,
  isPending,
  type ResilientMutationOptions,
  type ResilientMutationResult,
} from './useResilientMutation';

// Resilient Transaction hooks - Example implementation
export {
  useCreateTransaction,
  useUpdateTransaction,
  useDeleteTransaction,
  transactionKeys,
  type Transaction,
  type CreateTransactionInput,
} from './useResilientTransactions';

// Async Validation hooks - Debounced with rate limit handling
export {
  useDebouncedValidation,
  usePasswordStrength,
  useEmailValidation,
  useUsernameValidation,
  usePhoneValidation,
  useWalletNameValidation,
  type AsyncValidationResult,
  type PasswordStrengthResult,
  type ValidationStatus,
} from './useDebouncedValidation';

// Accessibility hooks - Motion & accessibility preferences
export {
  useReducedMotion,
  useAccessibilityInfo,
  getAccessibleDuration,
  getAccessibleSpringConfig,
  type AccessibilityState,
} from './useReducedMotion';
