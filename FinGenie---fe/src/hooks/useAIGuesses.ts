import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  aiApi,
  gamificationApi,
  SpendingGuess,
  EditGuessRequest,
  RejectGuessRequest,
} from '../api/modules';
import { aiRuntimeStore } from '../store/aiRuntimeStore';
import { petStore } from '../store/petStore';
import { gamificationStore } from '../store/gamificationStore';

/**
 * AI Guesses Hook
 *
 * Uses backend DTO contracts directly:
 * - GET /ai/guess/today -> SpendingGuess[]
 * - POST /ai/guess/{id}/accept -> AcceptGuessResponse
 * - POST /ai/guess/{id}/edit -> AcceptGuessResponse
 * - POST /ai/guess/{id}/reject -> { message: string }
 */
export function useAIGuesses() {
  const queryClient = useQueryClient();

  // Store actions
  const recordLearningEvent = aiRuntimeStore((state) => state.recordLearningEvent);
  const setActivePrediction = aiRuntimeStore((state) => state.setActivePrediction);
  const updatePetMood = petStore((state) => state.updateMood);
  const addPetActivity = petStore((state) => state.addActivity);
  const queueXpAnimation = gamificationStore((state) => state.queueXpAnimation);
  const syncProfile = gamificationStore((state) => state.syncProfile);

  const syncGamificationProfile = useCallback(async () => {
    try {
      const response = await gamificationApi.getProfile();
      syncProfile(response.data);
      queryClient.setQueryData(['gamificationProfile'], response.data);
    } catch (error) {
      if (__DEV__) {
        console.warn('[useAIGuesses] Failed to sync gamification profile after AI guess action.', error);
      }
      queryClient.invalidateQueries({ queryKey: ['gamificationProfile'] });
    }
  }, [queryClient, syncProfile]);

  const {
    data: guesses,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['aiGuesses', 'today'],
    queryFn: async () => {
      const response = await aiApi.guesses.getTodayGuesses();
      return response.data;
    },
    refetchInterval: 60000,
  });

  const pendingGuesses = guesses?.filter((g) => g.status === 'PENDING') || [];
  const processedGuesses = guesses?.filter((g) => g.status !== 'PENDING') || [];

  const handleGuessSuccess = useCallback((
    guess: SpendingGuess,
    type: 'ACCEPT' | 'EDIT' | 'REJECT',
    message?: string
  ) => {
    const xpAwarded = type === 'ACCEPT' ? 5 : type === 'EDIT' ? 3 : 1;
    queueXpAnimation(xpAwarded, `AI prediction ${type.toLowerCase()}ed`);
    void syncGamificationProfile();

    recordLearningEvent(
      type === 'ACCEPT' ? 'PREDICTION_ACCEPTED' :
      type === 'EDIT' ? 'USER_CORRECTION' : 'PREDICTION_REJECTED',
      {
        guessId: guess.id,
        originalAmount: guess.amount,
        category: guess.category,
        status: guess.status,
        backendMessage: message,
      }
    );

    if (type === 'ACCEPT') {
      updatePetMood('HAPPY');
      addPetActivity({
        type: 'insight',
        timestamp: new Date().toISOString(),
        details: message || 'Great job! Transaction created from AI prediction.',
      });
    } else if (type === 'REJECT') {
      updatePetMood('CONTENT');
      addPetActivity({
        type: 'state_change',
        timestamp: new Date().toISOString(),
        details: message || 'Learning from your feedback to improve predictions.',
      });
    }

    queryClient.invalidateQueries({ queryKey: ['aiGuesses'] });
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['wallets'] });
    queryClient.invalidateQueries({ queryKey: ['petState'] });
  }, [queueXpAnimation, syncGamificationProfile, recordLearningEvent, updatePetMood, addPetActivity, queryClient]);

  const acceptMutation = useMutation({
    mutationFn: ({ guess }: { guess: SpendingGuess }) => aiApi.guesses.accept(guess.id),
    onSuccess: (response, variables) => {
      handleGuessSuccess(variables.guess, 'ACCEPT', response.data.message);
    },
  });

  const editMutation = useMutation({
    mutationFn: ({ guess, data }: { guess: SpendingGuess; data: EditGuessRequest }) =>
      aiApi.guesses.edit(guess.id, data),
    onSuccess: (response, variables) => {
      handleGuessSuccess(variables.guess, 'EDIT', response.data.message);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ guess, data }: { guess: SpendingGuess; data?: RejectGuessRequest }) =>
      aiApi.guesses.reject(guess.id, data),
    onSuccess: (response, variables) => {
      handleGuessSuccess(variables.guess, 'REJECT', response.data.message);
    },
  });

  const acceptGuess = useCallback((guess: SpendingGuess) => {
    return acceptMutation.mutateAsync({ guess });
  }, [acceptMutation]);

  const editGuess = useCallback((guess: SpendingGuess, data: EditGuessRequest) => {
    return editMutation.mutateAsync({ guess, data });
  }, [editMutation]);

  const rejectGuess = useCallback((guess: SpendingGuess, reason?: string) => {
    return rejectMutation.mutateAsync({ guess, data: reason ? { reason } : undefined });
  }, [rejectMutation]);

  const selectGuess = useCallback((guess: SpendingGuess | null) => {
    setActivePrediction(guess ? {
      userId: 0,
      predictedAmount: guess.amount,
      confidence: guess.confidence,
      category: guess.category || undefined,
      description: guess.reasoning || 'AI-generated spending guess',
      basedOn: `AI prediction from ${guess.guessedForTime}`,
    } : null);
  }, [setActivePrediction]);

  return {
    guesses: guesses || [],
    pendingGuesses,
    processedGuesses,
    isLoading,
    error: error?.message || null,
    isProcessing: acceptMutation.isPending || editMutation.isPending || rejectMutation.isPending,
    refetch,
    acceptGuess,
    editGuess,
    rejectGuess,
    selectGuess,
  };
}
