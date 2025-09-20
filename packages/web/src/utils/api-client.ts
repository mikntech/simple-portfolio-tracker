import { ApiContracts } from '@portfolio-tracker/api-contracts';
import type {
  User,
  Portfolio,
  Transaction,
  Asset,
  Holding,
  ApiResponse,
  PaginatedResponse,
  Allocation,
  CreateAllocation,
  UpdateAllocation,
  PortfolioAllocationSummary,
} from '@portfolio-tracker/shared-types';

const API_BASE_URL = import.meta.env['VITE_API_URL'] || 'http://localhost:3000';

// Auth token provider type
type AuthTokenProvider = () => Promise<string | null>;

class ApiClient {
  private baseUrl: string;
  private authTokenProvider: AuthTokenProvider | null = null;

  constructor(baseUrl: string) {
    // Remove trailing slash to avoid double slashes
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  setAuthTokenProvider(provider: AuthTokenProvider) {
    this.authTokenProvider = provider;
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: any;
      query?: Record<string, any>;
    }
  ): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseUrl}/v1${path}`);

    // Add query parameters
    if (options?.query) {
      Object.entries(options.query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Get auth token if provider is set
    const authToken = this.authTokenProvider ? await this.authTokenProvider() : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'API request failed');
    }

    return data;
  }

  // User endpoints
  users = {
    create: async (data: { email: string; name: string }): Promise<User> => {
      const response = await this.request<User>('POST', '/users', { body: data });
      return response.data!;
    },

    get: async (id: string): Promise<User> => {
      const response = await this.request<User>('GET', `/users/${id}`);
      return response.data!;
    },

    update: async (id: string, data: Partial<{ email: string; name: string }>): Promise<User> => {
      const response = await this.request<User>('PUT', `/users/${id}`, { body: data });
      return response.data!;
    },

    delete: async (id: string): Promise<void> => {
      await this.request('DELETE', `/users/${id}`);
    },
  };

  // Portfolio endpoints
  portfolios = {
    create: async (data: {
      name: string;
      description?: string;
      currency?: string;
    }): Promise<Portfolio> => {
      const response = await this.request<Portfolio>('POST', '/portfolios', { body: data });
      return response.data!;
    },

    get: async (id: string): Promise<Portfolio> => {
      const response = await this.request<Portfolio>('GET', `/portfolios/${id}`);
      return response.data!;
    },

    list: async (params?: {
      userId?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Portfolio>> => {
      const response = await this.request<PaginatedResponse<Portfolio>>('GET', '/portfolios', {
        query: params,
      });
      return response.data!;
    },

    update: async (
      id: string,
      data: Partial<{ name: string; description?: string; currency?: string }>
    ): Promise<Portfolio> => {
      const response = await this.request<Portfolio>('PUT', `/portfolios/${id}`, { body: data });
      return response.data!;
    },

    delete: async (id: string): Promise<void> => {
      await this.request('DELETE', `/portfolios/${id}`);
    },

    getSummary: async (id: string): Promise<any> => {
      const response = await this.request('GET', `/portfolios/${id}/summary`);
      return response.data!;
    },
  };

  // Transaction endpoints
  transactions = {
    create: async (data: {
      portfolioId: string;
      assetId: string;
      type: 'buy' | 'sell' | 'dividend' | 'fee';
      quantity: number;
      price: number;
      fee?: number;
      currency?: string;
      executedAt: Date;
      notes?: string;
    }): Promise<Transaction> => {
      const response = await this.request<Transaction>('POST', '/transactions', {
        body: {
          ...data,
          executedAt: data.executedAt.toISOString(),
        },
      });
      return response.data!;
    },

    get: async (id: string): Promise<Transaction> => {
      const response = await this.request<Transaction>('GET', `/transactions/${id}`);
      return response.data!;
    },

    list: async (params: {
      portfolioId: string;
      assetId?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<Transaction>> => {
      const response = await this.request<PaginatedResponse<Transaction>>('GET', '/transactions', {
        query: params,
      });
      return response.data!;
    },

    update: async (
      id: string,
      data: Partial<{
        type: 'buy' | 'sell' | 'dividend' | 'fee';
        quantity: number;
        price: number;
        fee?: number;
        currency?: string;
        executedAt: Date;
        notes?: string;
      }>
    ): Promise<Transaction> => {
      const response = await this.request<Transaction>('PUT', `/transactions/${id}`, {
        body: data.executedAt
          ? {
              ...data,
              executedAt: data.executedAt.toISOString(),
            }
          : data,
      });
      return response.data!;
    },

    delete: async (id: string): Promise<void> => {
      await this.request('DELETE', `/transactions/${id}`);
    },
  };

  // Asset endpoints
  assets = {
    search: async (params: {
      q: string;
      type?: string;
      exchange?: string;
      limit?: number;
    }): Promise<Asset[]> => {
      const response = await this.request<Asset[]>('GET', '/assets/search', { query: params });
      return response.data!;
    },

    get: async (id: string): Promise<Asset> => {
      const response = await this.request<Asset>('GET', `/assets/${id}`);
      return response.data!;
    },

    getBySymbol: async (symbol: string): Promise<Asset> => {
      const response = await this.request<Asset>('GET', `/assets/symbol/${symbol}`);
      return response.data!;
    },
  };

  // Holdings endpoints
  holdings = {
    list: async (portfolioId: string): Promise<Holding[]> => {
      const response = await this.request<Holding[]>('GET', `/portfolios/${portfolioId}/holdings`);
      return response.data!;
    },

    get: async (portfolioId: string, assetId: string): Promise<Holding> => {
      const response = await this.request<Holding>(
        'GET',
        `/portfolios/${portfolioId}/holdings/${assetId}`
      );
      return response.data!;
    },
  };

  // Allocation endpoints
  allocations = {
    create: async (data: CreateAllocation): Promise<Allocation> => {
      const response = await this.request<Allocation>('POST', '/allocations', { body: data });
      return response.data!;
    },

    list: async (portfolioId: string): Promise<Allocation[]> => {
      const response = await this.request<Allocation[]>(
        'GET',
        `/portfolios/${portfolioId}/allocations`
      );
      return response.data!;
    },

    update: async (id: string, data: UpdateAllocation): Promise<Allocation> => {
      const response = await this.request<Allocation>('PUT', `/allocations/${id}`, { body: data });
      return response.data!;
    },

    delete: async (id: string): Promise<void> => {
      await this.request('DELETE', `/allocations/${id}`);
    },

    getSummary: async (portfolioId: string): Promise<PortfolioAllocationSummary> => {
      const response = await this.request<PortfolioAllocationSummary>(
        'GET',
        `/portfolios/${portfolioId}/allocation-summary`
      );
      return response.data!;
    },
  };
}

export const apiClient = new ApiClient(API_BASE_URL);
