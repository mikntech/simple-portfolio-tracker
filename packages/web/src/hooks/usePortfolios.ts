import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../utils/api-client';
import type { PortfolioSummary } from '@portfolio-tracker/shared-types';

// Simple Portfolio type since it's not exported from shared-types anymore
interface Portfolio {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export function usePortfolios(userId?: string) {
  return useQuery({
    queryKey: ['portfolios', userId],
    queryFn: () => apiClient.portfolios.list({ userId }),
  });
}

export function usePortfolioSummary(id: string) {
  return useQuery({
    queryKey: ['portfolio-summary', id],
    queryFn: () => apiClient.portfolios.getSummary(id),
    enabled: !!id,
  });
}

// Note: Create and update operations are removed as portfolios are now
// automatically created with users in the simplified backend

export function useDeletePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.portfolios.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}
