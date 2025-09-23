import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../utils/api-client';

export function useHoldings(userId: string) {
  return useQuery({
    queryKey: ['holdings', userId],
    queryFn: () => apiClient.holdings.list(userId),
    enabled: !!userId,
  });
}

export function useHolding(userId: string, assetId: string) {
  return useQuery({
    queryKey: ['holding', userId, assetId],
    queryFn: () => apiClient.holdings.get(userId, assetId),
    enabled: !!userId && !!assetId,
  });
}
