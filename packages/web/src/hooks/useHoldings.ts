import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../utils/api-client';

export function useHoldings(portfolioId: string) {
  return useQuery({
    queryKey: ['holdings', portfolioId],
    queryFn: () => apiClient.holdings.list(portfolioId),
    enabled: !!portfolioId,
  });
}

export function useHolding(portfolioId: string, assetId: string) {
  return useQuery({
    queryKey: ['holding', portfolioId, assetId],
    queryFn: () => apiClient.holdings.get(portfolioId, assetId),
    enabled: !!portfolioId && !!assetId,
  });
}
