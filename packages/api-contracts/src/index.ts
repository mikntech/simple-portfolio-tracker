import { z } from 'zod';
import {
  UserSchema,
  CreateUserSchema,
  AssetSchema,
  TransactionSchema,
  CreateTransactionSchema,
  HoldingSchema,
  PortfolioSummarySchema,
  PaginationSchema,
  ApiResponseSchema,
  PaginatedResponseSchema,
  AllocationSchema,
  CreateAllocationSchema,
  UpdateAllocationSchema,
  PortfolioAllocationSummarySchema,
} from '@portfolio-tracker/shared-types';

// User API contracts
export const UserApiContracts = {
  createUser: {
    method: 'POST' as const,
    path: '/users',
    request: CreateUserSchema,
    response: ApiResponseSchema(UserSchema),
  },
  getUser: {
    method: 'GET' as const,
    path: '/users/:id',
    params: z.object({ id: z.string().uuid() }),
    response: ApiResponseSchema(UserSchema),
  },
  updateUser: {
    method: 'PUT' as const,
    path: '/users/:id',
    params: z.object({ id: z.string().uuid() }),
    request: CreateUserSchema.partial(),
    response: ApiResponseSchema(UserSchema),
  },
  deleteUser: {
    method: 'DELETE' as const,
    path: '/users/:id',
    params: z.object({ id: z.string().uuid() }),
    response: ApiResponseSchema(z.object({ message: z.string() })),
  },
};

// Portfolio API contracts
export const PortfolioApiContracts = {
  listPortfolios: {
    method: 'GET' as const,
    path: '/portfolios',
    query: z.object({
      userId: z.string().uuid(),
    }),
    response: ApiResponseSchema(
      z.array(
        z.object({
          id: z.string().uuid(),
          userId: z.string().uuid(),
          name: z.string(),
          createdAt: z.string(),
          updatedAt: z.string(),
        })
      )
    ),
  },
  deletePortfolio: {
    method: 'DELETE' as const,
    path: '/portfolios/:id',
    params: z.object({ id: z.string().uuid() }),
    response: ApiResponseSchema(z.object({ message: z.string() })),
  },
  getPortfolioSummary: {
    method: 'GET' as const,
    path: '/portfolios/:id/summary',
    params: z.object({ id: z.string().uuid() }),
    response: ApiResponseSchema(PortfolioSummarySchema),
  },
};

// Asset API contracts
export const AssetApiContracts = {
  searchAssets: {
    method: 'GET' as const,
    path: '/assets/search',
    query: z.object({
      q: z.string().min(1),
      type: z.string().optional(),
      exchange: z.string().optional(),
      limit: z.number().int().positive().max(50).optional(),
    }),
    response: ApiResponseSchema(z.array(AssetSchema)),
  },
  getAsset: {
    method: 'GET' as const,
    path: '/assets/:id',
    params: z.object({ id: z.string().uuid() }),
    response: ApiResponseSchema(AssetSchema),
  },
  getAssetBySymbol: {
    method: 'GET' as const,
    path: '/assets/symbol/:symbol',
    params: z.object({ symbol: z.string() }),
    response: ApiResponseSchema(AssetSchema),
  },
};

// Transaction API contracts
export const TransactionApiContracts = {
  createTransaction: {
    method: 'POST' as const,
    path: '/transactions',
    request: CreateTransactionSchema,
    response: ApiResponseSchema(TransactionSchema),
  },
  getTransaction: {
    method: 'GET' as const,
    path: '/transactions/:id',
    params: z.object({ id: z.string().uuid() }),
    response: ApiResponseSchema(TransactionSchema),
  },
  listTransactions: {
    method: 'GET' as const,
    path: '/transactions',
    query: z.object({
      portfolioId: z.string().uuid(),
      assetId: z.string().uuid().optional(),
      type: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      page: z.number().int().positive().optional(),
      limit: z.number().int().positive().max(100).optional(),
    }),
    response: ApiResponseSchema(PaginatedResponseSchema(TransactionSchema)),
  },
  updateTransaction: {
    method: 'PUT' as const,
    path: '/transactions/:id',
    params: z.object({ id: z.string().uuid() }),
    request: CreateTransactionSchema.partial(),
    response: ApiResponseSchema(TransactionSchema),
  },
  deleteTransaction: {
    method: 'DELETE' as const,
    path: '/transactions/:id',
    params: z.object({ id: z.string().uuid() }),
    response: ApiResponseSchema(z.object({ message: z.string() })),
  },
};

// Holdings API contracts
export const HoldingsApiContracts = {
  getPortfolioHoldings: {
    method: 'GET' as const,
    path: '/portfolios/:portfolioId/holdings',
    params: z.object({ portfolioId: z.string().uuid() }),
    response: ApiResponseSchema(z.array(HoldingSchema)),
  },
  getAssetHolding: {
    method: 'GET' as const,
    path: '/portfolios/:portfolioId/holdings/:assetId',
    params: z.object({
      portfolioId: z.string().uuid(),
      assetId: z.string().uuid(),
    }),
    response: ApiResponseSchema(HoldingSchema),
  },
};

// Allocation API contracts
export const AllocationApiContracts = {
  createAllocation: {
    method: 'POST' as const,
    path: '/allocations',
    request: CreateAllocationSchema,
    response: ApiResponseSchema(AllocationSchema),
  },
  getAllocations: {
    method: 'GET' as const,
    path: '/portfolios/:portfolioId/allocations',
    params: z.object({ portfolioId: z.string().uuid() }),
    response: ApiResponseSchema(z.array(AllocationSchema)),
  },
  updateAllocation: {
    method: 'PUT' as const,
    path: '/allocations/:id',
    params: z.object({ id: z.string().uuid() }),
    request: UpdateAllocationSchema,
    response: ApiResponseSchema(AllocationSchema),
  },
  deleteAllocation: {
    method: 'DELETE' as const,
    path: '/allocations/:id',
    params: z.object({ id: z.string().uuid() }),
    response: ApiResponseSchema(z.object({ message: z.string() })),
  },
  getPortfolioAllocationSummary: {
    method: 'GET' as const,
    path: '/portfolios/:portfolioId/allocation-summary',
    params: z.object({ portfolioId: z.string().uuid() }),
    response: ApiResponseSchema(PortfolioAllocationSummarySchema),
  },
};

// Export all contracts
export const ApiContracts = {
  users: UserApiContracts,
  portfolios: PortfolioApiContracts,
  assets: AssetApiContracts,
  transactions: TransactionApiContracts,
  holdings: HoldingsApiContracts,
  allocations: AllocationApiContracts,
} as const;

// Type helpers for Lambda handlers
export type ApiContract = {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  params?: z.ZodType;
  query?: z.ZodType;
  request?: z.ZodType;
  response: z.ZodType;
};

export type InferRequest<T extends ApiContract> = T['request'] extends z.ZodType
  ? z.infer<T['request']>
  : never;

export type InferParams<T extends ApiContract> = T['params'] extends z.ZodType
  ? z.infer<T['params']>
  : never;

export type InferQuery<T extends ApiContract> = T['query'] extends z.ZodType
  ? z.infer<T['query']>
  : never;

export type InferResponse<T extends ApiContract> = T['response'] extends z.ZodType
  ? z.infer<T['response']>
  : never;
