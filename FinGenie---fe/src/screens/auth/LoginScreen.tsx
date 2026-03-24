import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tokens } from '../../theme';
import { useThemeStore } from '../../store/themeStore';
import { useI18n } from '../../i18n/useI18n';
import { GradientButton, AccountLinkingModal, QuickSettingsDropdown } from '../../components/ui';
import { authApi } from '../../api/modules';
import type { ApiError } from '../../api/client';
import { authStore } from '../../store';
import { useGoogleAuth } from '../../hooks';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

export function LoginScreen() {
  const navigation = useNavigation<Nav>();
  const { colors } = useThemeStore();
  const { t } = useI18n();
  const { setTokens, setUser } = authStore();
  const screenText = useMemo(
    () => ({
      title: t('auth.login.title'),
      subtitle: t('auth.login.subtitle'),
      emailLabel: t('auth.email'),
      emailPlaceholder: t('auth.login.emailPlaceholder'),
      passwordLabel: t('auth.password'),
      passwordPlaceholder: t('auth.login.passwordPlaceholder'),
      hide: t('auth.hide'),
      show: t('auth.show'),
      forgotPassword: t('auth.forgotPassword'),
      signIn: t('auth.login.cta'),
      or: t('common.or'),
      continueWithGoogle: t('auth.login.google'),
      noAccount: t('auth.login.noAccount'),
      signUp: t('auth.register'),
      loginFailedTitle: t('auth.login.failedTitle'),
      loginFailedMessage: t('auth.login.failedMessage'),
      invalidCredentials: t('auth.login.invalidCredentials'),
      networkUnavailable: t('auth.login.networkUnavailable'),
      backendUnavailable: t('auth.login.backendUnavailable'),
      googleFailedTitle: t('auth.login.googleFailedTitle'),
      emailRequired: t('auth.validation.emailRequired'),
      emailInvalid: t('auth.validation.emailInvalid'),
      passwordRequired: t('auth.validation.passwordRequired'),
      passwordTooShort: t('auth.validation.passwordMin6'),
    }),
    [t]
  );

  // Google OAuth with account linking support
  const { 
    signInWithGoogle,
    completeAccountLinking,
    cancelAccountLinking,
    isLoading: isGoogleLoading, 
    error: googleError,
    clearError: clearGoogleError,
    isConfigured: isGoogleConfigured,
    // Account linking state
    linkingRequired,
    linkEmail,
    existingProviders,
  } = useGoogleAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validate = useCallback(() => {
    const newErrors: typeof errors = {};
    
    if (!email.trim()) {
      newErrors.email = screenText.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = screenText.emailInvalid;
    }
    
    if (!password) {
      newErrors.password = screenText.passwordRequired;
    } else if (password.length < 6) {
      newErrors.password = screenText.passwordTooShort;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password, screenText.emailInvalid, screenText.emailRequired, screenText.passwordRequired, screenText.passwordTooShort]);

  const getLoginErrorMessage = useCallback(
    (error: unknown) => {
      const apiError = error as ApiError;

      if (apiError.isNetworkError) {
        return screenText.networkUnavailable;
      }

      if (apiError.status === 401) {
        return screenText.invalidCredentials;
      }

      if ((apiError.status ?? 0) >= 500) {
        return screenText.backendUnavailable;
      }

      return apiError.message || screenText.loginFailedMessage;
    },
    [
      screenText.backendUnavailable,
      screenText.invalidCredentials,
      screenText.loginFailedMessage,
      screenText.networkUnavailable,
    ]
  );

  const handleLogin = useCallback(async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await authApi.login({ email: email.trim(), password });
      setTokens(response.data.accessToken, response.data.refreshToken);
      setUser({
        accountId: response.data.accountId,
        email: response.data.email,
        fullName: response.data.fullName,
      });
      // Navigation to main app will be handled by auth state change
    } catch (error: unknown) {
      Alert.alert(screenText.loginFailedTitle, getLoginErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, [email, getLoginErrorMessage, password, setTokens, screenText.loginFailedTitle, validate]);

  // Handle Google Sign-In
  const handleGoogleLogin = useCallback(async () => {
    clearGoogleError();
    const result = await signInWithGoogle();
    
    // Handle linking required case
    if (result.linkingRequired) {
      // Modal will show automatically via linkingRequired state
      return;
    }
    
    if (!result.success && result.error && result.error !== 'CANCELLED') {
      Alert.alert(screenText.googleFailedTitle, result.error);
    }
    // On success, navigation will be handled by auth state change
  }, [signInWithGoogle, clearGoogleError, screenText.googleFailedTitle]);

  // Handle account linking password submission
  const handleLinkingSubmit = useCallback(async (password: string) => {
    const result = await completeAccountLinking(password);
    
    if (!result.success && result.error) {
      // Error will be shown in the modal
    }
    // On success, navigation will be handled by auth state change
  }, [completeAccountLinking]);

  // Check if any login is in progress
  const isAnyLoading = isLoading || isGoogleLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <QuickSettingsDropdown />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo/Header */}
          <View style={styles.header}>
            <Image
              source={require('../../../assets/image/inapp-logo.png')}
              style={styles.header}
            />
            <Text style={styles.title}>{screenText.title}</Text>
            <Text style={styles.subtitle}>{screenText.subtitle}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{screenText.emailLabel}</Text>
              <TextInput
                style={[styles.input, errors.email ? styles.inputError : undefined]}
                placeholder={screenText.emailPlaceholder}
                placeholderTextColor={tokens.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors(e => ({ ...e, email: undefined }));
                }}
                editable={!isLoading}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{screenText.passwordLabel}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput, errors.password ? styles.inputError : undefined]}
                  placeholder={screenText.passwordPlaceholder}
                  placeholderTextColor={tokens.colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (errors.password) setErrors(e => ({ ...e, password: undefined }));
                  }}
                  editable={!isLoading}
                />
                <Pressable
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Text style={styles.eyeText}>{showPassword ? screenText.hide : screenText.show}</Text>
                </Pressable>
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>

            <Pressable
              style={styles.forgotButton}
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotText}>{screenText.forgotPassword}</Text>
            </Pressable>

            <GradientButton
              title={isLoading ? '' : screenText.signIn}
              onPress={handleLogin}
              disabled={isAnyLoading}
              style={styles.loginButton}
            >
              {isLoading && <ActivityIndicator color={colors.textOnPrimary} />}
            </GradientButton>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>{screenText.or}</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Google Login */}
            <Pressable 
              style={[
                styles.googleButton, 
                isAnyLoading && styles.googleButtonDisabled
              ]} 
              onPress={handleGoogleLogin}
              disabled={isAnyLoading}
            >
              {isGoogleLoading ? (
                <ActivityIndicator color={tokens.colors.text} />
              ) : (
                <>
                  <Image
                    source={require('../../../assets/icons/google.png')}
                    style={styles.googleIcon}
                  />
                  <Text style={styles.googleText}>{screenText.continueWithGoogle}</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* Register Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{`${screenText.noAccount} `}</Text>
            <Pressable onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>{screenText.signUp}</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Account Linking Modal */}
      <AccountLinkingModal
        visible={linkingRequired}
        email={linkEmail || ''}
        existingProviders={existingProviders}
        isLoading={isGoogleLoading}
        error={googleError}
        onSubmit={handleLinkingSubmit}
        onCancel={cancelAccountLinking}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: tokens.spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: tokens.spacing.xl,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  logoText: {
    fontSize: 28,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.textOnPrimary,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.textSecondary,
  },
  form: {
    marginBottom: tokens.spacing.xl,
  },
  inputContainer: {
    marginBottom: tokens.spacing.md,
  },
  label: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  input: {
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.text,
  },
  inputError: {
    borderColor: tokens.colors.error,
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 60,
  },
  eyeButton: {
    position: 'absolute',
    right: tokens.spacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  eyeText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  errorText: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.error,
    marginTop: tokens.spacing.xs,
  },
  forgotButton: {
    alignSelf: 'flex-end',
    marginBottom: tokens.spacing.lg,
  },
  forgotText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  loginButton: {
    marginBottom: tokens.spacing.md,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: tokens.colors.border,
  },
  dividerText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textMuted,
    marginHorizontal: tokens.spacing.md,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.surface,
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    minHeight: 52,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    width: 20,
    height: 20,
    marginRight: tokens.spacing.sm,
  },
  googleText: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.text,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.textSecondary,
  },
  registerLink: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});
