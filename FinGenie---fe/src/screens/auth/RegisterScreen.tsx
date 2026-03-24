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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tokens } from '../../theme';
import { useI18n } from '../../i18n/useI18n';
import { GradientButton, QuickSettingsDropdown } from '../../components/ui';
import { authApi } from '../../api/modules';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Register'>;

export function RegisterScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const screenText = useMemo(
    () => ({
      title: t('auth.register.title'),
      subtitle: t('auth.register.subtitle'),
      fullNameLabel: t('profile.fullName'),
      fullNamePlaceholder: t('auth.register.fullNamePlaceholder'),
      emailLabel: t('auth.email'),
      emailPlaceholder: t('auth.register.emailPlaceholder'),
      dobLabel: t('auth.register.dateOfBirthLabel'),
      dobPlaceholder: t('auth.register.dateOfBirthPlaceholder'),
      passwordLabel: t('auth.password'),
      passwordPlaceholder: t('auth.register.passwordPlaceholder'),
      confirmPasswordLabel: t('auth.register.confirmPasswordLabel'),
      confirmPasswordPlaceholder: t('auth.register.confirmPasswordPlaceholder'),
      hide: t('auth.hide'),
      show: t('auth.show'),
      submit: t('auth.register.cta'),
      termsPrefix: t('auth.register.termsPrefix'),
      termsOfService: t('settings.termsOfService'),
      and: t('common.and'),
      privacyPolicy: t('settings.privacyPolicy'),
      hasAccount: t('auth.register.hasAccount'),
      signIn: t('auth.login'),
      errorTitle: t('auth.register.failedTitle'),
      errorMessage: t('auth.register.failedMessage'),
      fullNameRequired: t('auth.validation.fullNameRequired'),
      fullNameMin: t('auth.validation.fullNameMin'),
      emailRequired: t('auth.validation.emailRequired'),
      emailInvalid: t('auth.validation.emailInvalid'),
      dobRequired: t('auth.validation.dateOfBirthRequired'),
      dobFormat: t('auth.validation.dateOfBirthFormat'),
      dobInvalid: t('auth.validation.dateOfBirthInvalid'),
      dobFuture: t('auth.validation.dateOfBirthFuture'),
      dobMinAge: t('auth.validation.dateOfBirthMinAge'),
      passwordRequired: t('auth.validation.passwordRequired'),
      passwordMin: t('auth.validation.passwordMin8'),
      passwordRule: t('auth.validation.passwordStrongRule'),
      confirmPasswordRequired: t('auth.validation.confirmPasswordRequired'),
      confirmPasswordMismatch: t('auth.validation.confirmPasswordMismatch'),
    }),
    [t]
  );

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    dateOfBirth?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validate = useCallback(() => {
    const newErrors: typeof errors = {};

    if (!fullName.trim()) {
      newErrors.fullName = screenText.fullNameRequired;
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = screenText.fullNameMin;
    }

    if (!email.trim()) {
      newErrors.email = screenText.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = screenText.emailInvalid;
    }

    if (!dateOfBirth.trim()) {
      newErrors.dateOfBirth = screenText.dobRequired;
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      newErrors.dateOfBirth = screenText.dobFormat;
    } else {
      const [year, month, day] = dateOfBirth.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      const now = new Date();
      if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
        newErrors.dateOfBirth = screenText.dobInvalid;
      } else if (date > now) {
        newErrors.dateOfBirth = screenText.dobFuture;
      }
    }

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
  }, [fullName, email, dateOfBirth, password, confirmPassword, screenText]);

  const handleRegister = useCallback(async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await authApi.register({
        email: email.trim(),
        password,
        confirmPassword,
        fullName: fullName.trim(),
        dateOfBirth: dateOfBirth.trim(),
      });

      // Navigate to OTP verification
      navigation.navigate('OtpVerify', {
        sessionId: response.data.sessionId,
        email: response.data.email,
        expiresInSeconds: response.data.expiresInSeconds,
        flow: 'register',
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      Alert.alert(screenText.errorTitle, err.message || screenText.errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [fullName, email, password, validate, navigation, screenText.errorMessage, screenText.errorTitle]);

  const clearError = (field: keyof typeof errors) => {
    if (errors[field]) {
      setErrors(e => ({ ...e, [field]: undefined }));
    }
  };

  // Format date as user types: auto-insert dashes for YYYY-MM-DD
  const formatDateInput = (text: string) => {
    // Remove all non-numeric characters
    const numbers = text.replace(/\D/g, '');
    
    // Limit to 8 digits (YYYYMMDD)
    const limited = numbers.slice(0, 8);
    
    // Format with dashes
    if (limited.length <= 4) {
      return limited;
    } else if (limited.length <= 6) {
      return `${limited.slice(0, 4)}-${limited.slice(4)}`;
    } else {
      return `${limited.slice(0, 4)}-${limited.slice(4, 6)}-${limited.slice(6)}`;
    }
  };

  // Validate date on blur
  const validateDateOfBirth = () => {
    if (!dateOfBirth.trim()) {
      setErrors(e => ({ ...e, dateOfBirth: screenText.dobRequired }));
      return;
    }
    
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) {
      setErrors(e => ({ ...e, dateOfBirth: screenText.dobFormat }));
      return;
    }
    
    const [year, month, day] = dateOfBirth.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const now = new Date();
    
    // Check if date is valid
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      setErrors(e => ({ ...e, dateOfBirth: screenText.dobInvalid }));
      return;
    }
    
    // Check if date is in the future
    if (date > now) {
      setErrors(e => ({ ...e, dateOfBirth: screenText.dobFuture }));
      return;
    }
    
    // Check minimum age (e.g., at least 13 years old)
    const minAge = 13;
    const minDate = new Date(now.getFullYear() - minAge, now.getMonth(), now.getDate());
    if (date > minDate) {
      setErrors(e => ({ ...e, dateOfBirth: screenText.dobMinAge }));
      return;
    }
  };

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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{screenText.title}</Text>
            <Text style={styles.subtitle}>{screenText.subtitle}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{screenText.fullNameLabel}</Text>
              <TextInput
                style={[styles.input, errors.fullName ? styles.inputError : undefined]}
                placeholder={screenText.fullNamePlaceholder}
                placeholderTextColor={tokens.colors.textMuted}
                autoCapitalize="words"
                value={fullName}
                onChangeText={(text) => {
                  setFullName(text);
                  clearError('fullName');
                }}
                editable={!isLoading}
              />
              {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}
            </View>

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
                  clearError('email');
                }}
                editable={!isLoading}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{screenText.dobLabel}</Text>
              <TextInput
                style={[styles.input, errors.dateOfBirth ? styles.inputError : undefined]}
                placeholder={screenText.dobPlaceholder}
                placeholderTextColor={tokens.colors.textMuted}
                keyboardType="numeric"
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={10}
                value={dateOfBirth}
                onChangeText={(text) => {
                  const formatted = formatDateInput(text);
                  setDateOfBirth(formatted);
                  clearError('dateOfBirth');
                }}
                onBlur={validateDateOfBirth}
                editable={!isLoading}
              />
              {errors.dateOfBirth && <Text style={styles.errorText}>{errors.dateOfBirth}</Text>}
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.label}>{screenText.passwordLabel}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[
                    styles.input,
                    styles.passwordInput,
                    errors.password ? styles.inputError : undefined,
                  ]}
                  placeholder={screenText.passwordPlaceholder}
                  placeholderTextColor={tokens.colors.textMuted}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    clearError('password');
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
              <Text style={styles.label}>{screenText.confirmPasswordLabel}</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword ? styles.inputError : undefined]}
                placeholder={screenText.confirmPasswordPlaceholder}
                placeholderTextColor={tokens.colors.textMuted}
                secureTextEntry={!showPassword}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  clearError('confirmPassword');
                }}
                editable={!isLoading}
              />
              {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
            </View>

            <GradientButton
              title={isLoading ? '' : screenText.submit}
              onPress={handleRegister}
              disabled={isLoading}
              style={styles.registerButton}
            >
              {isLoading && <ActivityIndicator color="#fff" />}
            </GradientButton>

            {/* Terms */}
            <Text style={styles.termsText}>
              {`${screenText.termsPrefix} `}
              <Text style={styles.termsLink}>{screenText.termsOfService}</Text>
              {` ${screenText.and} `}
              <Text style={styles.termsLink}>{screenText.privacyPolicy}</Text>
            </Text>
          </View>

          {/* Login Link */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>{`${screenText.hasAccount} `}</Text>
            <Pressable onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>{screenText.signIn}</Text>
            </Pressable>
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
  },
  header: {
    marginTop: tokens.spacing.xl,
    marginBottom: tokens.spacing.xl,
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
  registerButton: {
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.md,
  },
  termsText: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  termsLink: {
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    paddingBottom: tokens.spacing.lg,
  },
  footerText: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.textSecondary,
  },
  loginLink: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});
