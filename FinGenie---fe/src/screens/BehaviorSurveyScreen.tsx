import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import { tokens } from '../theme';
import { useThemeStore } from '../store/themeStore';
import { useI18n } from '../i18n/useI18n';
import type { AppStackParamList, MandatorySurveyStackParamList } from '../navigation/types';
import {
  useStartSurvey,
  useSubmitSurvey,
  useSurveyDefinition,
  useSurveyStatus,
} from '../hooks';
import { QuickSettingsDropdown } from '../components/ui';

type SurveyPhase = 'intro' | 'questions';

type SurveyNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<MandatorySurveyStackParamList>,
  NativeStackNavigationProp<AppStackParamList>
>;

function getProgress(currentIndex: number, total: number): number {
  if (total <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, (currentIndex + 1) / total));
}

function pickLocalizedText(source: Record<string, unknown> | undefined, baseKey: string, language: 'en' | 'vi'): string {
  const fallback = typeof source?.[baseKey] === 'string' ? String(source[baseKey]) : '';
  if (language !== 'vi') {
    return fallback;
  }

  const candidateKeys = [`${baseKey}Vi`, `${baseKey}_vi`, `${baseKey}VN`, `${baseKey}_vn`];
  for (const key of candidateKeys) {
    const value = source?.[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  const translatedObject = source?.translations;
  if (translatedObject && typeof translatedObject === 'object') {
    const viNode = (translatedObject as Record<string, unknown>).vi;
    if (viNode && typeof viNode === 'object') {
      const localizedValue = (viNode as Record<string, unknown>)[baseKey];
      if (typeof localizedValue === 'string' && localizedValue.trim()) {
        return localizedValue;
      }
    }
  }

  return fallback;
}

export function BehaviorSurveyScreen() {
  const navigation = useNavigation<SurveyNavigation>();
  const { colors } = useThemeStore();
  const { t, language } = useI18n();
  const themedStyles = useMemo(() => getThemedStyles(colors), [colors]);

  const [phase, setPhase] = useState<SurveyPhase>('intro');
  const [responseId, setResponseId] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const {
    data: surveyDefinition,
    isLoading: isSurveyLoading,
    isError: isSurveyError,
    refetch: refetchSurvey,
  } = useSurveyDefinition();

  const {
    data: surveyStatus,
    isLoading: isStatusLoading,
    isError: isStatusError,
    refetch: refetchStatus,
  } = useSurveyStatus();

  const startSurveyMutation = useStartSurvey();
  const submitSurveyMutation = useSubmitSurvey();

  // Guard against multiple navigateToHome() calls
  const hasNavigatedHomeRef = useRef(false);

  const questions = useMemo(() => {
    const sections = Array.isArray(surveyDefinition?.sections) ? surveyDefinition.sections : [];

    const allQuestions = [...sections]
      .sort((left, right) => left.order - right.order)
      .flatMap((section) => {
        const sectionQuestions = Array.isArray(section.questions) ? section.questions : [];
        return [...sectionQuestions]
          .sort((left, right) => left.order - right.order)
          .map((question) => ({
            sectionCode: section.code,
            sectionTitle: pickLocalizedText(section as unknown as Record<string, unknown>, 'title', language),
            ...question,
            questionText: pickLocalizedText(question as unknown as Record<string, unknown>, 'questionText', language),
            options: Array.isArray(question.options)
              ? [...question.options]
                  .sort((left, right) => left.order - right.order)
                  .map((option) => ({
                    ...option,
                    text: pickLocalizedText(option as unknown as Record<string, unknown>, 'text', language),
                  }))
              : [],
          }));
      });

    return allQuestions;
  }, [language, surveyDefinition?.sections]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = getProgress(currentQuestionIndex, questions.length);

  const navigateToHome = useCallback(() => {
    const candidates = [
      navigation,
      navigation.getParent?.(),
      navigation.getParent?.()?.getParent?.(),
    ].filter(Boolean) as Array<{ getState: () => { routeNames?: string[] }; dispatch: (action: unknown) => void }>;

    for (const nav of candidates) {
      const routeNames = nav.getState()?.routeNames ?? [];
      if (routeNames.includes('MainTabs')) {
        nav.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [{ name: 'MainTabs' as never }],
          })
        );
        return;
      }
    }
  }, [navigation]);

  useEffect(() => {
    if (!surveyStatus || hasNavigatedHomeRef.current) {
      return;
    }

    if (surveyStatus.hasCompletedSurvey) {
      hasNavigatedHomeRef.current = true;
      navigateToHome();
    }
  }, [navigateToHome, surveyStatus]);

  const startSurvey = useCallback(async () => {
    if (questions.length === 0) {
      Alert.alert(t('common.error'), t('survey.emptyQuestions'));
      return;
    }

    try {
      const response = await startSurveyMutation.mutateAsync({ consentGiven: true });
      const resumeAnswers = response.data.existingAnswers ?? {};
      const nextQuestionIndex = questions.findIndex((question) => !resumeAnswers[question.questionCode]);

      setResponseId(response.data.responseId);
      setAnswers(resumeAnswers);

      if (nextQuestionIndex >= 0) {
        setCurrentQuestionIndex(nextQuestionIndex);
        setPhase('questions');
        return;
      }

      try {
        const completionResponse = await submitSurveyMutation.mutateAsync({
          responseId: response.data.responseId,
          payload: {
            answers: resumeAnswers,
            isPartialSubmission: false,
          },
        });

        if (completionResponse.data.isComplete) {
          navigateToHome();
        } else {
          setCurrentQuestionIndex(0);
          setPhase('questions');
        }
      } catch {
        Alert.alert(t('common.error'), t('survey.finalSubmitError'));
      }
    } catch {
      Alert.alert(t('common.error'), t('survey.startError'));
    }
  }, [questions, startSurveyMutation, submitSurveyMutation, t]);

  const savePartial = useCallback(async () => {
    if (!responseId) {
      return;
    }

    await submitSurveyMutation.mutateAsync({
      responseId,
      payload: {
        answers,
        isPartialSubmission: true,
      },
    });
  }, [answers, responseId, submitSurveyMutation]);

  const submitFinal = useCallback(async () => {
    if (!responseId) {
      return;
    }

    const response = await submitSurveyMutation.mutateAsync({
      responseId,
      payload: {
        answers,
        isPartialSubmission: false,
      },
    });

    if (response.data.isComplete) {
      navigateToHome();
    } else {
      Alert.alert(t('common.error'), response.data.message || t('survey.answerRequired'));
    }
  }, [answers, navigateToHome, responseId, submitSurveyMutation, t]);

  const handleAnswer = useCallback((questionCode: string, optionCode: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionCode]: optionCode,
    }));
  }, []);

  const handleNext = useCallback(async () => {
    if (!currentQuestion) {
      return;
    }

    const selectedAnswer = answers[currentQuestion.questionCode];
    if (currentQuestion.isRequired && !selectedAnswer) {
      Alert.alert(t('common.error'), t('survey.answerRequired'));
      return;
    }

    try {
      if (currentQuestionIndex >= questions.length - 1) {
        try {
          await submitFinal();
        } catch {
          Alert.alert(t('common.error'), t('survey.finalSubmitError'));
        }
        return;
      }

      await savePartial();
      setCurrentQuestionIndex((prev) => prev + 1);
    } catch {
      Alert.alert(t('common.error'), t('survey.saveProgressError'));
    }
  }, [
    answers,
    currentQuestion,
    currentQuestionIndex,
    questions.length,
    savePartial,
    submitFinal,
    t,
  ]);

  const handleBack = useCallback(() => {
    if (currentQuestionIndex <= 0) {
      setPhase('intro');
      return;
    }

    setCurrentQuestionIndex((prev) => prev - 1);
  }, [currentQuestionIndex]);

  if (isSurveyLoading || isStatusLoading) {
    return (
      <SafeAreaView style={[styles.centerContainer, themedStyles.container]}>
        <QuickSettingsDropdown />
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, themedStyles.mutedText]}>{t('survey.loading')}</Text>
      </SafeAreaView>
    );
  }

  if (isSurveyError || isStatusError || !surveyDefinition) {
    return (
      <SafeAreaView style={[styles.centerContainer, themedStyles.container]}>
        <QuickSettingsDropdown />
        <Text style={[styles.errorText, themedStyles.errorText]}>{t('common.loadingError')}</Text>
        <Pressable
          onPress={() => {
            void refetchSurvey();
            void refetchStatus();
          }}
          style={[styles.primaryButton, themedStyles.primaryButton]}
        >
          <Text style={[styles.primaryButtonText, themedStyles.primaryButtonText]}>{t('common.retry')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (surveyStatus?.hasCompletedSurvey) {
    return (
      <SafeAreaView style={[styles.centerContainer, themedStyles.container]}>
        <QuickSettingsDropdown />
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.loadingText, themedStyles.mutedText]}>
          {t('survey.redirectingHome')}
        </Text>
      </SafeAreaView>
    );
  }

  if (phase === 'intro') {
    const hasInProgressSurvey = surveyStatus?.hasSurvey && !surveyStatus?.hasCompletedSurvey;
    const localizedSurveyTitle = pickLocalizedText(
      surveyDefinition as unknown as Record<string, unknown>,
      'title',
      language
    );
    const localizedSurveyDescription = pickLocalizedText(
      surveyDefinition as unknown as Record<string, unknown>,
      'description',
      language
    );

    return (
      <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
        <QuickSettingsDropdown />
        <ScrollView contentContainerStyle={styles.introContent}>
          <Text style={[styles.title, themedStyles.title]}>{t('survey.introTitle')}</Text>
          <Text style={[styles.subtitle, themedStyles.mutedText]}>{localizedSurveyTitle}</Text>
          <Text style={[styles.description, themedStyles.mutedText]}>{localizedSurveyDescription}</Text>

          <View style={[styles.infoCard, themedStyles.infoCard]}>
            <Text style={[styles.infoTitle, themedStyles.title]}>{t('survey.estimatedTime')}</Text>
            <Text style={[styles.infoValue, themedStyles.mutedText]}>
              {surveyDefinition.estimatedMinutes} {t('survey.minutes')}
            </Text>
          </View>

          <Text style={[styles.consentText, themedStyles.mutedText]}>{t('survey.consentText')}</Text>

          <Pressable
            style={[styles.primaryButton, themedStyles.primaryButton]}
            onPress={() => {
              void startSurvey();
            }}
            disabled={startSurveyMutation.isPending}
          >
            <Text style={[styles.primaryButtonText, themedStyles.primaryButtonText]}>
              {startSurveyMutation.isPending
                ? t('common.loading')
                : hasInProgressSurvey
                  ? t('survey.resume')
                  : t('survey.start')}
            </Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const selectedAnswerCode = currentQuestion ? answers[currentQuestion.questionCode] : null;

  if (!currentQuestion) {
    return (
      <SafeAreaView style={[styles.centerContainer, themedStyles.container]}>
        <QuickSettingsDropdown />
        <Text style={[styles.errorText, themedStyles.errorText]}>{t('survey.emptyQuestions')}</Text>
        <Pressable
          style={[styles.primaryButton, themedStyles.primaryButton]}
          onPress={() => {
            setPhase('intro');
            setCurrentQuestionIndex(0);
          }}
        >
          <Text style={[styles.primaryButtonText, themedStyles.primaryButtonText]}>{t('common.retry')}</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, themedStyles.container]} edges={['top']}>
      <QuickSettingsDropdown />
      <View style={styles.headerWrap}>
        <Text style={[styles.progressText, themedStyles.mutedText]}>
          {t('survey.progress')} {currentQuestionIndex + 1}/{questions.length}
        </Text>
        <View style={[styles.progressBarTrack, themedStyles.progressBarTrack]}>
          <View style={[styles.progressBarFill, { width: `${Math.max(progress * 100, 4)}%`, backgroundColor: colors.primary }]} />
        </View>
      </View>

      <ScrollView style={styles.questionContainer} contentContainerStyle={styles.questionContent}>
        <Text style={[styles.sectionText, themedStyles.mutedText]}>{currentQuestion?.sectionTitle}</Text>
        <Text style={[styles.questionText, themedStyles.title]}>{currentQuestion?.questionText}</Text>

        <View style={styles.optionsWrap}>
          {currentQuestion?.options.map((option) => {
            const isSelected = selectedAnswerCode === option.code;

            return (
              <Pressable
                key={option.code}
                style={[
                  styles.optionButton,
                  themedStyles.optionButton,
                  isSelected && [styles.optionButtonSelected, themedStyles.optionButtonSelected],
                ]}
                onPress={() => handleAnswer(currentQuestion.questionCode, option.code)}
              >
                <Text
                  style={[
                    styles.optionText,
                    themedStyles.optionText,
                    isSelected && themedStyles.optionTextSelected,
                  ]}
                >
                  {option.text}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footerActions}>
        <Pressable style={[styles.secondaryButton, themedStyles.secondaryButton]} onPress={handleBack}>
          <Text style={[styles.secondaryButtonText, themedStyles.secondaryButtonText]}>{t('survey.back')}</Text>
        </Pressable>

        <Pressable
          style={[styles.primaryButton, themedStyles.primaryButton, styles.nextButton]}
          onPress={() => {
            void handleNext();
          }}
          disabled={submitSurveyMutation.isPending}
        >
          <Text style={[styles.primaryButtonText, themedStyles.primaryButtonText]}>
            {submitSurveyMutation.isPending
              ? t('common.loading')
              : currentQuestionIndex >= questions.length - 1
                ? t('survey.submit')
                : t('survey.next')}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const getThemedStyles = (colors: ReturnType<typeof useThemeStore>['colors']) =>
  StyleSheet.create({
    container: {
      backgroundColor: colors.background,
    },
    title: {
      color: colors.text,
    },
    mutedText: {
      color: colors.textSecondary,
    },
    primaryButton: {
      backgroundColor: colors.primary,
    },
    primaryButtonText: {
      color: colors.textOnPrimary ?? colors.text,
    },
    secondaryButton: {
      backgroundColor: colors.backgroundSecondary,
      borderColor: colors.border,
    },
    secondaryButtonText: {
      color: colors.text,
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    progressBarTrack: {
      backgroundColor: colors.border,
    },
    optionButton: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
    },
    optionButtonSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.backgroundSecondary,
    },
    optionText: {
      color: colors.text,
    },
    optionTextSelected: {
      color: colors.primary,
    },
    errorText: {
      color: colors.error,
    },
  });

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },
  introContent: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.typography.fontSizes.xxl,
    fontWeight: tokens.typography.fontWeights.bold,
  },
  subtitle: {
    fontSize: tokens.typography.fontSizes.md,
  },
  description: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 22,
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  infoTitle: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  infoValue: {
    fontSize: tokens.typography.fontSizes.md,
  },
  consentText: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  primaryButton: {
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: tokens.spacing.lg,
  },
  primaryButtonText: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  loadingText: {
    fontSize: tokens.typography.fontSizes.sm,
  },
  errorText: {
    fontSize: tokens.typography.fontSizes.sm,
    textAlign: 'center',
  },
  headerWrap: {
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  progressText: {
    fontSize: tokens.typography.fontSizes.sm,
    fontWeight: tokens.typography.fontWeights.medium,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: tokens.borderRadius.full,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: tokens.borderRadius.full,
  },
  questionContainer: {
    flex: 1,
  },
  questionContent: {
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  sectionText: {
    fontSize: tokens.typography.fontSizes.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionText: {
    fontSize: tokens.typography.fontSizes.lg,
    lineHeight: 28,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  optionsWrap: {
    gap: tokens.spacing.sm,
  },
  optionButton: {
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.md,
  },
  optionButtonSelected: {
    borderWidth: 1.5,
  },
  optionText: {
    fontSize: tokens.typography.fontSizes.sm,
    lineHeight: 20,
  },
  footerActions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: tokens.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.md,
  },
  secondaryButtonText: {
    fontSize: tokens.typography.fontSizes.md,
    fontWeight: tokens.typography.fontWeights.semibold,
  },
  nextButton: {
    flex: 1.4,
  },
});
