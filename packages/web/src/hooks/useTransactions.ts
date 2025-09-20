import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../utils/api-client';
import type { CreateTransaction } from '@portfolio-tracker/shared-types';

export function useTransactions(params: {
  portfolioId: string;
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
    enabled: !!params.portfolioId,
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
    mutationFn: (data: CreateTransaction) => apiClient.transactions.create(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary', variables.portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['holdings', variables.portfolioId] });
    },
  });
}

export function useCreateTransactionsBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transactions: CreateTransaction[]) => {
      const results = await Promise.all(
        transactions.map((transaction) => apiClient.transactions.create(transaction))
      );
      return results;
    },
    onSuccess: (_, transactions) => {
      const portfolioIds = [...new Set(transactions.map((t) => t.portfolioId))];
      portfolioIds.forEach((portfolioId) => {
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['portfolio-summary', portfolioId] });
        queryClient.invalidateQueries({ queryKey: ['holdings', portfolioId] });
      });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateTransaction> }) =>
      apiClient.transactions.update(id, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['transaction', result.id] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary', result.portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['holdings', result.portfolioId] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (transaction: { id: string; portfolioId: string }) => {
      await apiClient.transactions.delete(transaction.id);
      return transaction;
    },
    onSuccess: (_, transaction) => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary', transaction.portfolioId] });
      queryClient.invalidateQueries({ queryKey: ['holdings', transaction.portfolioId] });
    },
  });
}
