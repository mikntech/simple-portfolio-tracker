import { z } from 'zod';

// User models
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().min(1),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type User = z.infer<typeof UserSchema>;

export const CreateUserSchema = UserSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateUser = z.infer<typeof CreateUserSchema>;

// Portfolio models
export const PortfolioSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1),
  description: z.string().optional(),
  currency: z.string().default('USD'),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Portfolio = z.infer<typeof PortfolioSchema>;

export const CreatePortfolioSchema = PortfolioSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
});

export type CreatePortfolio = z.infer<typeof CreatePortfolioSchema>;

// Asset types
export const AssetTypeSchema = z.enum(['stock', 'etf', 'crypto', 'bond', 'commodity', 'cash']);
export type AssetType = z.infer<typeof AssetTypeSchema>;

// Asset models
export const AssetSchema = z.object({
  id: z.string().uuid(),
  symbol: z.string().min(1),
  name: z.string().min(1),
  type: AssetTypeSchema,
  exchange: z.string().optional(),
  currency: z.string().default('USD'),
  metadata: z.record(z.any()).optional(),
});

export type Asset = z.infer<typeof AssetSchema>;

// Transaction types
export const TransactionTypeSchema = z.enum(['buy', 'sell', 'dividend', 'fee']);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

// Transaction models
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  portfolioId: z.string().uuid(),
  assetId: z.string().uuid(),
  type: TransactionTypeSchema,
  quantity: z.number().positive(),
  price: z.number().nonnegative(),
  fee: z.number().nonnegative().default(0),
  currency: z.string().default('USD'),
  executedAt: z.date(),
  notes: z.string().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

export const CreateTransactionSchema = TransactionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateTransaction = z.infer<typeof CreateTransactionSchema>;

// Holding models (calculated from transactions)
export const HoldingSchema = z.object({
  portfolioId: z.string().uuid(),
  assetId: z.string().uuid(),
  quantity: z.number(),
  averageCost: z.number(),
  totalCost: z.number(),
  currentPrice: z.number().optional(),
  currentValue: z.number().optional(),
  unrealizedGainLoss: z.number().optional(),
  unrealizedGainLossPercent: z.number().optional(),
});

export type Holding = z.infer<typeof HoldingSchema>;

// Portfolio summary
export const PortfolioSummarySchema = z.object({
  portfolioId: z.string().uuid(),
  totalValue: z.number(),
  totalCost: z.number(),
  totalGainLoss: z.number(),
  totalGainLossPercent: z.number(),
  holdings: z.array(HoldingSchema),
  lastUpdated: z.date(),
});

export type PortfolioSummary = z.infer<typeof PortfolioSummarySchema>;

// API Response types
export const ApiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: z
      .object({
        code: z.string(),
        message: z.string(),
        details: z.any().optional(),
      })
      .optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
};

// Pagination
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type Pagination = z.infer<typeof PaginationSchema>;

export const PaginatedResponseSchema = <T extends z.ZodType>(itemSchema: T) =>
  z.object({
    items: z.array(itemSchema),
    pagination: PaginationSchema,
  });

export type PaginatedResponse<T> = {
  items: T[];
  pagination: Pagination;
};

// Allocation models
export const AllocationSchema = z.object({
  id: z.string().uuid(),
  portfolioId: z.string().uuid(),
  assetId: z.string().uuid(),
  targetPercentage: z.number().min(0).max(100),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Allocation = z.infer<typeof AllocationSchema>;

export const CreateAllocationSchema = AllocationSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateAllocation = z.infer<typeof CreateAllocationSchema>;

export const UpdateAllocationSchema = z.object({
  targetPercentage: z.number().min(0).max(100),
});

export type UpdateAllocation = z.infer<typeof UpdateAllocationSchema>;

// Portfolio allocation summary
export const PortfolioAllocationSummarySchema = z.object({
  portfolioId: z.string().uuid(),
  allocations: z.array(
    z.object({
      assetId: z.string().uuid(),
      asset: AssetSchema,
      targetPercentage: z.number(),
      currentPercentage: z.number(),
      deviation: z.number(),
      currentValue: z.number(),
      targetValue: z.number(),
      rebalanceAmount: z.number(),
    })
  ),
  totalTargetPercentage: z.number(),
  lastUpdated: z.date(),
});

export type PortfolioAllocationSummary = z.infer<typeof PortfolioAllocationSummarySchema>;
