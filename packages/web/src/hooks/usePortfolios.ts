import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../utils/api-client';
import type { Portfolio, CreatePortfolio } from '@portfolio-tracker/shared-types';

export function usePortfolios(userId?: string) {
  return useQuery({
    queryKey: ['portfolios', userId],
    queryFn: () => apiClient.portfolios.list({ userId }),
  });
}

export function usePortfolio(id: string) {
  return useQuery({
    queryKey: ['portfolio', id],
    queryFn: () => apiClient.portfolios.get(id),
    enabled: !!id,
  });
}

export function usePortfolioSummary(id: string) {
  return useQuery({
    queryKey: ['portfolio-summary', id],
    queryFn: () => apiClient.portfolios.getSummary(id),
    enabled: !!id,
  });
}

export function useCreatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePortfolio) => apiClient.portfolios.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreatePortfolio> }) =>
      apiClient.portfolios.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio', id] });
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}

export function useDeletePortfolio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.portfolios.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolios'] });
    },
  });
}
