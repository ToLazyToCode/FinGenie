import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  surveyApi,
  type StartSurveyRequest,
  type SubmitSurveyRequest,
} from '../api/modules';

export const surveyKeys = {
  all: ['survey'] as const,
  definition: () => [...surveyKeys.all, 'definition'] as const,
  status: () => [...surveyKeys.all, 'status'] as const,
  profile: () => [...surveyKeys.all, 'profile'] as const,
  insights: () => [...surveyKeys.all, 'insights'] as const,
  completion: () => [...surveyKeys.all, 'completion'] as const,
};

export function useSurveyDefinition(enabled = true) {
  return useQuery({
    queryKey: surveyKeys.definition(),
    enabled,
    queryFn: async () => {
      const response = await surveyApi.getDefinition();
      return response.data;
    },
  });
}

export function useSurveyStatus(enabled = true) {
  return useQuery({
    queryKey: surveyKeys.status(),
    enabled,
    queryFn: async () => {
      const response = await surveyApi.getStatus();
      return response.data;
    },
  });
}

export function useBehaviorProfile(enabled = true) {
  return useQuery({
    queryKey: surveyKeys.profile(),
    enabled,
    queryFn: async () => {
      const response = await surveyApi.getBehaviorProfile();
      return response.data;
    },
  });
}

export function useBehaviorInsights(enabled = true) {
  return useQuery({
    queryKey: surveyKeys.insights(),
    enabled,
    queryFn: async () => {
      const response = await surveyApi.getBehaviorInsights();
      return response.data;
    },
  });
}

export function useBehaviorCompletionCheck(enabled = true) {
  return useQuery({
    queryKey: surveyKeys.completion(),
    enabled,
    queryFn: async () => {
      const response = await surveyApi.checkBehaviorCompletion();
      return response.data;
    },
  });
}

export function useStartSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: StartSurveyRequest) => surveyApi.start(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: surveyKeys.status() });
      queryClient.invalidateQueries({ queryKey: surveyKeys.completion() });
    },
  });
}

export function useSubmitSurvey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ responseId, payload }: { responseId: number; payload: SubmitSurveyRequest }) =>
      surveyApi.submit(responseId, payload),
    onSuccess: (response) => {
      const isComplete = Boolean(response.data?.isComplete);
      queryClient.invalidateQueries({ queryKey: surveyKeys.status() });
      queryClient.invalidateQueries({ queryKey: surveyKeys.completion() });

      if (isComplete) {
        queryClient.invalidateQueries({ queryKey: surveyKeys.profile() });
        queryClient.invalidateQueries({ queryKey: surveyKeys.insights() });
      }
    },
  });
}
