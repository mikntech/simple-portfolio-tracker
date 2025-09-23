import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../utils/api-client';
import type { CreateAllocation, UpdateAllocation } from '@portfolio-tracker/shared-types';

export function useAllocations(userId: string) {
  return useQuery({
    queryKey: ['allocations', userId],
    queryFn: () => apiClient.allocations.list(userId),
    enabled: !!userId,
  });
}

export function useAllocationSummary(userId: string) {
  return useQuery({
    queryKey: ['allocation-summary', userId],
    queryFn: () => apiClient.allocations.getSummary(userId),
    enabled: !!userId,
  });
}

export function useCreateAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAllocation) => apiClient.allocations.create(data),
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['allocations', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['allocation-summary', variables.userId] });
    },
  });
}

export function useUpdateAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAllocation }) =>
      apiClient.allocations.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['allocations', result.userId] });
      queryClient.invalidateQueries({ queryKey: ['allocation-summary', result.userId] });
    },
  });
}

export function useDeleteAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, userId }: { id: string; userId: string }) =>
      apiClient.allocations.delete(id).then(() => ({ id, userId })),
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['allocations', userId] });
      queryClient.invalidateQueries({ queryKey: ['allocation-summary', userId] });
    },
  });
}
