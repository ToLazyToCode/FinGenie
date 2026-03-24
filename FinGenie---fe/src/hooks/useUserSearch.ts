import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userProfileApi, friendsApi, UserSearchResult } from '../api/modules';

/**
 * User Search Hook
 * 
 * Provides user search functionality for friend discovery.
 * Includes friend request sending capability.
 */
export function useUserSearch() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    // Simple debounce - in production, use lodash.debounce or useDeferredValue
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Search query
  const { data: results, isLoading, error, refetch } = useQuery({
    queryKey: ['userSearch', debouncedQuery],
    queryFn: async () => {
      if (debouncedQuery.length < 2) return [];
      const response = await userProfileApi.search(debouncedQuery);
      return response.data;
    },
    enabled: debouncedQuery.length >= 2,
    staleTime: 30000, // Cache for 30s
  });

  // Send friend request mutation
  const sendRequestMutation = useMutation({
    mutationFn: (addresseeId: number) => friendsApi.friendships.create({ addresseeId }),
    onSuccess: () => {
      // Refresh search results to update friendship status
      queryClient.invalidateQueries({ queryKey: ['userSearch'] });
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friendRequests'] });
    },
  });

  const sendFriendRequest = useCallback((userId: number) => {
    return sendRequestMutation.mutateAsync(userId);
  }, [sendRequestMutation]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setDebouncedQuery('');
  }, []);

  return {
    searchQuery,
    setSearchQuery: handleSearch,
    results: results || [],
    isLoading,
    error: error?.message || null,
    refetch,
    sendFriendRequest,
    isSendingRequest: sendRequestMutation.isPending,
    sendRequestError: sendRequestMutation.error?.message || null,
    clearSearch,
  };
}
