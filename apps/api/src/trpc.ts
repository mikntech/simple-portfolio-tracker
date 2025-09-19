import { initTRPC } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';

// Context creation
export const createContext = ({ req, res }: CreateExpressContextOptions) => ({
  req,
  res,
});

type Context = Awaited<ReturnType<typeof createContext>>;

// tRPC initialization
const t = initTRPC.context<Context>().create();

// Export reusable router and procedure helpers
export const router = t.router;
export const publicProcedure = t.procedure;
