import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../utils/api-client';

// Since portfolios are removed, we'll use a mock that returns a single portfolio per user
// This maintains compatibility with existing components
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
    queryFn: async () => {
      // Return a mock portfolio for the user
      if (!userId) return [];
      return [
        {
          id: userId, // Use userId as portfolioId for simplicity
          userId,
          name: 'My Portfolio',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
    },
    enabled: !!userId,
  });
}

export function usePortfolioSummary(userId: string) {
  // Portfolio summary is now based on user's holdings
  return useQuery({
    queryKey: ['portfolio-summary', userId],
    queryFn: async () => {
      const holdings = await apiClient.holdings.list(userId);

      // Calculate summary from holdings
      const totalValue = holdings.reduce((sum, h) => sum + (h.currentValue || 0), 0);
      const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0);
      const totalGainLoss = totalValue - totalCost;
      const totalGainLossPercent = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

      return {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercent,
        holdings,
        lastUpdated: new Date(),
      };
    },
    enabled: !!userId,
  });
}

// Delete operation removed - portfolios are implicit per user
