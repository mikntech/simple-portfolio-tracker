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
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['allocation-summary'] });
    },
  });
}

export function useUpdateAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAllocation }) =>
      apiClient.allocations.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['allocations'] });
      queryClient.invalidateQueries({ queryKey: ['allocation-summary'] });
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
