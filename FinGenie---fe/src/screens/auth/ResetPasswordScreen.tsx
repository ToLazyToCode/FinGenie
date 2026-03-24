import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tokens } from '../../theme';
import { GradientButton } from '../../components/ui';
import { useI18n } from '../../i18n/useI18n';
import { authApi } from '../../api/modules';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ResetPassword'>;
type Route = RouteProp<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { resetToken } = route.params;
  const { t } = useI18n();
  const screenText = useMemo(
    () => ({
      title: t('auth.reset.title'),
      subtitle: t('auth.reset.subtitle'),
      newPassword: t('auth.reset.newPasswordLabel'),
      newPasswordPlaceholder: t('auth.reset.newPasswordPlaceholder'),
      confirmPassword: t('auth.reset.confirmPasswordLabel'),
      confirmPasswordPlaceholder: t('auth.reset.confirmPasswordPlaceholder'),
      hide: t('auth.hide'),
      show: t('auth.show'),
      requirementTitle: t('auth.reset.requirementTitle'),
      requirementLength: t('auth.reset.requirementLength'),
      requirementUpper: t('auth.reset.requirementUpper'),
      requirementLower: t('auth.reset.requirementLower'),
      requirementNumber: t('auth.reset.requirementNumber'),
      submit: t('auth.reset.cta'),
      successTitle: t('auth.reset.successTitle'),
      successMessage: t('auth.reset.successMessage'),
      goToLogin: t('auth.reset.goToLogin'),
      linkExpiredTitle: t('auth.reset.linkExpiredTitle'),
      linkExpiredMessage: t('auth.reset.linkExpiredMessage'),
      requestNewLink: t('auth.reset.requestNewLink'),
      errorTitle: t('common.error'),
      errorMessage: t('auth.reset.failedMessage'),
      passwordRequired: t('auth.validation.passwordRequired'),
      passwordMin: t('auth.validation.passwordMin8'),
      passwordRule: t('auth.validation.passwordStrongRule'),
      confirmPasswordRequired: t('auth.validation.confirmPasswordRequired'),
      confirmPasswordMismatch: t('auth.validation.confirmPasswordMismatch'),
    }),
    [t]
  );

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirmPassword?: string }>({});

  const validate = useCallback(() => {
    const newErrors: typeof errors = {};

    if (!password) {
      newErrors.password = screenText.passwordRequired;
    } else if (password.length < 8) {
      newErrors.password = screenText.passwordMin;
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      newErrors.password = screenText.passwordRule;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = screenText.confirmPasswordRequired;
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = screenText.confirmPasswordMismatch;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [password, confirmPassword, screenText]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      await authApi.forgotPasswordReset({
        resetToken,
        newPassword: password,
        confirmPassword,
      });

      Alert.alert(
        screenText.successTitle,
        screenText.successMessage,
        [
          {
            text: screenText.goToLogin,
            onPress: () => {
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Login' }],
                })
              );
            },
          },
        ]
      );
    } catch (err: unknown) {
      const error = err as { message?: string; code?: string };
      
      if (error.code === 'TOKEN_EXPIRED') {
        Alert.alert(
          screenText.linkExpiredTitle,
          screenText.linkExpiredMessage,
          [
            {
              text: screenText.requestNewLink,
              onPress: () => {
                navigation.dispatch(
                  CommonActions.reset({
                    index: 0,
                    routes: [{ name: 'ForgotPassword' }],
                  })
                );
              },
            },
          ]
        );
      } else {
        Alert.alert(screenText.errorTitle, error.message || screenText.errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    password,
    confirmPassword,
    resetToken,
    validate,
    navigation,
    screenText.errorMessage,
    screenText.errorTitle,
    screenText.goToLogin,
    screenText.linkExpiredMessage,
    screenText.linkExpiredTitle,
    screenText.requestNewLink,
    screenText.successMessage,
    screenText.successTitle,
  ]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Text style={styles.icon}>🔑</Text>
            </View>
            <Text style={styles.title}>{screenText.title}</Text>
            <Text style={styles.subtitle}>
              {screenText.subtitle}
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{screenText.newPassword}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.password ? styles.inputError : undefined,
                  ]}
                  placeholder={screenText.newPasswordPlaceholder}
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

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{screenText.confirmPassword}</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword ? styles.inputError : undefined]}
                placeholder={screenText.confirmPasswordPlaceholder}
                placeholderTextColor={tokens.colors.textMuted}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (errors.confirmPassword) setErrors(e => ({ ...e, confirmPassword: undefined }));
                }}
                editable={!isLoading}
              />
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            {/* Password requirements */}
            <View style={styles.requirements}>
              <Text style={styles.requirementsTitle}>{screenText.requirementTitle}</Text>
              <Text style={[styles.requirement, password.length >= 8 && styles.requirementMet]}>
                {screenText.requirementLength}
              </Text>
              <Text style={[styles.requirement, /[A-Z]/.test(password) && styles.requirementMet]}>
                {screenText.requirementUpper}
              </Text>
              <Text style={[styles.requirement, /[a-z]/.test(password) && styles.requirementMet]}>
                {screenText.requirementLower}
              </Text>
              <Text style={[styles.requirement, /\d/.test(password) && styles.requirementMet]}>
                {screenText.requirementNumber}
              </Text>
            </View>

            <GradientButton
              title={isLoading ? '' : screenText.submit}
              onPress={handleSubmit}
              disabled={isLoading}
              style={styles.submitButton}
            >
              {isLoading && <ActivityIndicator color="#fff" />}
            </GradientButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: tokens.colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.sm,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
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
  requirements: {
    backgroundColor: tokens.colors.backgroundSecondary,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    marginBottom: tokens.spacing.lg,
  },
  requirementsTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
    color: tokens.colors.text,
    marginBottom: tokens.spacing.xs,
  },
  requirement: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textMuted,
    marginTop: tokens.spacing.xs,
  },
  requirementMet: {
    color: tokens.colors.success,
  },
  submitButton: {
    marginTop: tokens.spacing.sm,
  },
});
