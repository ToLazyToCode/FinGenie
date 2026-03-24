import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import { authStore } from '../store';
import { FormInput, LoadingButton, Skeleton } from '../components/form';
import { Avatar } from '../components/ui';
import { useForm, profileValidationSchema } from '../utils/validation';
import { userProfileApi, UserProfileResponse } from '../api/modules';

interface ProfileFormData {
  fullName: string;
  bio: string;
  phone: string;
}

export function EditProfileScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { colors } = useThemeStore();
  const { t, locale } = useI18n();

  const user = authStore((state) => state.user);
  const setUser = authStore((state) => state.setUser);

  // Fetch profile data
  const {
    data: profileData,
    isLoading,
    error,
    refetch,
  } = useQuery<UserProfileResponse>({
    queryKey: ['profile', 'me'],
    queryFn: async () => {
      const { data } = await userProfileApi.getMe();
      return data;
    },
  });

  const initialValues: ProfileFormData = {
    fullName: profileData?.fullName || user?.fullName || '',
    bio: profileData?.bio || '',
    phone: profileData?.phone || '',
  };

  const {
    values,
    errors,
    touched,
    isSubmitting,
    setValue,
    setTouched,
    handleSubmit,
    reset,
  } = useForm<ProfileFormData>({
    initialValues,
    schema: profileValidationSchema,
    onSubmit: async (formValues) => {
      await updateProfileMutation.mutateAsync(formValues);
    },
  });

  // Update form when profile data loads
  useEffect(() => {
    if (profileData) {
      reset({
        fullName: profileData.fullName || '',
        bio: profileData.bio || '',
        phone: profileData.phone || '',
      });
    }
  }, [profileData, reset]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (formData: ProfileFormData) => {
      const payload = {
        fullName: formData.fullName,
        bio: formData.bio || undefined,
        phone: formData.phone || undefined,
      };
      return userProfileApi.createOrUpdate(payload);
    },
    onSuccess: (response) => {
      // Update local cache
      queryClient.setQueryData(['profile', 'me'], response.data);
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      // Update auth store
      if (user) {
        setUser({ ...user, fullName: response.data.fullName });
      }

      Alert.alert(
        t('common.success'),
        t('profile.updateSuccess'),
        [{ text: t('common.ok'), onPress: () => navigation.goBack() }]
      );
    },
    onError: () => {
      Alert.alert(t('common.error'), t('profile.updateError'));
    },
  });

  const handleAvatarPress = useCallback(() => {
    // TODO: Implement image picker for avatar upload
    Alert.alert(
      t('profile.changeAvatar'),
      t('profile.avatarUploadComingSoon'),
      [{ text: t('common.ok') }]
    );
  }, [t]);

  const avatarUrl = profileData?.avatarUrl || null;
  const displayName = values.fullName || profileData?.fullName || user?.fullName || t('home.userFallbackName');

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.loadingContainer}>
          <Skeleton width={100} height={100} borderRadius={50} style={styles.avatarSkeleton} />
          <Skeleton width={200} height={24} style={styles.nameSkeleton} />
          <View style={styles.formSkeleton}>
            <Skeleton width="100%" height={56} style={styles.inputSkeleton} />
            <Skeleton width="100%" height={56} style={styles.inputSkeleton} />
            <Skeleton width="100%" height={100} style={styles.inputSkeleton} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !profileData) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.text }]}>
            {t('common.loadingError')}
          </Text>
          <LoadingButton
            title={t('common.retry')}
            onPress={() => refetch()}
            variant="outline"
            size="sm"
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>
              {t('profile.edit')}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('profile.subtitle')}
            </Text>
          </View>

          {/* Avatar Section */}
          <TouchableOpacity
            style={styles.avatarSection}
            onPress={handleAvatarPress}
            accessibilityRole="button"
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Avatar name={displayName} size="lg" />
            )}
            <View style={[styles.avatarBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="camera" size={16} color={colors.textOnPrimary} />
            </View>
            <Text style={[styles.changeAvatarText, { color: colors.primary }]}>
              {t('profile.changeAvatar')}
            </Text>
          </TouchableOpacity>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <FormInput
              label={t('profile.fullName')}
              placeholder={t('profile.fullNamePlaceholder')}
              value={values.fullName}
              onChangeText={(text) => setValue('fullName', text)}
              onBlur={() => setTouched('fullName')}
              error={touched.fullName ? errors.fullName : undefined}
              required
            />

            <FormInput
              label={t('profile.phone')}
              placeholder={t('profile.phonePlaceholder')}
              value={values.phone}
              onChangeText={(text) => setValue('phone', text)}
              onBlur={() => setTouched('phone')}
              error={touched.phone ? errors.phone : undefined}
              keyboardType="phone-pad"
            />

            <FormInput
              label={t('profile.bio')}
              placeholder={t('profile.bioPlaceholder')}
              value={values.bio}
              onChangeText={(text) => setValue('bio', text)}
              onBlur={() => setTouched('bio')}
              error={touched.bio ? errors.bio : undefined}
              multiline
              numberOfLines={4}
            />

            {/* Email (Read-only) */}
            <View style={styles.readOnlyField}>
              <Text style={[styles.readOnlyLabel, { color: colors.textSecondary }]}>
                {t('auth.email')}
              </Text>
              <Text
                style={[
                  styles.readOnlyValue,
                  { color: colors.text, backgroundColor: colors.surface },
                ]}
              >
                {profileData?.email || user?.email || ''}
              </Text>
              <Text style={[styles.readOnlyHint, { color: colors.textSecondary }]}>
                {t('profile.emailReadonlyHint')}
              </Text>
            </View>

            {/* Member Since (Read-only) */}
            {profileData?.memberSince && (
              <View style={styles.readOnlyField}>
                <Text style={[styles.readOnlyLabel, { color: colors.textSecondary }]}>
                  {t('profile.memberSince')}
                </Text>
                <Text
                  style={[
                    styles.readOnlyValue,
                    { color: colors.text, backgroundColor: colors.surface },
                  ]}
                >
                  {new Date(profileData.memberSince).toLocaleDateString(locale)}
                </Text>
              </View>
            )}
          </View>

          {/* Submit Button */}
          <View style={styles.buttonContainer}>
            <LoadingButton
              title={t('common.save')}
              onPress={handleSubmit}
              loading={isSubmitting}
              variant="primary"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: tokens.spacing.md,
    paddingBottom: tokens.spacing.xl,
  },
  header: {
    marginBottom: tokens.spacing.lg,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
    marginBottom: tokens.spacing.xs,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.md,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: tokens.spacing.xl,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 24,
    right: '35%',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeAvatarText: {
    marginTop: tokens.spacing.sm,
    fontSize: tokens.typography.fontSizes.sm,
  },
  formSection: {
    gap: tokens.spacing.sm,
  },
  readOnlyField: {
    marginVertical: tokens.spacing.sm,
  },
  readOnlyLabel: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
    marginBottom: tokens.spacing.xs,
  },
  readOnlyValue: {
    fontSize: tokens.typography.fontSizes.md,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.borderRadius.md,
  },
  readOnlyHint: {
    fontSize: tokens.typography.fontSizes.xs,
    marginTop: tokens.spacing.xs,
  },
  buttonContainer: {
    marginTop: tokens.spacing.xl,
  },
  // Loading states
  loadingContainer: {
    flex: 1,
    padding: tokens.spacing.md,
    alignItems: 'center',
  },
  avatarSkeleton: {
    marginBottom: tokens.spacing.md,
  },
  nameSkeleton: {
    marginBottom: tokens.spacing.lg,
  },
  formSkeleton: {
    width: '100%',
  },
  inputSkeleton: {
    marginBottom: tokens.spacing.md,
  },
  // Error state
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.md,
  },
  errorText: {
    fontSize: tokens.typography.fontSizes.md,
    marginVertical: tokens.spacing.md,
    textAlign: 'center',
  },
});
