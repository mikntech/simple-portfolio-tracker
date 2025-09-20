import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../utils/api-client';
import type { CreateAllocation, UpdateAllocation } from '@portfolio-tracker/shared-types';

export function useAllocations(portfolioId: string) {
  return useQuery({
    queryKey: ['allocations', portfolioId],
    queryFn: () => apiClient.allocations.list(portfolioId),
    enabled: !!portfolioId,
  });
}

export function useAllocationSummary(portfolioId: string) {
  return useQuery({
    queryKey: ['allocation-summary', portfolioId],
    queryFn: () => apiClient.allocations.getSummary(portfolioId),
    enabled: !!portfolioId,
  });
}

export function useCreateAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAllocation) => apiClient.allocations.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allocations', variables.assetId] });
      queryClient.invalidateQueries({ queryKey: ['allocation-summary', variables.assetId] });
    },
  });
}

export function useUpdateAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAllocation }) =>
      apiClient.allocations.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['allocations', result.id] });
      queryClient.invalidateQueries({ queryKey: ['allocation-summary', result.id] });
    },
  });
}

export function useDeleteAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string }) => apiClient.allocations.delete(id).then(() => ({ id })),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['allocations', id] });
      queryClient.invalidateQueries({ queryKey: ['allocation-summary', id] });
    },
  });
}
