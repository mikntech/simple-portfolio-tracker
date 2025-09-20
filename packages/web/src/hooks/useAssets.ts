import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../utils/api-client';

export function useAssetSearch(query: string, type?: string, exchange?: string) {
  return useQuery({
    queryKey: ['assets', 'search', query, type, exchange],
    queryFn: () => apiClient.assets.search({ q: query, type, exchange }),
    enabled: query.length > 0,
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['asset', id],
    queryFn: () => apiClient.assets.get(id),
    enabled: !!id,
  });
}

export function useAssetBySymbol(symbol: string) {
  return useQuery({
    queryKey: ['asset', 'symbol', symbol],
    queryFn: () => apiClient.assets.getBySymbol(symbol),
    enabled: !!symbol,
  });
}
