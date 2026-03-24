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
import { GradientButton } from '../../components/ui';
import { useI18n } from '../../i18n/useI18n';
import { authApi } from '../../api/modules';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen() {
  const navigation = useNavigation<Nav>();
  const { t } = useI18n();
  const screenText = useMemo(
    () => ({
      title: t('auth.forgot.title'),
      subtitle: t('auth.forgot.subtitle'),
      emailLabel: t('auth.forgot.emailLabel'),
      emailPlaceholder: t('auth.forgot.emailPlaceholder'),
      submit: t('auth.forgot.cta'),
      backToLogin: t('auth.forgot.backToLogin'),
      errorTitle: t('common.error'),
      errorSubmit: t('auth.forgot.failedMessage'),
      emailRequired: t('auth.validation.emailRequired'),
      emailInvalid: t('auth.validation.emailInvalid'),
    }),
    [t]
  );
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(() => {
    if (!email.trim()) {
      setError(screenText.emailRequired);
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError(screenText.emailInvalid);
      return false;
    }
    setError(null);
    return true;
  }, [email, screenText.emailInvalid, screenText.emailRequired]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;

    setIsLoading(true);
    try {
      const response = await authApi.forgotPasswordRequestOtp({ email: email.trim() });
      
      navigation.navigate('OtpVerify', {
        sessionId: response.data.sessionId,
        email: response.data.email,
        expiresInSeconds: response.data.expiresInSeconds,
        flow: 'forgotPassword',
      });
    } catch (err: unknown) {
      const error = err as { message?: string };
      Alert.alert(screenText.errorTitle, error.message || screenText.errorSubmit);
    } finally {
      setIsLoading(false);
    }
  }, [email, validate, navigation, screenText.errorSubmit, screenText.errorTitle]);

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
              <Text style={styles.icon}>🔐</Text>
            </View>
            <Text style={styles.title}>{screenText.title}</Text>
            <Text style={styles.subtitle}>{screenText.subtitle}</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputContainer}>
              <Text style={styles.label}>{screenText.emailLabel}</Text>
              <TextInput
                style={[styles.input, error ? styles.inputError : undefined]}
                placeholder={screenText.emailPlaceholder}
                placeholderTextColor={tokens.colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(null);
                }}
                editable={!isLoading}
              />
              {error && <Text style={styles.errorText}>{error}</Text>}
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

          {/* Back to login */}
          <View style={styles.footer}>
            <Pressable
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backText}>{screenText.backToLogin}</Text>
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
    lineHeight: 22,
    paddingHorizontal: tokens.spacing.md,
  },
  form: {
    marginBottom: tokens.spacing.xl,
  },
  inputContainer: {
    marginBottom: tokens.spacing.lg,
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
  errorText: {
    fontSize: tokens.typography.fontSizes.xs,
    color: tokens.colors.error,
    marginTop: tokens.spacing.xs,
  },
  submitButton: {
    marginTop: tokens.spacing.sm,
  },
  footer: {
    alignItems: 'center',
  },
  backButton: {
    padding: tokens.spacing.sm,
  },
  backText: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.medium,
  },
});
