/**
 * Account Linking Modal
 * 
 * Shown when Google sign-in detects an existing account with the same email.
 * Requires password verification to complete the account linking securely.
 * 
 * Security Features:
 * - Password verification before linking
 * - 10-minute link token expiration
 * - Shows existing auth providers for clarity
 */

import React, { useState, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useThemeStore } from '../../store/themeStore';
import type { ThemeColors } from '../../theme/colors';

interface AccountLinkingModalProps {
  visible: boolean;
  email: string | null;
  existingProviders: string[];
  isLoading: boolean;
  error: string | null;
  onSubmit: (password: string) => void;
  onCancel: () => void;
}

const PROVIDER_LABELS: Record<string, string> = {
  EMAIL: 'Email & Password',
  GOOGLE: 'Google',
  APPLE: 'Apple',
  FACEBOOK: 'Facebook',
};

export function AccountLinkingModal({
  visible,
  email,
  existingProviders,
  isLoading,
  error,
  onSubmit,
  onCancel,
}: AccountLinkingModalProps) {
  const { colors } = useThemeStore();
  const themedStyles = useMemo(() => getThemedStyles(colors), [colors]);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = () => {
    if (password.trim()) {
      onSubmit(password);
    }
  };

  const handleCancel = () => {
    setPassword('');
    onCancel();
  };

  const formatProviders = () => {
    return existingProviders
      .map(p => PROVIDER_LABELS[p] || p)
      .join(', ');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={[styles.container, themedStyles.container]}>
          {/* Header */}
          <View style={[styles.header, themedStyles.header]}>
            <Text style={styles.icon}>🔗</Text>
            <Text style={[styles.title, themedStyles.title]}>Link Your Account</Text>
          </View>

          {/* Description */}
          <View style={styles.content}>
            <Text style={[styles.description, themedStyles.description]}>
              An account already exists with{' '}
              <Text style={[styles.email, themedStyles.email]}>{email}</Text>
            </Text>

            {existingProviders.length > 0 && (
              <View style={[styles.providersContainer, themedStyles.providersContainer]}>
                <Text style={[styles.providersLabel, themedStyles.providersLabel]}>Current sign-in methods:</Text>
                <Text style={[styles.providersText, themedStyles.providersText]}>{formatProviders()}</Text>
              </View>
            )}

            <Text style={[styles.instruction, themedStyles.instruction]}>
              Enter your password to securely link your Google account.
            </Text>

            {/* Password Input */}
            <View style={[styles.inputContainer, themedStyles.inputContainer]}>
              <TextInput
                style={[styles.input, themedStyles.input]}
                placeholder="Enter your password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>
                  {showPassword ? '🙈' : '👁️'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Message */}
            {error && (
              <View style={[styles.errorContainer, themedStyles.errorContainer]}>
                <Text style={[styles.errorText, themedStyles.errorText]}>{error}</Text>
              </View>
            )}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, themedStyles.cancelButton]}
              onPress={handleCancel}
              disabled={isLoading}
            >
              <Text style={[styles.cancelButtonText, themedStyles.cancelButtonText]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.submitButton,
                themedStyles.submitButton,
                (!password.trim() || isLoading) && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={!password.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.textOnPrimary} size="small" />
              ) : (
                <Text style={[styles.submitButtonText, themedStyles.submitButtonText]}>Link Account</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Security Note */}
          <View style={styles.securityNote}>
            <Text style={styles.securityIcon}>🔒</Text>
            <Text style={[styles.securityText, themedStyles.securityText]}>
              Your password is verified securely and never stored with Google.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/**
 * Generate themed styles based on current theme colors
 */
const getThemedStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.surface,
    },
    header: {
      backgroundColor: colors.backgroundSecondary,
      borderBottomColor: colors.border,
    },
    title: {
      color: colors.text,
    },
    description: {
      color: colors.textSecondary,
    },
    email: {
      color: colors.text,
    },
    providersContainer: {
      backgroundColor: colors.backgroundSecondary,
    },
    providersLabel: {
      color: colors.textMuted,
    },
    providersText: {
      color: colors.text,
    },
    instruction: {
      color: colors.textMuted,
    },
    inputContainer: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    input: {
      color: colors.text,
    },
    errorContainer: {
      backgroundColor: colors.error + '33', // 20% opacity
    },
    errorText: {
      color: colors.error,
    },
    cancelButton: {
      backgroundColor: colors.backgroundSecondary,
    },
    cancelButtonText: {
      color: colors.textSecondary,
    },
    submitButton: {
      backgroundColor: colors.primary,
    },
    submitButtonText: {
      color: colors.textOnPrimary,
    },
    securityText: {
      color: colors.textMuted,
    },
  });

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
  },
  icon: {
    fontSize: 40,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    padding: 24,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 16,
  },
  email: {
    fontWeight: '600',
  },
  providersContainer: {
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  providersLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  providersText: {
    fontSize: 14,
    fontWeight: '500',
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  eyeButton: {
    padding: 12,
  },
  eyeIcon: {
    fontSize: 20,
  },
  errorContainer: {
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    padding: 16,
    paddingTop: 0,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {},
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {},
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    paddingTop: 0,
    gap: 6,
  },
  securityIcon: {
    fontSize: 12,
  },
  securityText: {
    fontSize: 11,
    textAlign: 'center',
    flex: 1,
  },
});

export default AccountLinkingModal;
