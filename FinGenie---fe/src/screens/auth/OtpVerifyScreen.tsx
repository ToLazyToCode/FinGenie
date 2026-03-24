import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { tokens } from '../../theme';
import { GradientButton, Card } from '../../components/ui';
import { useI18n } from '../../i18n/useI18n';
import { authApi } from '../../api/modules';
import { authStore } from '../../store';
import type { AuthStackParamList } from '../../navigation/types';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'OtpVerify'>;
type Route = RouteProp<AuthStackParamList, 'OtpVerify'>;

const OTP_LENGTH = 6;

export function OtpVerifyScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { sessionId, email, expiresInSeconds, flow } = route.params;
  const { t } = useI18n();
  const { setTokens, setUser } = authStore();
  const screenText = useMemo(
    () => ({
      invalidOtpTitle: t('auth.otp.invalidTitle'),
      invalidOtpMessage: t('auth.otp.invalidMessage'),
      verifyFailedTitle: t('auth.otp.verifyFailedTitle'),
      verifyFailedMessage: t('auth.otp.verifyFailedMessage'),
      otpSentTitle: t('auth.otp.sentTitle'),
      otpSentMessage: t('auth.otp.sentMessage'),
      errorTitle: t('common.error'),
      resendFailedMessage: t('auth.otp.resendFailedMessage'),
      blockedTitle: t('auth.otp.blockedTitle'),
      blockedTextOne: t('auth.otp.blockedTextOne'),
      blockedTextTwo: t('auth.otp.blockedTextTwo'),
      contactSupport: t('auth.otp.contactSupport'),
      title: t('auth.otp.title'),
      subtitlePrefix: t('auth.otp.subtitlePrefix'),
      expiresIn: t('auth.otp.expiresIn'),
      expiredMessage: t('auth.otp.expired'),
      attemptsRemaining: t('auth.otp.attemptsRemaining'),
      verify: t('auth.otp.verify'),
      didntReceive: t('auth.otp.didntReceive'),
      resendIn: t('auth.otp.resendIn'),
      resend: t('auth.otp.resend'),
      sending: t('auth.otp.sending'),
    }),
    [t]
  );

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [timeLeft, setTimeLeft] = useState(expiresInSeconds ?? 300); // Default 5 min if not provided
  const [cooldownTime, setCooldownTime] = useState(0);
  const [isBlacklisted, setIsBlacklisted] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(5);
  const [currentSessionId, setCurrentSessionId] = useState(sessionId);

  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Countdown timer for OTP expiry
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Cooldown timer for resend
  useEffect(() => {
    if (cooldownTime <= 0) return;
    const timer = setInterval(() => {
      setCooldownTime(t => Math.max(0, t - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownTime]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = useCallback((value: string, index: number) => {
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '').slice(-1);
    
    const newOtp = otp.split('');
    newOtp[index] = digit;
    const otpString = newOtp.join('');
    setOtp(otpString);

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when complete
    if (otpString.length === OTP_LENGTH && !otpString.includes(' ')) {
      handleVerify(otpString);
    }
  }, [otp]);

  const handleKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  const handleVerify = useCallback(async (otpCode?: string) => {
    const code = otpCode || otp;
    if (code.length !== OTP_LENGTH) {
      Alert.alert(screenText.invalidOtpTitle, screenText.invalidOtpMessage);
      return;
    }

    setIsLoading(true);
    try {
      if (flow === 'register') {
        const response = await authApi.verifyEmailOtp({
          sessionId: currentSessionId,
          otp: code,
        });
        setTokens(response.data.accessToken, response.data.refreshToken);
        setUser({
          accountId: response.data.accountId,
          email: response.data.email,
          fullName: response.data.fullName,
        });
        // Navigation handled by auth state
      } else if (flow === 'forgotPassword') {
        const response = await authApi.forgotPasswordVerifyOtp({
          sessionId: currentSessionId,
          otp: code,
        });
        navigation.navigate('ResetPassword', {
          resetToken: response.data.resetToken,
        });
      }
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string; status?: number };
      
      // Handle blacklist
      if (err.status === 429 || err.code === 'BLACKLISTED') {
        setIsBlacklisted(true);
        return;
      }

      // Handle cooldown
      if (err.code === 'COOLDOWN') {
        const match = err.message?.match(/(\d+)/);
        if (match) {
          setCooldownTime(parseInt(match[1], 10));
        }
        return;
      }

      // Handle wrong attempts
      setAttemptsLeft(prev => Math.max(0, prev - 1));
      Alert.alert(screenText.verifyFailedTitle, err.message || screenText.verifyFailedMessage);
      setOtp('');
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  }, [
    otp,
    currentSessionId,
    flow,
    navigation,
    setTokens,
    screenText.invalidOtpMessage,
    screenText.invalidOtpTitle,
    screenText.verifyFailedMessage,
    screenText.verifyFailedTitle,
  ]);

  const handleResend = useCallback(async () => {
    if (cooldownTime > 0 || isResending) return;

    setIsResending(true);
    try {
      const response = flow === 'register'
        ? await authApi.resendRegisterOtp({ sessionId: currentSessionId })
        : await authApi.resendForgotPasswordOtp({ sessionId: currentSessionId });

      setCurrentSessionId(response.data.sessionId);
      setTimeLeft(response.data.expiresInSeconds);
      setCooldownTime(60); // 60 second cooldown
      setOtp('');
      inputRefs.current[0]?.focus();
      Alert.alert(screenText.otpSentTitle, screenText.otpSentMessage);
    } catch (error: unknown) {
      const err = error as { message?: string; code?: string };
      
      if (err.code === 'COOLDOWN') {
        const match = err.message?.match(/(\d+)/);
        if (match) {
          setCooldownTime(parseInt(match[1], 10));
        }
      } else {
        Alert.alert(screenText.errorTitle, err.message || screenText.resendFailedMessage);
      }
    } finally {
      setIsResending(false);
    }
  }, [
    cooldownTime,
    isResending,
    currentSessionId,
    flow,
    screenText.errorTitle,
    screenText.otpSentMessage,
    screenText.otpSentTitle,
    screenText.resendFailedMessage,
  ]);

  // Blacklist UI
  if (isBlacklisted) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centerContent}>
          <Card style={styles.blockedCard}>
            <Text style={styles.blockedIcon}>⛔</Text>
            <Text style={styles.blockedTitle}>{screenText.blockedTitle}</Text>
            <Text style={styles.blockedText}>
              {screenText.blockedTextOne}

            </Text>
            <Text style={styles.blockedText}>
              {screenText.blockedTextTwo}
            </Text>
            <Pressable style={styles.contactButton}>
              <Text style={styles.contactButtonText}>{screenText.contactSupport}</Text>
            </Pressable>
          </Card>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>{screenText.title}</Text>
            <Text style={styles.subtitle}>
              {screenText.subtitlePrefix}{'\n'}
              <Text style={styles.emailText}>{email}</Text>
            </Text>
          </View>

          {/* Timer */}
          <View style={styles.timerContainer}>
            {timeLeft > 0 ? (
              <>
                <Text style={styles.timerText}>{screenText.expiresIn}</Text>
                <Text style={[styles.timerValue, timeLeft < 60 && styles.timerWarning]}>
                  {formatTime(timeLeft)}
                </Text>
              </>
            ) : (
              <Text style={styles.expiredText}>{screenText.expiredMessage}</Text>
            )}
          </View>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            {Array.from({ length: OTP_LENGTH }).map((_, index) => (
              <TextInput
                key={index}
                ref={(ref) => { inputRefs.current[index] = ref; }}
                style={[
                  styles.otpInput,
                  otp[index] ? styles.otpInputFilled : undefined,
                  attemptsLeft < 3 ? styles.otpInputWarning : undefined,
                ]}
                value={otp[index] || ''}
                onChangeText={(value) => handleOtpChange(value, index)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, index)}
                keyboardType="number-pad"
                maxLength={1}
                editable={!isLoading}
                selectTextOnFocus
              />
            ))}
          </View>

          {/* Attempts Warning */}
          {attemptsLeft < 5 && attemptsLeft > 0 && (
            <Text style={styles.attemptsText}>
              {attemptsLeft} {screenText.attemptsRemaining}
            </Text>
          )}

          {/* Verify Button */}
          <GradientButton
            title={isLoading ? '' : screenText.verify}
            onPress={() => handleVerify()}
            disabled={isLoading || otp.length !== OTP_LENGTH || timeLeft <= 0}
            style={styles.verifyButton}
          >
            {isLoading && <ActivityIndicator color="#fff" />}
          </GradientButton>

          {/* Resend */}
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>{screenText.didntReceive}</Text>
            {cooldownTime > 0 ? (
              <View style={styles.cooldownContainer}>
                <Text style={styles.cooldownText}>
                  {screenText.resendIn} {formatTime(cooldownTime)}
                </Text>
                {/* Cooldown ring indicator */}
                <View style={styles.cooldownRing}>
                  <View 
                    style={[
                      styles.cooldownProgress,
                      { transform: [{ rotate: `${(1 - cooldownTime / 60) * 360}deg` }] }
                    ]} 
                  />
                </View>
              </View>
            ) : (
              <Pressable onPress={handleResend} disabled={isResending}>
                <Text style={[styles.resendLink, isResending && styles.resendDisabled]}>
                  {isResending ? screenText.sending : screenText.resend}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
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
  content: {
    flex: 1,
    padding: tokens.spacing.lg,
    justifyContent: 'center',
  },
  centerContent: {
    flex: 1,
    padding: tokens.spacing.lg,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: tokens.spacing.xl,
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
  },
  emailText: {
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: tokens.spacing.lg,
  },
  timerText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textSecondary,
  },
  timerValue: {
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
    marginTop: tokens.spacing.xs,
  },
  timerWarning: {
    color: tokens.colors.warning,
  },
  expiredText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.error,
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.lg,
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: tokens.colors.surface,
    borderWidth: 2,
    borderColor: tokens.colors.border,
    borderRadius: tokens.borderRadius.md,
    fontSize: tokens.typography.fontSizes.xl,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.text,
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: tokens.colors.primary,
    backgroundColor: tokens.colors.accent,
  },
  otpInputWarning: {
    borderColor: tokens.colors.warning,
  },
  attemptsText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.warning,
    textAlign: 'center',
    marginBottom: tokens.spacing.md,
  },
  verifyButton: {
    marginBottom: tokens.spacing.lg,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  resendText: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.textSecondary,
  },
  resendLink: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.primary,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  resendDisabled: {
    opacity: 0.5,
  },
  cooldownContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cooldownText: {
    fontSize: tokens.typography.fontSizes.sm,
    color: tokens.colors.textMuted,
  },
  cooldownRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: tokens.colors.border,
    marginLeft: tokens.spacing.xs,
    overflow: 'hidden',
  },
  cooldownProgress: {
    position: 'absolute',
    width: 10,
    height: 20,
    backgroundColor: tokens.colors.primary,
    left: 10,
  },
  // Blocked state
  blockedCard: {
    alignItems: 'center',
    padding: tokens.spacing.xl,
  },
  blockedIcon: {
    fontSize: 48,
    marginBottom: tokens.spacing.md,
  },
  blockedTitle: {
    fontSize: tokens.typography.fontSizes.lg,
    fontWeight: tokens.typography.fontWeights.bold,
    color: tokens.colors.error,
    marginBottom: tokens.spacing.sm,
    textAlign: 'center',
  },
  blockedText: {
    fontSize: tokens.typography.fontSizes.md,
    color: tokens.colors.textSecondary,
    textAlign: 'center',
    marginBottom: tokens.spacing.sm,
    lineHeight: 20,
  },
  contactButton: {
    marginTop: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    backgroundColor: tokens.colors.primary,
    borderRadius: tokens.borderRadius.md,
  },
  contactButtonText: {
    fontSize: tokens.typography.fontSizes.md,
    color: '#fff',
    fontWeight: tokens.typography.fontWeights.semibold,
  },
});
