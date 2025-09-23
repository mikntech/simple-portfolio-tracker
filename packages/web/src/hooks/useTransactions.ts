import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../utils/api-client';
import type { CreateTransaction } from '@portfolio-tracker/shared-types';

export function useTransactions(params: {
  userId: string;
  assetId?: string;
  type?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  return useQuery({
    queryKey: ['transactions', params],
    queryFn: () => apiClient.transactions.list(params),
    enabled: !!params.userId,
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: ['transaction', id],
    queryFn: () => apiClient.transactions.get(id),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateTransaction & { userId: string }) =>
      apiClient.transactions.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary', variables.userId] });
      queryClient.invalidateQueries({ queryKey: ['holdings', variables.userId] });
    },
  });
}

export function useCreateTransactionsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactions: (CreateTransaction & { userId: string })[]) => {
      const results = await Promise.all(
        transactions.map((transaction) => apiClient.transactions.create(transaction))
      );
      return results;
    },
    onSuccess: (_, transactions) => {
      const userIds = [...new Set(transactions.map((t) => t.userId))];
      userIds.forEach((userId) => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['portfolio-summary', userId] });
        queryClient.invalidateQueries({ queryKey: ['holdings', userId] });
      });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTransaction> }) =>
      apiClient.transactions.update(id, data),
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['transaction', result.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (result.userId) {
        queryClient.invalidateQueries({ queryKey: ['portfolio-summary', result.userId] });
        queryClient.invalidateQueries({ queryKey: ['holdings', result.userId] });
      }
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: { id: string; userId?: string }) => {
      await apiClient.transactions.delete(transaction.id);
      return transaction;
    },
    onSuccess: (_, transaction) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      if (transaction.userId) {
        queryClient.invalidateQueries({ queryKey: ['portfolio-summary', transaction.userId] });
        queryClient.invalidateQueries({ queryKey: ['holdings', transaction.userId] });
      }
    },
  });
}
